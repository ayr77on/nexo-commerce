<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="Nexo Commerce — your sales, customers and inventory, beautifully connected.">
    <meta name="theme-color" content="#7545e8"><title>{{ $title ?? 'Workspace' }} · Nexo Commerce</title>
    <link rel="icon" href="{{ asset('favicon.svg') }}" type="image/svg+xml">
    <script>try{document.documentElement.dataset.theme=localStorage.getItem('nexo-theme')||'light'}catch(e){document.documentElement.dataset.theme='light'}</script>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    @livewireStyles
</head>
<body x-data x-on:keydown.ctrl.k.window.prevent="$store.ui.command = !$store.ui.command" x-on:keydown.meta.k.window.prevent="$store.ui.command = !$store.ui.command">
    <a href="#main-content" class="skip-link">Skip to content</a>
    <div class="mobile-backdrop" x-show="$store.ui.sidebar" x-cloak x-on:click="$store.ui.sidebar = false"></div>
    <aside class="sidebar" :class="{ 'sidebar-open': $store.ui.sidebar }" aria-label="Main navigation">
        <div class="sidebar-brand"><x-brand /><button class="icon-button mobile-only" x-on:click="$store.ui.sidebar = false" aria-label="Close navigation"><x-icon name="x" /></button></div>
        <a href="{{ route('settings') }}" class="workspace-switch"><span class="workspace-avatar">N<span></span></span><span><strong>{{ $workspaceName }}</strong><small>Commerce workspace</small></span><x-icon name="chevron-down" /></a>
        <div class="nav-section-label">WORKSPACE</div>
        <nav class="nav-links">
            @foreach([['dashboard','grid','Overview'],['orders','bag','Orders'],['customers','users','Customers'],['products','box','Products']] as [$route, $icon, $label])
            <a href="{{ route($route) }}" class="nav-link {{ request()->routeIs($route) ? 'active' : '' }}" @if(request()->routeIs($route)) aria-current="page" @endif><x-icon :name="$icon" /><span>{{ $label }}</span>@if($route === 'orders')<span class="nav-count">{{ \App\Models\Order::where('status', 'confirmed')->count() }}</span>@endif</a>
            @endforeach
        </nav>
        <div class="nav-section-label nav-section-second">PREFERENCES</div>
        <nav class="nav-links"><a href="{{ route('settings') }}" class="nav-link {{ request()->routeIs('settings') ? 'active' : '' }}" @if(request()->routeIs('settings')) aria-current="page" @endif><x-icon name="settings" /><span>Settings</span></a></nav>
        <div class="sidebar-bottom">
            <div class="workspace-note"><span class="note-icon"><x-icon name="sparkles" /></span><strong>A little more clarity.</strong><p>Everything your business needs, in one calm workspace.</p><a href="{{ route('dashboard') }}">Explore your overview <x-icon name="arrow-up-right" /></a></div>
            <div class="sidebar-status"><span class="live-dot"></span> Workspace connected <span>v1.0</span></div>
            <div class="profile-area" x-data="{ open: false }" x-on:click.outside="open = false">
                <button class="profile-button" x-on:click="open = !open" :aria-expanded="open"><span class="avatar avatar-profile">{{ auth()->user()->initials() }}</span><span><strong>{{ auth()->user()->name }}</strong><small>{{ ucfirst(auth()->user()->role) }}</small></span><x-icon name="chevron-down" /></button>
                <div class="profile-menu dropdown" x-show="open" x-cloak x-transition><a href="{{ route('settings') }}"><x-icon name="settings" /> Account settings</a><form method="POST" action="{{ route('logout') }}">@csrf<button type="submit"><x-icon name="logout" /> Sign out</button></form></div>
            </div>
        </div>
    </aside>
    <div class="app-shell">
        <header class="topbar">
            <div class="breadcrumbs"><button class="icon-button mobile-only" x-on:click="$store.ui.sidebar = true" aria-label="Open navigation"><x-icon name="menu" /></button><span class="breadcrumb-workspace">Workspace</span><span class="breadcrumb-slash">/</span><strong>{{ $title ?? 'Overview' }}</strong></div>
            <div class="topbar-actions">
                <button class="command-trigger" x-on:click="$store.ui.command = true" aria-label="Search workspace pages"><x-icon name="search" /><span>Quick navigation...</span><kbd>⌘ K</kbd></button>
                <span class="topbar-divider"></span>
                <button class="icon-button theme-toggle" x-on:click="$store.ui.toggleTheme()" :aria-label="$store.ui.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"><span x-show="$store.ui.theme === 'light'"><x-icon name="sun" /></span><span x-show="$store.ui.theme === 'dark'" x-cloak><x-icon name="moon" /></span></button>
                <div class="notifications" x-data="{ open: false }" x-on:click.outside="open = false">
                    <button class="icon-button notification-trigger" x-on:click="open = !open" aria-label="View workspace alerts" :aria-expanded="open"><x-icon name="bell" />@if(\App\Models\Product::where('active', true)->whereColumn('stock','<=','low_stock_threshold')->exists())<span></span>@endif</button>
                    <div class="dropdown notification-menu" x-show="open" x-cloak x-transition><strong>Workspace alerts</strong><a href="{{ route('products', ['stockFilter' => 'low']) }}"><span class="notification-icon"><x-icon name="box" /></span><span>Review low-stock products<small>Keep your bestsellers available</small></span><x-icon name="chevron-right" /></a><a href="{{ route('orders', ['status' => 'confirmed']) }}"><span class="notification-icon violet"><x-icon name="bag" /></span><span>Orders ready to process<small>Your next customer delivery</small></span><x-icon name="chevron-right" /></a></div>
                </div>
                <a href="{{ route('settings') }}" class="avatar avatar-small" aria-label="Your profile">{{ auth()->user()->initials() }}</a>
            </div>
        </header>
        <main id="main-content" class="main-content">{{ $slot }}</main>
        <footer class="app-footer"><span>© {{ now()->year }} Nexo Commerce</span><span><span class="live-dot"></span> A clearer view of your business.</span><span>Made with intention <span class="footer-spark">✦</span></span></footer>
    </div>
    <div class="command-overlay modal-overlay" x-show="$store.ui.command" x-cloak x-on:keydown.escape.window="$store.ui.command = false" x-transition.opacity>
        <div class="modal-backdrop" x-on:click="$store.ui.command = false"></div>
        <section class="command-dialog" role="dialog" aria-modal="true" aria-label="Quick navigation" x-trap.inert.noscroll="$store.ui.command"><div class="command-input"><x-icon name="search" /><input x-model="$store.ui.query" placeholder="Where would you like to go?" aria-label="Find a page"><button class="icon-button" x-on:click="$store.ui.command = false" aria-label="Close quick navigation"><x-icon name="x" /></button></div><div class="command-results">
        @foreach([['dashboard','grid','Overview','Revenue, trends and business performance'],['orders','bag','Orders','Create orders and manage payments'],['customers','users','Customers','Your customer relationships'],['products','box','Products','Catalog and inventory'],['settings','settings','Settings','Account and workspace preferences']] as [$route,$icon,$label,$description])
            <a href="{{ route($route) }}" x-show="'{{ strtolower($label.' '.$description) }}'.includes($store.ui.query.toLowerCase())"><x-icon :name="$icon" /><span><strong>{{ $label }}</strong><small>{{ $description }}</small></span><x-icon name="arrow-right" /></a>
        @endforeach
        </div></section>
    </div>
    <div class="toast" x-data="{ visible: false, message: '', timer: null }" x-on:toast.window="message = $event.detail.message; visible = true; clearTimeout(timer); timer = setTimeout(() => visible = false, 4500)" x-show="visible" x-cloak x-transition role="status"><span><x-icon name="check" /></span><p x-text="message"></p><button x-on:click="visible = false" class="icon-button" aria-label="Dismiss notification"><x-icon name="x" /></button></div>
    @livewireScriptConfig
</body>
</html>
