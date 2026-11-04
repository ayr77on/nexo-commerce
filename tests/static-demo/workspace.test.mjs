import test from 'node:test';
import assert from 'node:assert/strict';
import { WorkspaceStore, STORAGE_KEY } from '../../static-demo/store.js';
import { overview, queryCustomers, queryProducts, queryOrders, paginate, ordersCsv } from '../../static-demo/queries.js';

const clock = () => new Date('2026-11-04T18:00:00Z');
const memory = () => {
    const values = new Map();
    return { getItem:key => values.get(key) ?? null, setItem:(key,value) => values.set(key,value) };
};
const workspace = () => new WorkspaceStore(memory(),clock);
const draft = (store,quantity = 2) => store.createOrder(store.state.customers[0].id,[{ productId:1,quantity }]);

test('sample data is internally consistent and contains no application credentials',() => {
    const store = workspace();
    assert.equal(store.state.customers.length,32);
    assert.equal(store.state.products.length,12);
    assert.ok(store.state.orders.length > 150);
    for (const product of store.state.products) {
        assert.equal(store.state.movements.filter(movement => movement.productId === product.id).reduce((sum,movement) => sum + movement.quantity,0),product.stock);
        assert.ok(product.stock >= 0);
    }
    for (const order of store.state.orders) {
        assert.equal(order.items.reduce((sum,item) => sum + item.totalCents,0),order.totalCents);
        const customer = store.state.customers.find(customer => customer.id === order.customerId);
        assert.ok(customer.createdAt <= order.createdAt);
        if (order.paymentStatus === 'paid') assert.equal(store.state.payments.find(payment => payment.orderId === order.id)?.amountCents,order.totalCents);
    }
    assert.doesNotMatch(JSON.stringify(store.state),/APP_KEY|DB_PASSWORD|NexoDemo!|password/);
});

test('orders retain price snapshots and repeated actions do not duplicate stock or payments',() => {
    const store = workspace();
    const opening = store.state.products[0].stock;
    const orderId = draft(store,2);
    const originalTotal = store.state.orders.find(order => order.id === orderId).totalCents;
    store.saveProduct({...store.state.products[0],price:'199.00'},1);
    store.actOnOrder(orderId,'confirm'); store.actOnOrder(orderId,'confirm');
    assert.equal(store.state.products[0].stock,opening - 2);
    assert.equal(store.state.orders.find(order => order.id === orderId).totalCents,originalTotal);
    const paidCount = store.state.payments.length;
    store.actOnOrder(orderId,'pay'); store.actOnOrder(orderId,'pay');
    assert.equal(store.state.payments.length,paidCount + 1);
    store.actOnOrder(orderId,'fulfill');
    assert.equal(store.state.orders.find(order => order.id === orderId).status,'fulfilled');
    assert.throws(() => store.actOnOrder(orderId,'cancel'),/cannot be cancelled/);
});

test('cancellation restores stock once while draft cancellation leaves stock unchanged',() => {
    const store = workspace();
    const opening = store.state.products[0].stock;
    const orderId = draft(store,3);
    store.actOnOrder(orderId,'confirm'); store.actOnOrder(orderId,'cancel'); store.actOnOrder(orderId,'cancel');
    assert.equal(store.state.products[0].stock,opening);
    store.actOnOrder(draft(store),'cancel');
    assert.equal(store.state.products[0].stock,opening);
});

test('insufficient inventory rolls back the full confirmation',() => {
    const store = workspace();
    const orderId = store.createOrder(1,[{productId:1,quantity:2},{productId:11,quantity:1}]);
    const before = JSON.stringify(store.state);
    assert.throws(() => store.actOnOrder(orderId,'confirm'),/Insufficient stock/);
    assert.equal(JSON.stringify(store.state),before);
});

test('customer edits, email uniqueness and archival preserve order history',() => {
    const store = workspace();
    const id = store.saveCustomer({name:'Morgan Lee',email:'morgan@example.test',country:'Argentina',status:'active'});
    store.saveCustomer({...store.state.customers.find(customer => customer.id === id),company:'Morgan & Co.'},id);
    assert.equal(queryCustomers(store.state,{search:'Morgan & Co.'})[0].id,id);
    assert.throws(() => store.saveCustomer({name:'Duplicate',email:'morgan@example.test',country:'Argentina',status:'active'}),/already exists/);
    assert.equal(store.removeCustomer(id),'deleted');
    draft(store);
    assert.equal(store.removeCustomer(1),'archived');
    assert.ok(store.state.orders.some(order => order.customerId === 1));
    assert.throws(() => draft(store),/active customer/);
});

