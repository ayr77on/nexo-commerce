<?php
namespace App\Actions;

use App\Models\{Customer, Order, Product, StockMovement, User};
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class Commerce
{
    public function createOrder(User $actor, int $customerId, array $lines, ?string $notes = null): Order
    {
        return DB::transaction(function () use ($actor, $customerId, $lines, $notes) {
            $customer = Customer::findOrFail($customerId);
            if ($customer->status !== 'active') {
                throw ValidationException::withMessages(['customerId' => 'Choose an active customer.']);
            }
            if (empty($lines) || count($lines) > 30) {
                throw ValidationException::withMessages(['lines' => 'Add between 1 and 30 products.']);
            }
            $items = [];
            foreach ($lines as $line) {
                $product = Product::findOrFail($line['product_id']);
                $quantity = filter_var($line['quantity'], FILTER_VALIDATE_INT);
                if (! $product->active || ! $quantity || $quantity < 1 || $quantity > 1000) {
                    throw ValidationException::withMessages(['lines' => 'Products must be active and quantities between 1 and 1,000.']);
                }
                if (isset($items[$product->id])) {
                    throw ValidationException::withMessages(['lines' => 'Each product can only appear once. Update its quantity instead.']);
                }
                $items[$product->id] = [
                    'product_id' => $product->id, 'product_name' => $product->name, 'sku' => $product->sku,
                    'quantity' => $quantity, 'unit_price_cents' => $product->price_cents,
                    'total_cents' => $product->price_cents * $quantity,
                ];
            }
            $total = array_sum(array_column($items, 'total_cents'));
            if ($total > 100000000) {
                throw ValidationException::withMessages(['lines' => 'Order total cannot exceed $1,000,000.']);
            }
            $order = Order::create([
                'number' => 'NX-'.now()->format('ymd').'-'.strtoupper(Str::random(5)),
                'customer_id' => $customer->id, 'user_id' => $actor->id,
                'total_cents' => $total, 'notes' => $notes,
            ]);
            $order->items()->createMany(array_values($items));
            return $order;
        });
    }

    public function confirmOrder(int $id, User $actor): Order
    {
        return DB::transaction(function () use ($id, $actor) {
            $order = Order::lockForUpdate()->findOrFail($id);
            if (in_array($order->status, ['confirmed', 'fulfilled'], true)) { return $order; }
            if ($order->status !== 'draft') {
                throw ValidationException::withMessages(['order' => 'Only draft orders can be confirmed.']);
            }
            foreach ($order->items()->orderBy('product_id')->get() as $item) {
                $product = Product::lockForUpdate()->findOrFail($item->product_id);
                if (! $product->active || $product->stock < $item->quantity) {
                    throw ValidationException::withMessages(['order' => "Insufficient stock for {$product->name}. Available: {$product->stock}."]);
                }
                $this->moveStock($product, -$item->quantity, 'Order confirmed', $actor, $order->id);
            }
            $order->update(['status' => 'confirmed', 'confirmed_at' => now()]);
            return $order;
        }, 3);
    }

    public function cancelOrder(int $id, User $actor): Order
    {
        return DB::transaction(function () use ($id, $actor) {
            $order = Order::lockForUpdate()->findOrFail($id);
            if ($order->status === 'cancelled') { return $order; }
            if ($order->payment_status === 'paid' || $order->status === 'fulfilled') {
                throw ValidationException::withMessages(['order' => 'Paid or fulfilled orders cannot be cancelled.']);
            }
            if ($order->status === 'confirmed') {
                foreach ($order->items()->orderBy('product_id')->get() as $item) {
                    $product = Product::lockForUpdate()->findOrFail($item->product_id);
                    $this->moveStock($product, $item->quantity, 'Order cancelled', $actor, $order->id);
                }
            }
            $order->update(['status' => 'cancelled']);
            return $order;
        }, 3);
    }

    public function recordPayment(int $id, User $actor): Order
    {
        return DB::transaction(function () use ($id, $actor) {
            $order = Order::lockForUpdate()->findOrFail($id);
            if ($order->payment_status === 'paid') { return $order; }
            if (! in_array($order->status, ['confirmed', 'fulfilled'], true)) {
                throw ValidationException::withMessages(['order' => 'Confirm the order before recording a payment.']);
            }
            $order->payment()->create(['user_id' => $actor->id, 'amount_cents' => $order->total_cents, 'method' => 'manual']);
            $order->update(['payment_status' => 'paid', 'paid_at' => now()]);
            return $order;
        }, 3);
    }

    public function fulfillOrder(int $id): void
    {
        DB::transaction(function () use ($id) {
            $order = Order::lockForUpdate()->findOrFail($id);
            if ($order->status === 'fulfilled') { return; }
            if ($order->status !== 'confirmed') {
                throw ValidationException::withMessages(['order' => 'Only confirmed orders can be fulfilled.']);
            }
            $order->update(['status' => 'fulfilled']);
        });
    }

    public function adjustStock(int $id, int $quantity, string $reason, User $actor): void
    {
        DB::transaction(function () use ($id, $quantity, $reason, $actor) {
            $product = Product::lockForUpdate()->findOrFail($id);
            if ($quantity === 0 || $product->stock + $quantity < 0 || $product->stock + $quantity > 1000000) {
                throw ValidationException::withMessages(['adjustment' => 'Enter a non-zero adjustment. Stock must stay between 0 and 1,000,000.']);
            }
            $this->moveStock($product, $quantity, $reason, $actor);
        }, 3);
    }

    private function moveStock(Product $product, int $quantity, string $reason, User $actor, ?int $orderId = null): void
    {
        $product->stock += $quantity;
        $product->save();
        StockMovement::create([
            'product_id' => $product->id, 'order_id' => $orderId, 'user_id' => $actor->id,
            'quantity' => $quantity, 'balance' => $product->stock, 'reason' => $reason,
        ]);
    }
}
