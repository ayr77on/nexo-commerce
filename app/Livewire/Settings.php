<?php
namespace App\Livewire;

use App\Models\{Setting, User};
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Livewire\Component;

class Settings extends Component
{
    public string $name = '';
    public string $email = '';
    public string $businessName = '';
    public string $businessEmail = '';
    public string $currentPassword = '';
    public string $password = '';
    public string $password_confirmation = '';

    public function mount(): void
    {
        $this->name = auth()->user()->name;
        $this->email = auth()->user()->email;
        $this->businessName = Setting::getValue('business_name', 'Nexo Studio');
        $this->businessEmail = Setting::getValue('business_email', 'hello@nexo.test');
    }

    public function saveProfile(): void
    {
        $validated = $this->validate(['name' => 'required|string|max:100', 'email' => ['required', 'email', 'max:160', Rule::unique('users')->ignore(auth()->id())]]);
        auth()->user()->update($validated);
        $this->dispatch('toast', message: 'Your profile has been updated.');
    }

    public function saveBusiness(): void
    {
        Gate::authorize('manage-settings');
        $this->validate(['businessName' => 'required|string|max:80', 'businessEmail' => 'required|email|max:160']);
        Setting::updateOrCreate(['key' => 'business_name'], ['value' => $this->businessName]);
        Setting::updateOrCreate(['key' => 'business_email'], ['value' => $this->businessEmail]);
        $this->dispatch('toast', message: 'Workspace settings saved.');
    }

    public function savePassword(): void
    {
        $this->validate(['currentPassword' => 'required|current_password', 'password' => ['required', 'confirmed', Password::min(10)->letters()->numbers()->symbols()]]);
        auth()->user()->update(['password' => $this->password]);
        $this->reset('currentPassword', 'password', 'password_confirmation');
        $this->dispatch('toast', message: 'Password updated.');
    }

    public function render()
    {
        return view('livewire.settings', ['members' => User::orderBy('name')->get()])->layout('components.layouts.app', ['title' => 'Settings']);
    }
}