test('product creation and stock adjustments remain traceable and reject invalid amounts',() => {
    const store = workspace();
    const id = store.saveProduct({name:'Arc Lamp',sku:'NEW-LAMP',category:'Home',price:'89.95',lowStockThreshold:5,initialStock:12,active:true});
    store.adjustStock(id,{quantity:-3,reason:'Sample allocation'});
    assert.equal(store.state.products.find(product => product.id === id).priceCents,8995);
    assert.equal(store.state.products.find(product => product.id === id).stock,9);
    assert.equal(store.state.movements.filter(movement => movement.productId === id).reduce((total,movement) => total + movement.quantity,0),9);
    const before = JSON.stringify(store.state);
    assert.throws(() => store.adjustStock(id,{quantity:-10,reason:'Invalid count'}),/resulting stock/);
    assert.equal(JSON.stringify(store.state),before);
    assert.throws(() => store.saveProduct({name:'Invalid',sku:'BAD',category:'Home',price:'1.001',lowStockThreshold:5,active:true}),/decimal/);
    store.archiveProduct(id);
    assert.ok(queryProducts(store.state,{stock:'archived'}).some(product => product.id === id));
});

test('order validation rejects duplicate lines and never trusts submitted prices',() => {
    const store = workspace();
    assert.throws(() => store.createOrder(1,[{productId:1,quantity:1},{productId:1,quantity:2}]),/only appear once/);
    assert.throws(() => draft(store,1.5),/whole number/);
    const id = store.createOrder(1,[{productId:1,quantity:1,unitPriceCents:1}]);
    assert.equal(store.state.orders.find(order => order.id === id).totalCents,14900);
    assert.throws(() => store.actOnOrder(id,'pay'),/Confirm this order/);
});

test('workspace changes persist locally and reset restores sample data',() => {
    const storage = memory();
    const store = new WorkspaceStore(storage,clock);
    store.saveProfile({name:'Demo Visitor',email:'visitor@example.test'});
    assert.equal(new WorkspaceStore(storage,clock).state.profile.name,'Demo Visitor');
    const unrelatedKey = 'another-application'; storage.setItem(unrelatedKey,'keep');
    store.reset();
    assert.equal(store.state.profile.name,'Alex Morgan');
    assert.equal(storage.getItem(unrelatedKey),'keep');
    assert.ok(storage.getItem(STORAGE_KEY));
});

test('blocked and malformed storage fall back to a usable in-memory workspace',() => {
    const blocked = {getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');}};
    const store = new WorkspaceStore(blocked,clock);
    assert.equal(store.persistent,false);
    assert.ok(draft(store));
    const corrupt = memory(); corrupt.setItem(STORAGE_KEY,'{invalid');
    assert.equal(new WorkspaceStore(corrupt,clock).state.products.length,12);
});

test('metrics use recorded sample payments and exclude cancelled orders',() => {
    const store = workspace();
    const before = overview(store.state,7,clock());
    const id = draft(store);
    store.actOnOrder(id,'confirm'); store.actOnOrder(id,'pay');
    const order = store.state.orders.find(order => order.id === id);
    const after = overview(store.state,7,clock());
    assert.equal(after.revenue,before.revenue + order.totalCents);
    assert.equal(after.count,before.count + 1);
    assert.ok(Math.abs(after.chart.current.reduce((a,b) => a + b,0) - after.revenue / 100) < .001);
    const cancelled = draft(store); store.actOnOrder(cancelled,'cancel');
    assert.equal(overview(store.state,7,clock()).count,after.count);
});

test('filters, sorting and pagination find the expected records',() => {
    const state = workspace().state;
    assert.equal(queryCustomers(state,{search:'Olivia Rhye'}).length,1);
    assert.equal(queryProducts(state,{stock:'low'}).length,3);
    assert.ok(queryOrders(state,{payment:'paid'}).every(order => order.paymentStatus === 'paid'));
    assert.ok(queryOrders(state,{status:'draft'}).every(order => order.status === 'draft'));
    assert.equal(paginate(state.orders,999).page,Math.ceil(state.orders.length / 8));
    assert.equal(paginate([],4).first,0);
});

test('CSV exports quote cells and neutralize spreadsheet formulas',() => {
    const store = workspace();
    store.state.customers[0].name = '=DANGEROUS()';
    const id = draft(store);
    const order = store.state.orders.find(order => order.id === id);
    const csv = ordersCsv(store.state,[order]);
    assert.ok(csv.startsWith('\uFEFF'));
    assert.ok(csv.includes("'=DANGEROUS()"));
    assert.ok(csv.includes('Total (USD)'));
});
