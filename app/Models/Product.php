<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    protected $fillable = ['name', 'sku', 'category', 'description', 'price_cents', 'low_stock_threshold', 'active', 'artwork'];
    protected $casts = ['active' => 'boolean', 'price_cents' => 'integer', 'stock' => 'integer'];
    public function items(): HasMany { return $this->hasMany(OrderItem::class); }
    public function movements(): HasMany { return $this->hasMany(StockMovement::class); }
    public function getStockLabelAttribute(): string
    {
        return $this->stock === 0 ? 'Out of stock' : ($this->stock <= $this->low_stock_threshold ? 'Low stock' : 'In stock');
    }
}
