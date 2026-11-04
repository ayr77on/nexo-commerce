<?php
namespace App\Livewire;

use App\Actions\Commerce;
use App\Models\Product;
use Illuminate\Support\Facades\{DB, Gate};
use Illuminate\Validation\Rule;
use Livewire\{Component, WithPagination};
use Livewire\Attributes\{Locked, Url};

class Products extends Component
{
    use WithPagination;
    #[Url] public string $search = '';
    #[Url] public string $category = '';
    #[Url] public string $stockFilter = '';
    #[Url] public string $sort = 'newest';
    #[Locked] public ?int $editingId = null;
    #[Locked] public ?int $adjustingId = null;
    public bool $showForm = false;
    public array $form = ['name' => '', 'sku' => '', 'category' => 'Accessories', 'description' => '', 'price' => '', 'low_stock_threshold' => 10, 'active' => true];
    public int $initialStock = 0;
    public string $adjustment = '';
    public string $adjustmentReason = '';

    public function updated($property): void
    {
        if (in_array($property, ['search', 'category', 'stockFilter', 'sort'])) { $this->resetPage(); }
    }

    public function create(): void
    {
        Gate::authorize('manage-catalog');
        $this->reset('form', 'editingId', 'initialStock');
        $this->resetValidation();
        $this->showForm = true;
    }

    public function edit(int $id): void
    {
        Gate::authorize('manage-catalog');
        $product = Product::findOrFail($id);
        $this->editingId = $id;
        $this->form = $product->only(['name', 'sku', 'category', 'description', 'low_stock_threshold', 'active']);
        $this->form['description'] ??= '';
        $this->form['price'] = number_format($product->price_cents / 100, 2, '.', '');
        $this->resetValidation();
        $this->showForm = true;
    }

    public function save(): void
    {
        Gate::authorize('manage-catalog');
        $this->validate([
            'form.name' => 'required|string|max:120',
            'form.sku' => ['required', 'string', 'max:40', Rule::unique('products', 'sku')->ignore($this->editingId)],
            'form.category' => 'required|string|max:60', 'form.description' => 'nullable|string|max:1000',
            'form.price' => 'required|numeric|min:0.01|max:10000|decimal:0,2',
            'form.low_stock_threshold' => 'required|integer|min:0|max:100000', 'form.active' => 'boolean',
            'initialStock' => 'required|integer|min:0|max:1000000',
        ]);
        DB::transaction(function () {
            $data = collect($this->form)->except('price')->all();
            $data['price_cents'] = (int) round((float) $this->form['price'] * 100);
            $product = Product::updateOrCreate(['id' => $this->editingId], $data);
            if (! $this->editingId && $this->initialStock > 0) {
                app(Commerce::class)->adjustStock($product->id, $this->initialStock, 'Opening inventory', auth()->user());
            }
        });
        $this->showForm = false;
        $this->dispatch('toast', message: 'Product saved successfully.');
    }

    public function adjust(int $id): void
    {
        Gate::authorize('manage-catalog');
        Product::findOrFail($id);
        $this->adjustingId = $id;
        $this->reset('adjustment', 'adjustmentReason');
        $this->resetValidation();
    }

    public function saveAdjustment(): void
    {
        Gate::authorize('manage-catalog');
        $this->validate(['adjustment' => 'required|integer|between:-1000000,1000000|not_in:0', 'adjustmentReason' => 'required|string|min:3|max:160']);
        app(Commerce::class)->adjustStock($this->adjustingId, (int) $this->adjustment, $this->adjustmentReason, auth()->user());
        $this->adjustingId = null;
        $this->dispatch('toast', message: 'Inventory updated. Adjustment recorded.');
    }

    public function archive(int $id): void
    {
        Gate::authorize('manage-catalog');
        Product::findOrFail($id)->update(['active' => false]);
        $this->dispatch('toast', message: 'Product archived. Sales history is preserved.');
    }

    public function closeAdjustment(): void { $this->adjustingId = null; }

    public function render()
    {
        $query = Product::query()->when($this->search, fn ($q) => $q->where(fn ($q) => $q->where('name', 'like', '%'.$this->search.'%')->orWhere('sku', 'like', '%'.$this->search.'%')))
            ->when($this->category, fn ($q) => $q->where('category', $this->category));
        match ($this->stockFilter) {
            'low' => $query->where('active', true)->whereColumn('stock', '<=', 'low_stock_threshold'),
            'available' => $query->where('active', true)->where('stock', '>', 0),
            'archived' => $query->where('active', false),
            default => $query->where('active', true),
        };
        match ($this->sort) {
            'name' => $query->orderBy('name'), 'price' => $query->orderByDesc('price_cents'), 'stock' => $query->orderBy('stock'), default => $query->latest('id'),
        };
        return view('livewire.products', [
            'products' => $query->paginate(8), 'categories' => Product::distinct()->orderBy('category')->pluck('category'),
            'totalProducts' => Product::where('active', true)->count(),
            'lowCount' => Product::where('active', true)->whereColumn('stock', '<=', 'low_stock_threshold')->count(),
            'inventoryValue' => Product::where('active', true)->selectRaw('SUM(stock * price_cents) as value')->value('value'),
            'adjustingProduct' => $this->adjustingId ? Product::with(['movements' => fn ($q) => $q->latest()->limit(5)])->findOrFail($this->adjustingId) : null,
        ])->layout('components.layouts.app', ['title' => 'Products']);
    }
}
