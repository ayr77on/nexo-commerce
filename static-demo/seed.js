const DAY = 86400000;

export function createDemo(now = new Date()) {
    const anchor = new Date(now);
    const day = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate(), 12));
    let randomSeed = 42;
    const random = max => { randomSeed = (randomSeed * 1664525 + 1013904223) >>> 0; return Math.floor(randomSeed / 4294967296 * max); };
    const ago = days => new Date(day.getTime() - days * DAY).toISOString();
    const names = ['Olivia Rhye','Phoenix Baker','Lana Steiner','Demi Wilkinson','Drew Cano','Natali Craig','Orlando Diggs','Andi Lane','Kate Morrison','Koray Okumus','Sienna Hewitt','Noah Williams','Emma Wilson','Liam Anderson','Ava Thompson','Lucas Martin','Mia Robinson','Ethan Clark','Isabella Lewis','James Walker','Sofia Hall','Benjamin Allen','Amelia Young','Henry King','Charlotte Wright','Elijah Scott','Harper Green','William Adams','Evelyn Nelson','Oliver Carter','Chloe Mitchell','Leo Perez'];
    const companies = ['Forma Studio','North & Co.','Sunday Supply','Objects of Home','The Good Edit','Gather Goods','Kinfolk Market','Studio June'];
    const cities = ['New York','Austin','London','Los Angeles','Portland','Amsterdam','Toronto','Copenhagen'];
    const countries = ['United States','United States','United Kingdom','United States','United States','Netherlands','Canada','Denmark'];
    const customers = names.map((name, index) => ({
        id: index + 1, name, email: name.toLowerCase().replaceAll(' ', '.') + '@example.test',
        company: companies[index % 8], city: cities[index % 8], country: countries[index % 8],
        phone: '+1 202 555 ' + String(100 + index).padStart(4, '0'), address: `${120 + index} Design Avenue`,
        status: index === 30 ? 'inactive' : 'active', createdAt: ago(index < 24 ? 120 + index : (32 - index) * 3),
    }));
    const catalog = [
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
    const products = catalog.map(([name, sku, category, priceCents, artwork], index) => ({
        id: index + 1, name, sku, category, priceCents, artwork, stock: 600,
        lowStockThreshold: 10, active: true, description: 'Thoughtfully designed for everyday living. Premium materials, considered details.', createdAt: ago(150),
    }));
    const movements = products.map(product => ({ id: product.id, productId: product.id, orderId: null, quantity: 600, balance: 600, reason: 'Opening inventory', createdAt: ago(150) }));
    const orders = [];
    const payments = [];
    for (let daysAgo = 69; daysAgo >= 0; daysAgo--) {
        const dailyCount = daysAgo < 30 ? 3 + random(3) : 2 + random(2);
        for (let i = 0; i < dailyCount; i++) {
            const date = new Date(day.getTime() - daysAgo * DAY + (i - 2) * 3600000);
            if (date > anchor) date.setTime(anchor.getTime() - (i + 1) * 540000);
            const createdAt = date.toISOString();
            const eligible = customers.filter(customer => customer.status === 'active' && customer.createdAt <= createdAt);
            const customer = eligible[random(eligible.length)];
            const productIds = new Set();
            const count = 1 + random(3);
            while (productIds.size < count) productIds.add(random(products.length) + 1);
            const items = [...productIds].map(id => {
                const product = products[id - 1];
                const quantity = 1 + random(2);
                return { productId: id, productName: product.name, sku: product.sku, quantity, unitPriceCents: product.priceCents, totalCents: quantity * product.priceCents };
            });
            const state = random(100);
            const status = state < 4 ? 'cancelled' : state < 12 ? 'draft' : state < 38 ? 'confirmed' : 'fulfilled';
            const paid = state >= 25;
            const id = orders.length + 1;
            const order = { id, number: `NX-${createdAt.slice(2,10).replaceAll('-','')}-${String(id).padStart(4,'0')}`, customerId: customer.id, status, paymentStatus: paid ? 'paid' : 'unpaid', items, totalCents: items.reduce((sum,item) => sum + item.totalCents, 0), notes: '', createdAt, confirmedAt: ['confirmed','fulfilled'].includes(status) ? createdAt : null, paidAt: paid ? createdAt : null };
            orders.push(order);
            if (['confirmed','fulfilled'].includes(status)) {
                for (const item of items) {
                    const product = products[item.productId - 1];
                    product.stock -= item.quantity;
                    movements.push({ id: movements.length + 1, productId: product.id, orderId: id, quantity: -item.quantity, balance: product.stock, reason: 'Order confirmed', createdAt });
                }
            }
            if (paid) payments.push({ id: payments.length + 1, orderId: id, amountCents: order.totalCents, method: 'manual', createdAt });
        }
    }
    for (const [index, balance] of [[2,7],[5,4],[10,0]]) {
        const product = products[index];
        movements.push({ id: movements.length + 1, productId: product.id, orderId: null, quantity: balance - product.stock, balance, reason: 'Sample allocation and stock count', createdAt: anchor.toISOString() });
        product.stock = balance;
    }
    return {
        schemaVersion: 1, createdAt: anchor.toISOString(),
        profile: { name: 'Alex Morgan', email: 'alex@example.test' },
        workspace: { name: 'Nexo Studio', email: 'hello@example.test' },
        customers, products, orders, payments, movements,
    };
}
