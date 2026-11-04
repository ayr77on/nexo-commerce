<?php
namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\View;
use App\Models\User;
use App\Models\Setting;

class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Gate::define('manage-sales', fn (User $user) => in_array($user->role, ['admin', 'operator'], true));
        Gate::define('manage-catalog', fn (User $user) => $user->role === 'admin');
        Gate::define('manage-settings', fn (User $user) => $user->role === 'admin');
        View::composer('components.layouts.app', function ($view) {
            $view->with('workspaceName', Setting::getValue('business_name', 'Nexo Studio'));
        });
    }
}