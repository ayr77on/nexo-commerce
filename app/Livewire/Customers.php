<?php
namespace App\Livewire;

use App\Models\Customer;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Livewire\{Component, WithPagination};
use Livewire\Attributes\{Locked, Url};

class Customers extends Component
{
    use WithPagination;
    #[Url] public string $search = '';
    #[Url] public string $status = '';
    #[Url] public string $sort = 'newest';
    #[Locked] public ?int $editingId = null;
    #[Locked] public ?int $viewingId = null;
    public bool $showForm = false;
    public array $form = ['name' => '', 'email' => '', 'company' => '', 'phone' => '', 'city' => '', 'country' => 'United States', 'address' => '', 'status' => 'active'];

    public function updated($property): void
    {
        if (in_array($property, ['search', 'status', 'sort'])) { $this->resetPage(); }
    }

    public function create(): void
    {
        Gate::authorize('manage-sales');
        $this->reset('form', 'editingId');
        $this->resetValidation();
        $this->showForm = true;
    }

    public function edit(int $id): void
    {
        Gate::authorize('manage-sales');
        $customer = Customer::findOrFail($id);
        $this->editingId = $id;
        $this->form = collect($customer->only(array_keys($this->form)))->map(fn ($value) => $value ?? '')->all();
        $this->viewingId = null;
        $this->resetValidation();
        $this->showForm = true;
    }

    public function save(): void
    {
        Gate::authorize('manage-sales');
        $this->validate([
            'form.name' => 'required|string|max:100',
            'form.email' => ['required', 'email', 'max:160', Rule::unique('customers', 'email')->ignore($this->editingId)],
            'form.company' => 'nullable|string|max:120', 'form.phone' => 'nullable|string|max:40',
            'form.city' => 'nullable|string|max:100', 'form.country' => 'required|string|max:100',
            'form.address' => 'nullable|string|max:500', 'form.status' => ['required', Rule::in(['active', 'inactive'])],
        ]);
        Customer::updateOrCreate(['id' => $this->editingId], $this->form);
        $this->showForm = false;
        $this->dispatch('toast', message: $this->editingId ? 'Customer updated.' : 'Customer added to your workspace.');
    }

    public function delete(int $id): void
    {
        Gate::authorize('manage-sales');
        $customer = Customer::findOrFail($id);
        if ($customer->orders()->exists()) {
            $customer->update(['status' => 'inactive']);
            $this->dispatch('toast', message: 'Customer archived. Order history is preserved.');
        } else {
            $customer->delete();
            $this->dispatch('toast', message: 'Customer deleted.');
        }
        $this->viewingId = null;
        $this->resetPage();
    }

    public function viewCustomer(int $id): void { Customer::findOrFail($id); $this->viewingId = $id; }
    public function closeDetail(): void { $this->viewingId = null; }

    public function render()
    {
        $query = Customer::query()->withCount('orders')->withSum(['orders as lifetime_value' => fn ($q) => $q->where('payment_status', 'paid')], 'total_cents')
            ->when($this->search, fn ($q) => $q->where(fn ($q) => $q->where('name', 'like', '%'.$this->search.'%')->orWhere('email', 'like', '%'.$this->search.'%')->orWhere('company', 'like', '%'.$this->search.'%')))
            ->when(in_array($this->status, ['active', 'inactive']), fn ($q) => $q->where('status', $this->status));
        match ($this->sort) {
            'name' => $query->orderBy('name'), 'value' => $query->orderByDesc('lifetime_value'), default => $query->latest(),
        };
        return view('livewire.customers', [
            'customers' => $query->paginate(8), 'totalCustomers' => Customer::count(),
            'activeCustomers' => Customer::where('status', 'active')->count(),
            'newCustomers' => Customer::where('created_at', '>=', now()->subDays(30))->count(),
            'selectedCustomer' => $this->viewingId ? Customer::with(['orders' => fn ($q) => $q->latest()])->findOrFail($this->viewingId) : null,
        ])->layout('components.layouts.app', ['title' => 'Customers']);
    }
}
