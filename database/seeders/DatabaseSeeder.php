<?php
namespace Database\Seeders;

use App\Actions\Commerce;
use App\Models\{Customer, Product, Setting, User};
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            throw new \RuntimeException('Demo fixtures may only be seeded in local or testing environments.');
        }
        if (Product::exists() || Customer::exists()) {
            $this->command?->info('Workspace already contains data; nothing was replaced.');
            return;
        }
        DB::transaction(function () {
            mt_srand(42);
            $admin = new User(['name' => 'Alex Morgan', 'email' => 'demo@nexo.test', 'password' => 'NexoDemo!2026']);
            $admin->role = 'admin'; $admin->created_at = now()->subDays(100); $admin->save();
            $operator = new User(['name' => 'Jamie Chen', 'email' => 'operator@nexo.test', 'password' => 'NexoDemo!2026']);
            $operator->role = 'operator'; $operator->created_at = now()->subDays(100); $operator->save();
            Setting::create(['key' => 'business_name', 'value' => 'Nexo Studio']);
            Setting::create(['key' => 'business_email', 'value' => 'hello@nexo.test']);
            $names = ['Olivia Rhye','Phoenix Baker','Lana Steiner','Demi Wilkinson','Drew Cano','Natali Craig','Orlando Diggs','Andi Lane','Kate Morrison','Koray Okumus','Sienna Hewitt','Noah Williams','Emma Wilson','Liam Anderson','Ava Thompson','Lucas Martin','Mia Robinson','Ethan Clark','Isabella Lewis','James Walker','Sofia Hall','Benjamin Allen','Amelia Young','Henry King','Charlotte Wright','Elijah Scott','Harper Green','William Adams','Evelyn Nelson','Oliver Carter','Chloe Mitchell','Leo Perez'];
            $companies = ['Forma Studio','North & Co.','Sunday Supply','Objects of Home','The Good Edit','Gather Goods','Kinfolk Market','Studio June'];
            $cities = ['New York','Austin','London','Los Angeles','Portland','Amsterdam','Toronto','Copenhagen'];
            foreach ($names as $i => $name) {
                Customer::create(['name' => $name, 'email' => strtolower(str_replace(' ', '.', $name)).'@example.test', 'company' => $companies[$i % 8], 'phone' => '+1 202 555 '.str_pad((string) (100 + $i), 4, '0', STR_PAD_LEFT), 'city' => $cities[$i % 8], 'country' => ['United States','United States','United Kingdom','United States','United States','Netherlands','Canada','Denmark'][$i % 8], 'address' => (120 + $i).' Design Avenue', 'status' => $i === 30 ? 'inactive' : 'active', 'created_at' => now()->subDays(($i * 7) % 80)->subHours(2)]);
            }
            $catalog = [
                ['Studio Headphones','NX-AUD-001','Electronics',14900,'headphones'],
                ['Arc Table Lamp','NX-HOM-002','Home & Living',8900,'lamp'],
                ['Everyday Tote','NX-ACC-003','Accessories',4500,'bag'],
                ['Mechanical Keyboard','NX-AUD-004','Electronics',12900,'keyboard'],
                ['Insulated Bottle','NX-LIF-005','Lifestyle',3500,'bottle'],
                ['Stoneware Mug','NX-HOM-006','Home & Living',2800,'mug'],
                ['Portable Speaker','NX-AUD-007','Electronics',7900,'speaker'],
                ['Essential Watch','NX-ACC-008','Accessories',18900,'watch'],
                ['Canvas Weekender','NX-ACC-009','Accessories',9500,'bag'],
                ['Ambient Desk Light','NX-HOM-010','Home & Living',6500,'lamp'],
                ['Travel Tumbler','NX-LIF-011','Lifestyle',3200,'bottle'],
                ['Wireless Headphones','NX-AUD-012','Electronics',19900,'headphones'],
            ];
            $commerce = app(Commerce::class);
            foreach ($catalog as [$name, $sku, $category, $price, $artwork]) {
                $product = Product::create(['name' => $name, 'sku' => $sku, 'category' => $category, 'price_cents' => $price, 'artwork' => $artwork, 'description' => 'Thoughtfully designed for everyday living. Premium materials, considered details.', 'low_stock_threshold' => 10, 'created_at' => now()->subDays(90)]);
                $commerce->adjustStock($product->id, 500, 'Opening inventory', $admin);
                $product->movements()->where('reason', 'Opening inventory')->update(['created_at' => now()->subDays(90)]);
            }
            $products = Product::all();
            $today = now()->copy();
            try {
                for ($day = 59; $day >= 0; $day--) {
                    $daily = $day < 30 ? mt_rand(3, 6) : mt_rand(2, 4);
                    for ($j = 0; $j < $daily; $j++) {
                        $date = $today->copy()->subDays($day)->startOfDay()->addHours(8 + $j * 2)->addMinutes(mt_rand(0, 45));
                        if ($date->gt($today)) { $date = $today->copy()->subMinutes(($j + 1) * 9); }
                        Carbon::setTestNow($date);
                        $keys = array_rand($catalog, mt_rand(1, 3));
                        $lines = collect(is_array($keys) ? $keys : [$keys])->map(fn ($key) => ['product_id' => $products[$key]->id, 'quantity' => mt_rand(1, 2)])->all();
                        $eligibleCustomers = Customer::where('status', 'active')->where('created_at', '<=', $date)->pluck('id')->all();
                        $order = $commerce->createOrder($admin, $eligibleCustomers[array_rand($eligibleCustomers)], $lines);
                        $state = mt_rand(1, 100);
                        if ($state > 10) {
                            $commerce->confirmOrder($order->id, $admin);
                            if ($state > 24) { $commerce->recordPayment($order->id, $admin); }
                            if ($state > 38) { $commerce->fulfillOrder($order->id); }
                        } elseif ($state <= 3) { $commerce->cancelOrder($order->id, $admin); }
                    }
                }
            } finally { Carbon::setTestNow(); }
            foreach ([2 => 7, 5 => 4, 10 => 0] as $index => $balance) {
                $product = $products[$index]->fresh();
                $commerce->adjustStock($product->id, $balance - $product->stock, 'Sample allocation and stock count', $admin);
            }
        });
    }
}
