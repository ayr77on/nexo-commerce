<?php
namespace Tests\Feature;

use App\Actions\Commerce;
use App\Livewire\{Customers, Orders, Products, Settings};
use App\Models\{Customer, Order, Payment, Product, Setting, StockMovement, User};
use App\Queries\Overview;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Livewire\Livewire;
use Tests\TestCase;

class CommerceTest extends TestCase
{
    use RefreshDatabase;
    private User $admin;
    private Customer $customer;
    private Product $product;
    private Commerce $commerce;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin', 'password' => 'NexoDemo!2026']);
        $this->customer = Customer::create(['name' => 'Olivia Rhye', 'email' => 'olivia@example.test', 'country' => 'United States']);
        $this->product = Product::create(['name' => 'Studio Headphones', 'sku' => 'NX-001', 'category' => 'Electronics', 'price_cents' => 14900]);
        $this->commerce = app(Commerce::class);
        $this->commerce->adjustStock($this->product->id, 20, 'Opening stock', $this->admin);
    }

    private function draft(int $quantity = 2): Order
    {
        return $this->commerce->createOrder($this->admin, $this->customer->id, [['product_id' => $this->product->id, 'quantity' => $quantity]]);
    }

    public function test_guest_cannot_access_workspace_or_exports(): void
    {
        foreach (['/', '/orders', '/customers', '/products', '/settings', '/exports/orders'] as $path) {
            $this->get($path)->assertRedirect('/login');
        }
    }

    public function test_login_validates_credentials_and_authenticates(): void
    {
        $this->post('/login', ['email' => $this->admin->email, 'password' => 'incorrect'])->assertSessionHasErrors('email');
        $this->assertGuest();
        $this->post('/login', ['email' => $this->admin->email, 'password' => 'NexoDemo!2026'])->assertRedirect('/');
        $this->assertAuthenticatedAs($this->admin);
        $this->post('/logout')->assertRedirect('/login');
        $this->assertGuest();
    }

    public function test_all_main_screens_render_with_real_records(): void
    {
        $this->draft();
        $this->actingAs($this->admin);
        foreach (['/', '/orders', '/customers', '/products', '/settings'] as $path) { $this->get($path)->assertOk()->assertSee('Nexo'); }
        $this->get('/orders?order='.Order::first()->id)->assertOk()->assertSee('Studio Headphones');
    }

    public function test_order_lifecycle_is_idempotent_and_keeps_price_snapshots(): void
    {
        $order = $this->draft();
        $this->assertSame(20, $this->product->fresh()->stock);
        $this->product->update(['price_cents' => 19900]);
        $this->commerce->confirmOrder($order->id, $this->admin);
        $this->commerce->confirmOrder($order->id, $this->admin);
        $this->assertSame(18, $this->product->fresh()->stock);
        $this->assertSame(29800, $order->fresh()->total_cents);
        $this->assertEquals(14900, $order->items()->first()->unit_price_cents);
        $this->commerce->recordPayment($order->id, $this->admin);
        $this->commerce->recordPayment($order->id, $this->admin);
        $this->assertSame(1, Payment::count());
        $this->assertEquals(29800, Payment::first()->amount_cents);
        $this->commerce->fulfillOrder($order->id);
        $this->assertSame('fulfilled', $order->fresh()->status);
        $this->assertSame(18, $this->product->fresh()->stock);
    }

    public function test_cancelling_returns_stock_exactly_once(): void
    {
        $order = $this->draft(3);
        $this->commerce->confirmOrder($order->id, $this->admin);
        $this->commerce->cancelOrder($order->id, $this->admin);
        $this->commerce->cancelOrder($order->id, $this->admin);
        $this->assertSame(20, $this->product->fresh()->stock);
        $this->assertSame('cancelled', $order->fresh()->status);
        $this->assertSame(1, StockMovement::where('reason', 'Order cancelled')->count());
    }

    public function test_draft_cancellation_does_not_change_inventory(): void
    {
        $this->commerce->cancelOrder($this->draft()->id, $this->admin);
        $this->assertSame(20, $this->product->fresh()->stock);
        $this->assertSame(1, StockMovement::count());
    }

    public function test_insufficient_stock_rolls_back_every_product(): void
    {
        $other = Product::create(['name' => 'Lamp', 'sku' => 'NX-002', 'category' => 'Home', 'price_cents' => 8900]);
        $order = $this->commerce->createOrder($this->admin, $this->customer->id, [['product_id' => $this->product->id, 'quantity' => 2], ['product_id' => $other->id, 'quantity' => 1]]);
        try { $this->commerce->confirmOrder($order->id, $this->admin); $this->fail('Insufficient stock must fail.'); }
        catch (ValidationException $e) { $this->assertArrayHasKey('order', $e->errors()); }
        $this->assertSame(20, $this->product->fresh()->stock);
        $this->assertSame('draft', $order->fresh()->status);
        $this->assertSame(0, StockMovement::where('order_id', $order->id)->count());
    }

    public function test_paid_orders_cannot_be_cancelled(): void
    {
        $order = $this->draft();
        $this->commerce->confirmOrder($order->id, $this->admin);
        $this->commerce->recordPayment($order->id, $this->admin);
        $this->expectException(ValidationException::class);
        $this->commerce->cancelOrder($order->id, $this->admin);
    }

    public function test_negative_inventory_is_rejected(): void
    {
        try { $this->commerce->adjustStock($this->product->id, -21, 'Invalid count', $this->admin); $this->fail('Negative stock must fail.'); }
        catch (ValidationException $e) { $this->assertArrayHasKey('adjustment', $e->errors()); }
        $this->assertSame(20, $this->product->fresh()->stock);
    }

    public function test_operator_permissions_are_enforced_on_the_server(): void
    {
        $operator = User::factory()->create(['role' => 'operator']);
        Livewire::actingAs($operator)->test(Products::class)->call('create')->assertForbidden();
        Livewire::actingAs($operator)->test(Products::class)->call('adjust', $this->product->id)->assertForbidden();
        Livewire::actingAs($operator)->test(Settings::class)->set('businessName', 'Unauthorized')->call('saveBusiness')->assertForbidden();
        Livewire::actingAs($operator)->test(Customers::class)->call('create')->assertSet('showForm', true);
    }

    public function test_customer_form_validation_and_archival_preserve_orders(): void
    {
        Livewire::actingAs($this->admin)->test(Customers::class)->call('create')
            ->set('form.name', 'New Person')->set('form.email', $this->customer->email)->call('save')->assertHasErrors('form.email');
        $this->draft();
        Livewire::actingAs($this->admin)->test(Customers::class)->call('delete', $this->customer->id)->assertHasNoErrors();
        $this->assertSame('inactive', $this->customer->fresh()->status);
        $this->assertSame(1, Order::count());
    }

    public function test_order_form_uses_server_prices_and_rejects_duplicate_products(): void
    {
        Livewire::actingAs($this->admin)->test(Orders::class)->call('create')
            ->set('customerId', (string) $this->customer->id)
            ->set('lines', [['product_id' => $this->product->id, 'quantity' => 2, 'unit_price_cents' => 1]])
            ->call('save')->assertHasNoErrors();
        $this->assertSame(29800, Order::first()->total_cents);
        Livewire::actingAs($this->admin)->test(Orders::class)->call('create')
            ->set('customerId', (string) $this->customer->id)
            ->set('lines', [['product_id' => $this->product->id, 'quantity' => 1], ['product_id' => $this->product->id, 'quantity' => 1]])
            ->call('save')->assertHasErrors('lines.0.product_id');
    }

    public function test_revenue_counts_recorded_payments_only(): void
    {
        $paid = $this->draft();
        $this->commerce->confirmOrder($paid->id, $this->admin);
        $this->commerce->recordPayment($paid->id, $this->admin);
        $this->draft(4);
        $cancelled = $this->draft();
        $this->commerce->cancelOrder($cancelled->id, $this->admin);
        $data = (new Overview)->data(30);
        $this->assertSame(29800, $data['revenue']);
        $this->assertSame(2, $data['count']);
        $this->assertEquals(298, array_sum($data['chart']['current']));
    }

    public function test_export_filters_and_neutralizes_spreadsheet_formulas(): void
    {
        $this->customer->update(['name' => '=DANGEROUS()']);
        $this->draft();
        $response = $this->actingAs($this->admin)->get('/exports/orders?status=draft');
        $response->assertOk()->assertDownload();
        $this->assertStringContainsString("'=DANGEROUS()", $response->streamedContent());
        $this->get('/exports/orders?period=999')->assertSessionHasErrors('period');
    }

    public function test_demo_login_is_unavailable_outside_local_environment(): void
    {
        config(['nexo.demo_enabled' => true]);
        $this->post('/demo')->assertNotFound();
    }

    public function test_customer_can_be_created_edited_and_found_by_search(): void
    {
        $component = Livewire::actingAs($this->admin)->test(Customers::class)->call('create')
            ->set('form.name', 'Morgan Lee')->set('form.email', 'morgan@example.test')
            ->set('form.company', 'Studio Morgan')->call('save')->assertHasNoErrors();
        $customer = Customer::where('email', 'morgan@example.test')->firstOrFail();
        $component->call('edit', $customer->id)->set('form.company', 'Morgan & Co.')->call('save')->assertHasNoErrors()
            ->set('search', 'Morgan & Co.')->assertSee('Morgan Lee')->assertDontSee('olivia@example.test');
        $this->assertSame('Morgan & Co.', $customer->fresh()->company);
    }

    public function test_product_creation_stock_adjustment_and_price_edit(): void
    {
        $component = Livewire::actingAs($this->admin)->test(Products::class)->call('create')
            ->set('form.name', 'Arc Lamp')->set('form.sku', 'NX-LAMP')->set('form.price', '89.95')
            ->set('initialStock', 12)->call('save')->assertHasNoErrors();
        $product = Product::where('sku', 'NX-LAMP')->firstOrFail();
        $this->assertSame(8995, $product->price_cents);
        $this->assertSame(12, $product->stock);
        $component->call('adjust', $product->id)->set('adjustment', '-3')->set('adjustmentReason', 'Sample allocation')
            ->call('saveAdjustment')->assertHasNoErrors();
        $component->call('edit', $product->id)->set('form.price', '99.00')->call('save')->assertHasNoErrors();
        $this->assertSame(9, $product->fresh()->stock);
        $this->assertSame(9900, $product->fresh()->price_cents);
        $this->assertEquals(9, $product->movements()->sum('quantity'));
    }

    public function test_interactive_order_actions_complete_the_workflow(): void
    {
        $order = $this->draft();
        Livewire::actingAs($this->admin)->test(Orders::class)->call('viewOrder', $order->id)
            ->call('actOnOrder', 'confirm')->assertHasNoErrors()->assertSee('Record payment')
            ->call('actOnOrder', 'pay')->assertHasNoErrors()->assertSee('Recorded manually')
            ->call('actOnOrder', 'fulfill')->assertHasNoErrors()->assertSee('Fulfilled');
        $this->assertSame('paid', $order->fresh()->payment_status);
        $this->assertSame('fulfilled', $order->fresh()->status);
    }
}
