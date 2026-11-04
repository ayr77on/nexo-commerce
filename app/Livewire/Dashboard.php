<?php
namespace App\Livewire;

use App\Queries\Overview;
use Livewire\Component;
use Livewire\Attributes\Url;

class Dashboard extends Component
{
    #[Url] public int $period = 30;

    public function updatedPeriod(): void
    {
        if (! in_array($this->period, [7, 30, 90], true)) { $this->period = 30; }
    }

    public function render()
    {
        return view('livewire.dashboard', (new Overview)->data($this->period))->layout('components.layouts.app', ['title' => 'Overview']);
    }
}
