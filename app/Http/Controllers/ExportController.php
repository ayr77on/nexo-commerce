<?php
namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\Request;

class ExportController extends Controller
{
    public function __invoke(Request $request)
    {
        $filters = $request->validate(['period' => 'nullable|integer|in:7,30,90', 'status' => 'nullable|in:draft,confirmed,fulfilled,cancelled', 'payment' => 'nullable|in:paid,unpaid', 'search' => 'nullable|string|max:200']);
        return response()->streamDownload(function () use ($filters) {
            $file = fopen('php://output', 'w');
            fwrite($file, "\xEF\xBB\xBF");
            fputcsv($file, ['Order', 'Date (UTC)', 'Customer', 'Email', 'Status', 'Payment', 'Total (USD)'], ',', '"', '');
            $query = Order::with('customer')
                ->when($filters['period'] ?? null, fn ($q, $days) => $q->where('created_at', '>=', now()->subDays($days - 1)->startOfDay()))
                ->when($filters['status'] ?? null, fn ($q, $value) => $q->where('status', $value))
                ->when($filters['payment'] ?? null, fn ($q, $value) => $q->where('payment_status', $value))
                ->when($filters['search'] ?? null, fn ($q, $value) => $q->where(fn ($q) => $q->where('number', 'like', '%'.$value.'%')->orWhereHas('customer', fn ($q) => $q->where('name', 'like', '%'.$value.'%')->orWhere('email', 'like', '%'.$value.'%'))));
            $safe = fn ($value) => preg_match('/^[=+\-@\t\r]/u', (string) $value) ? "'".$value : $value;
            foreach ($query->orderBy('id')->lazyById(200) as $order) {
                fputcsv($file, array_map($safe, [$order->number, $order->created_at->toDateTimeString(), $order->customer->name, $order->customer->email, $order->status, $order->payment_status, number_format($order->total_cents / 100, 2, '.', '')]), ',', '"', '');
            }
            fclose($file);
        }, 'nexo-orders-'.now()->format('Y-m-d').'.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}
