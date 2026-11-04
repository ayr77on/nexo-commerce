@props(['model', 'title', 'wide' => false])
<div x-data="{ open: $wire.entangle('{{ $model }}') }" x-show="open" x-cloak x-on:keydown.escape.window="if (open) open = false" class="modal-overlay" x-transition.opacity>
    <div class="modal-backdrop" x-on:click="open = false"></div>
    <section x-show="open" x-trap.inert.noscroll="open" role="dialog" aria-modal="true" aria-label="{{ $title }}" class="modal {{ $wide ? 'modal-wide' : '' }}" x-transition>
        <div class="modal-header"><div><span class="eyebrow">YOUR WORKSPACE</span><h2>{{ $title }}</h2></div><button type="button" class="icon-button" x-on:click="open = false" aria-label="Close dialog"><x-icon name="x" /></button></div>
        {{ $slot }}
    </section>
</div>
