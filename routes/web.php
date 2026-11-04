<?php
use App\Http\Controllers\{AuthController, ExportController};
use App\Livewire\{Customers, Dashboard, Orders, Products, Settings};
use Illuminate\Support\Facades\Route;

Route::middleware('guest')->group(function () {
    Route::view('/login', 'auth.login')->name('login');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
    Route::post('/demo', [AuthController::class, 'demo'])->middleware('throttle:10,1')->name('demo');
});
Route::middleware('auth')->group(function () {
    Route::get('/', Dashboard::class)->name('dashboard');
    Route::get('/orders', Orders::class)->name('orders');
    Route::get('/customers', Customers::class)->name('customers');
    Route::get('/products', Products::class)->name('products');
    Route::get('/settings', Settings::class)->name('settings');
    Route::get('/exports/orders', ExportController::class)->middleware('throttle:20,1')->name('exports.orders');
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
});