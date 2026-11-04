<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    public $timestamps = false;
    public $incrementing = false;
    protected $primaryKey = 'key';
    protected $keyType = 'string';
    protected $fillable = ['key', 'value'];
    public static function getValue(string $key, string $default = ''): string
    {
        return static::find($key)?->value ?? $default;
    }
}
