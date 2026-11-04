@props(['paginator'])
<div class="table-pagination">
    <span>Showing <strong>{{ $paginator->firstItem() ?? 0 }}–{{ $paginator->lastItem() ?? 0 }}</strong> of <strong>{{ $paginator->total() }}</strong> results</span>
    @if($paginator->hasPages())
    <nav class="pagination-buttons" aria-label="Pagination">
        <button wire:click="previousPage" @disabled($paginator->onFirstPage()) class="icon-button" aria-label="Previous page"><x-icon name="chevron-left" /></button>
        @foreach(range(max(1, $paginator->currentPage() - 1), min($paginator->lastPage(), $paginator->currentPage() + 1)) as $page)
            <button wire:click="gotoPage({{ $page }})" class="page-button {{ $page === $paginator->currentPage() ? 'active' : '' }}" @if($page === $paginator->currentPage()) aria-current="page" @endif>{{ $page }}</button>
        @endforeach
        <button wire:click="nextPage" @disabled(!$paginator->hasMorePages()) class="icon-button" aria-label="Next page"><x-icon name="chevron-right" /></button>
    </nav>
    @endif
</div>
