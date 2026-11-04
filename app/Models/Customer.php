<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
{
    protected $fillable = ['name', 'email', 'company', 'phone', 'city', 'country', 'address', 'status'];
    public function orders(): HasMany { return $this->hasMany(Order::class); }
    public function initials(): string
    {
        return collect(explode(' ', $this->name))->take(2)->map(fn ($part) => mb_substr($part, 0, 1))->implode('');
    }
}
