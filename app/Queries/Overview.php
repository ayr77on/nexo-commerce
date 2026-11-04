<?php
namespace App\Queries;

use App\Models\{Customer, Order, OrderItem, Product};
use Carbon\CarbonImmutable;

class Overview
{
    public function data(int $days = 30): array
    {
        $days = in_array($days, [7, 30, 90], true) ? $days : 30;
        $end = CarbonImmutable::now()->endOfDay();
        $start = $end->subDays($days - 1)->startOfDay();
        $previousStart = $start->subDays($days);
        $paid = fn ($from, $to) => Order::where('payment_status', 'paid')->whereBetween('paid_at', [$from, $to]);
        $revenue = (int) $paid($start, $end)->sum('total_cents');
        $previousRevenue = (int) $paid($previousStart, $start->subSecond())->sum('total_cents');
        $count = Order::where('status', '!=', 'cancelled')->whereBetween('created_at', [$start, $end])->count();
        $previousCount = Order::where('status', '!=', 'cancelled')->whereBetween('created_at', [$previousStart, $start->subSecond()])->count();
        $newCustomers = Customer::whereBetween('created_at', [$start, $end])->count();
        $previousCustomers = Customer::whereBetween('created_at', [$previousStart, $start->subSecond()])->count();
        $paidCount = $paid($start, $end)->count();
        $previousPaidCount = $paid($previousStart, $start->subSecond())->count();
        $aov = $paidCount ? (int) round($revenue / $paidCount) : 0;
        $previousAov = $previousPaidCount ? (int) round($previousRevenue / $previousPaidCount) : 0;
        $growth = fn ($current, $previous) => $previous > 0 ? round(($current - $previous) / $previous * 100, 1) : null;
        $daily = $paid($start, $end)->selectRaw('DATE(paid_at) as day, SUM(total_cents) as total')->groupBy('day')->pluck('total', 'day');
        $previousDaily = $paid($previousStart, $start->subSecond())->selectRaw('DATE(paid_at) as day, SUM(total_cents) as total')->groupBy('day')->pluck('total', 'day');
        $chart = ['labels' => [], 'current' => [], 'previous' => []];
        for ($i = 0; $i < $days; $i++) {
            $chart['labels'][] = $start->addDays($i)->format('M j');
            $chart['current'][] = (int) ($daily[$start->addDays($i)->toDateString()] ?? 0) / 100;
            $chart['previous'][] = (int) ($previousDaily[$previousStart->addDays($i)->toDateString()] ?? 0) / 100;
        }
        $categories = OrderItem::join('orders', 'orders.id', '=', 'order_items.order_id')
            ->join('products', 'products.id', '=', 'order_items.product_id')
            ->where('orders.payment_status', 'paid')->whereBetween('orders.paid_at', [$start, $end])
            ->selectRaw('products.category, SUM(order_items.total_cents) as revenue')
            ->groupBy('products.category')->orderByDesc('revenue')->get();
        $topProducts = Product::query()->withSum(['items as sold_quantity' => fn ($q) => $q->whereHas('order', fn ($o) => $o->where('payment_status', 'paid')->whereBetween('paid_at', [$start, $end]))], 'quantity')
            ->orderByDesc('sold_quantity')->limit(4)->get();

        return compact('revenue', 'count', 'newCustomers', 'aov', 'chart', 'categories', 'topProducts', 'start', 'end') + [
            'growth' => [$growth($revenue, $previousRevenue), $growth($count, $previousCount), $growth($newCustomers, $previousCustomers), $growth($aov, $previousAov)],
            'recentOrders' => Order::with('customer')->latest()->limit(5)->get(),
            'lowStock' => Product::where('active', true)->whereColumn('stock', '<=', 'low_stock_threshold')->orderBy('stock')->limit(3)->get(),
            'pendingCount' => Order::where('status', 'confirmed')->count(),
        ];
    }
}
