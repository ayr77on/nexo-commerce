@props(['status'])
@php
$label = match($status) { 'confirmed' => 'Processing', 'unpaid' => 'Unpaid', default => ucfirst($status) };
@endphp
<span class="badge badge-{{ str_replace(' ', '-', strtolower($status)) }}"><span class="badge-dot"></span>{{ $label }}</span>
