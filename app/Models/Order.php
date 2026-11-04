<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Order extends Model
{
    protected $fillable = ['number', 'customer_id', 'user_id', 'status', 'payment_status', 'total_cents', 'notes', 'confirmed_at', 'paid_at'];
    protected $casts = ['confirmed_at' => 'datetime', 'paid_at' => 'datetime', 'total_cents' => 'integer'];
    public function customer(): BelongsTo { return $this->belongsTo(Customer::class); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function items(): HasMany { return $this->hasMany(OrderItem::class); }
    public function payment(): HasOne { return $this->hasOne(Payment::class); }
}
