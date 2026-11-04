<?php
// Read-only consistency checks for the current workspace.
require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\{Customer, Order, Payment, Product, StockMovement};

$issues = [];
foreach (Product::withSum('movements', 'quantity')->get() as $product) {
    if ((int) $product->movements_sum_quantity !== $product->stock) { $issues[] = "Stock ledger mismatch: {$product->sku}"; }
}
foreach (Order::with(['items', 'payment'])->get() as $order) {
    if ($order->items->sum('total_cents') !== $order->total_cents) { $issues[] = "Order total mismatch: {$order->number}"; }
    foreach ($order->items as $item) {
        if ($item->quantity * $item->unit_price_cents !== $item->total_cents) { $issues[] = "Line total mismatch: {$order->number}"; }
    }
    if ($order->payment_status === 'paid' && (! $order->payment || $order->payment->amount_cents !== $order->total_cents)) {
        $issues[] = "Payment mismatch: {$order->number}";
    }
}
echo json_encode([
    'database_version' => Illuminate\Support\Facades\DB::selectOne('SELECT VERSION() as version')->version,
    'customers' => Customer::count(), 'products' => Product::count(), 'orders' => Order::count(),
    'payments' => Payment::count(), 'stock_movements' => StockMovement::count(), 'issues' => $issues,
], JSON_PRETTY_PRINT).PHP_EOL;
exit($issues ? 1 : 0);
