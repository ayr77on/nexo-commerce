<?php
namespace App\Livewire;

use App\Actions\Commerce;
use App\Models\{Customer, Order, Product};
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Livewire\{Component, WithPagination};
use Livewire\Attributes\{Locked, Url};

class Orders extends Component
{
    use WithPagination;
    #[Url] public string $search = '';
    #[Url] public string $status = '';
    #[Url] public string $payment = '';
    #[Url] public string $sort = 'newest';
    #[Url(as: 'order')] public ?int $selectedId = null;
    public bool $showForm = false;
    public string $customerId = '';
    public array $lines = [['product_id' => '', 'quantity' => 1]];
    public string $notes = '';

    public function updated($property): void
    {
        if (in_array($property, ['search', 'status', 'payment', 'sort'])) { $this->resetPage(); }
    }

    public function create(): void
    {
        Gate::authorize('manage-sales');
        $this->reset('customerId', 'lines', 'notes');
        $this->resetValidation();
        $this->showForm = true;
    }
    public function addLine(): void { if (count($this->lines) < 30) { $this->lines[] = ['product_id' => '', 'quantity' => 1]; } }
    public function removeLine(int $index): void
    {
        if (count($this->lines) > 1) { unset($this->lines[$index]); $this->lines = array_values($this->lines); }
    }

    public function save(): void
    {
        Gate::authorize('manage-sales');
        $this->validate([
            'customerId' => ['required', 'integer', Rule::exists('customers', 'id')->where('status', 'active')],
            'lines' => 'required|array|min:1|max:30',
            'lines.*.product_id' => ['required', 'integer', 'distinct', Rule::exists('products', 'id')->where('active', true)],
            'lines.*.quantity' => 'required|integer|min:1|max:1000', 'notes' => 'nullable|string|max:1000',
        ]);
        $order = app(Commerce::class)->createOrder(auth()->user(), (int) $this->customerId, $this->lines, $this->notes);
        $this->selectedId = $order->id;
        $this->showForm = false;
        $this->dispatch('toast', message: 'Draft created. Confirm it when you are ready.');
    }

    public function viewOrder(int $id): void
    {
        Order::findOrFail($id);
        $this->selectedId = $id;
        $this->resetValidation();
    }

    public function actOnOrder(string $action): void
    {
        Gate::authorize('manage-sales');
        abort_unless($this->selectedId, 404);
        $commerce = app(Commerce::class);
        match ($action) {
            'confirm' => $commerce->confirmOrder($this->selectedId, auth()->user()),
            'pay' => $commerce->recordPayment($this->selectedId, auth()->user()),
            'fulfill' => $commerce->fulfillOrder($this->selectedId),
            'cancel' => $commerce->cancelOrder($this->selectedId, auth()->user()),
            default => abort(422),
        };
        $this->resetValidation();
        $this->dispatch('toast', message: match ($action) {
            'confirm' => 'Order confirmed. Inventory updated.', 'pay' => 'Payment recorded successfully.',
            'fulfill' => 'Order marked as fulfilled.', default => 'Order cancelled. Reserved stock returned.',
        });
    }

    public function render()
    {
        $query = Order::with('customer')->withCount('items')
            ->when($this->search, fn ($q) => $q->where(fn ($q) => $q->where('number', 'like', '%'.$this->search.'%')->orWhereHas('customer', fn ($c) => $c->where('name', 'like', '%'.$this->search.'%')->orWhere('email', 'like', '%'.$this->search.'%'))))
            ->when(in_array($this->status, ['draft', 'confirmed', 'fulfilled', 'cancelled']), fn ($q) => $q->where('status', $this->status))
            ->when(in_array($this->payment, ['paid', 'unpaid']), fn ($q) => $q->where('payment_status', $this->payment));
        match ($this->sort) { 'oldest' => $query->oldest(), 'value' => $query->orderByDesc('total_cents'), default => $query->latest() };
        $products = Product::where('active', true)->orderBy('name')->get();
        $draftTotal = collect($this->lines)->sum(fn ($line) => ($products->firstWhere('id', (int) ($line['product_id'] ?? 0))?->price_cents ?? 0) * (is_numeric($line['quantity'] ?? null) ? max(0, min(1000, (float) $line['quantity'])) : 0));
        return view('livewire.orders', [
            'orders' => $query->paginate(8), 'products' => $products,
            'customers' => Customer::where('status', 'active')->orderBy('name')->get(),
            'selectedOrder' => $this->selectedId ? Order::with(['customer', 'items', 'payment', 'user'])->findOrFail($this->selectedId) : null,
            'draftTotal' => $draftTotal, 'totalOrders' => Order::count(),
            'pendingOrders' => Order::where('status', 'confirmed')->count(),
            'unpaidTotal' => Order::where('payment_status', 'unpaid')->whereIn('status', ['confirmed', 'fulfilled'])->sum('total_cents'),
        ])->layout('components.layouts.app', ['title' => 'Orders']);
    }
}
