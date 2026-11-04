import { createDemo } from './seed.js';

export const STORAGE_KEY = 'nexo-commerce-static-v1';
const nextId = records => Math.max(0, ...records.map(record => record.id)) + 1;
const text = (value, max = 160) => String(value ?? '').trim().slice(0, max);
const fail = message => { throw new Error(message); };
const integer = (value, min, max, label) => {
    if (String(value).trim() === '' || !Number.isInteger(Number(value)) || Number(value) < min || Number(value) > max) fail(`${label} must be a whole number between ${min.toLocaleString()} and ${max.toLocaleString()}.`);
    return Number(value);
};
const email = value => {
    const result = text(value).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) fail('Enter a valid email address.');
    return result;
};

export function isWorkspace(value) {
    return value?.schemaVersion === 1 && value.profile && value.workspace
        && ['customers','products','orders','payments','movements'].every(key => Array.isArray(value[key]));
}

export class WorkspaceStore {
    constructor(storage = null, clock = () => new Date()) {
        this.storage = storage;
        this.clock = clock;
        this.persistent = Boolean(storage);
        try {
            const saved = JSON.parse(storage?.getItem(STORAGE_KEY) || 'null');
            this.state = isWorkspace(saved) ? saved : createDemo(clock());
        } catch { this.state = createDemo(clock()); }
        this.persist();
    }

    persist() {
        try { if (this.storage) this.storage.setItem(STORAGE_KEY, JSON.stringify(this.state)); }
        catch { this.persistent = false; }
    }

    mutate(callback) {
        const draft = structuredClone(this.state);
        const result = callback(draft, this.clock().toISOString());
        this.state = draft;
        this.persist();
        return result;
    }

    reset() { this.state = createDemo(this.clock()); this.persist(); }

    saveCustomer(input, id = null) {
        return this.mutate((state, now) => {
            const name = text(input.name, 100);
            if (!name) fail('Enter the customer’s full name.');
            const addressEmail = email(input.email);
            if (state.customers.some(customer => customer.id !== id && customer.email.toLowerCase() === addressEmail)) fail('A customer with this email already exists.');
            const country = text(input.country, 100);
            if (!country) fail('Enter a country.');
            if (!['active','inactive'].includes(input.status)) fail('Choose a valid customer status.');
            const data = { name, email: addressEmail, country, status: input.status, company: text(input.company,120), phone: text(input.phone,40), city: text(input.city,100), address: text(input.address,500) };
            if (id) {
                const customer = state.customers.find(customer => customer.id === id);
                if (!customer) fail('Customer not found.');
                Object.assign(customer, data);
                return id;
            }
            const newId = nextId(state.customers);
            state.customers.push({ ...data, id: newId, createdAt: now });
            return newId;
        });
    }

    removeCustomer(id) {
        return this.mutate(state => {
            const customer = state.customers.find(customer => customer.id === id);
            if (!customer) fail('Customer not found.');
            if (state.orders.some(order => order.customerId === id)) { customer.status = 'inactive'; return 'archived'; }
            state.customers = state.customers.filter(customer => customer.id !== id);
            return 'deleted';
        });
    }

    saveProduct(input, id = null) {
        return this.mutate((state, now) => {
            const name = text(input.name,120), sku = text(input.sku,40), category = text(input.category,60);
            if (!name || !sku || !category) fail('Name, SKU, and category are required.');
            if (state.products.some(product => product.id !== id && product.sku.toLowerCase() === sku.toLowerCase())) fail('This SKU is already in use.');
            const price = String(input.price).trim();
            if (!/^\d+(?:\.\d{1,2})?$/.test(price) || Number(price) < .01 || Number(price) > 10000) fail('Enter a price between $0.01 and $10,000 with at most two decimal places.');
            const lowStockThreshold = integer(input.lowStockThreshold,0,100000,'Low-stock threshold');
            const data = { name, sku, category, priceCents: Math.round(Number(price) * 100), lowStockThreshold, description: text(input.description,1000), active: Boolean(input.active) };
            if (id) {
                const product = state.products.find(product => product.id === id);
                if (!product) fail('Product not found.');
                Object.assign(product,data);
                return id;
            }
            const stock = integer(input.initialStock ?? 0,0,1000000,'Opening stock');
            const product = { ...data, id: nextId(state.products), artwork: 'package', stock, createdAt: now };
            state.products.push(product);
            if (stock) this.addMovement(state,product,stock,'Opening inventory',now);
            return product.id;
        });
    }

    archiveProduct(id) {
        this.mutate(state => {
            const product = state.products.find(product => product.id === id);
            if (!product) fail('Product not found.');
            product.active = false;
        });
    }

    addMovement(state, product, quantity, reason, now, orderId = null) {
        state.movements.push({ id: nextId(state.movements), productId: product.id, orderId, quantity, reason, balance: product.stock, createdAt: now });
    }

    adjustStock(id, input) {
        this.mutate((state,now) => {
            const product = state.products.find(product => product.id === id);
            if (!product) fail('Product not found.');
            const quantity = integer(input.quantity,-1000000,1000000,'Adjustment');
            const reason = text(input.reason,160);
            if (!quantity) fail('Enter a non-zero adjustment.');
            if (reason.length < 3) fail('Add a reason of at least three characters.');
            if (product.stock + quantity < 0 || product.stock + quantity > 1000000) fail('The resulting stock must be between 0 and 1,000,000.');
            product.stock += quantity;
            this.addMovement(state,product,quantity,reason,now);
        });
    }

    createOrder(customerId, lines, notes = '') {
        return this.mutate((state,now) => {
            const customer = state.customers.find(customer => customer.id === customerId && customer.status === 'active');
            if (!customer) fail('Choose an active customer.');
            if (!Array.isArray(lines) || !lines.length || lines.length > 30) fail('Add between 1 and 30 products.');
            const seen = new Set();
            const items = lines.map(line => {
                const product = state.products.find(product => product.id === Number(line.productId) && product.active);
                if (!product) fail('Choose an active product for each line.');
                if (seen.has(product.id)) fail('A product can only appear once. Update its quantity instead.');
                seen.add(product.id);
                const quantity = integer(line.quantity,1,1000,'Quantity');
                return { productId: product.id, productName: product.name, sku: product.sku, quantity, unitPriceCents: product.priceCents, totalCents: quantity * product.priceCents };
            });
            const totalCents = items.reduce((sum,item) => sum + item.totalCents,0);
            if (totalCents > 100000000) fail('Order total cannot exceed $1,000,000.');
            const id = nextId(state.orders);
            state.orders.push({ id, number: `NX-${now.slice(2,10).replaceAll('-','')}-${String(id).padStart(4,'0')}`, customerId, items, totalCents, notes: text(notes,1000), status: 'draft', paymentStatus: 'unpaid', createdAt: now, confirmedAt: null, paidAt: null });
            return id;
        });
    }

    actOnOrder(id, action) {
        this.mutate((state,now) => {
            const order = state.orders.find(order => order.id === id);
            if (!order) fail('Order not found.');
            if (action === 'confirm') {
                if (['confirmed','fulfilled'].includes(order.status)) return;
                if (order.status !== 'draft') fail('Only drafts can be confirmed.');
                for (const item of order.items) {
                    const product = state.products.find(product => product.id === item.productId);
                    if (!product?.active || product.stock < item.quantity) fail(`Insufficient stock for ${item.productName}. Available: ${product?.stock ?? 0}.`);
                }
                for (const item of order.items) {
                    const product = state.products.find(product => product.id === item.productId);
                    product.stock -= item.quantity;
                    this.addMovement(state,product,-item.quantity,'Order confirmed',now,id);
                }
                order.status = 'confirmed'; order.confirmedAt = now;
            } else if (action === 'cancel') {
                if (order.status === 'cancelled') return;
                if (order.paymentStatus === 'paid' || order.status === 'fulfilled') fail('Paid or fulfilled orders cannot be cancelled.');
                if (order.status === 'confirmed') {
                    for (const item of order.items) {
                        const product = state.products.find(product => product.id === item.productId);
                        if (product.stock + item.quantity > 1000000) fail('Restoring this order would exceed the stock limit.');
                        product.stock += item.quantity;
                        this.addMovement(state,product,item.quantity,'Order cancelled',now,id);
                    }
                }
                order.status = 'cancelled';
            } else if (action === 'pay') {
                if (order.paymentStatus === 'paid') return;
                if (!['confirmed','fulfilled'].includes(order.status)) fail('Confirm this order before recording a payment.');
                state.payments.push({ id: nextId(state.payments), orderId: id, amountCents: order.totalCents, method: 'manual', createdAt: now });
                order.paymentStatus = 'paid'; order.paidAt = now;
            } else if (action === 'fulfill') {
                if (order.status === 'fulfilled') return;
                if (order.status !== 'confirmed') fail('Only confirmed orders can be fulfilled.');
                order.status = 'fulfilled';
            } else fail('Unknown order action.');
        });
    }

    saveProfile(input) {
        this.mutate(state => {
            const name = text(input.name,100);
            if (!name) fail('Enter your name.');
            state.profile = { name, email: email(input.email) };
        });
    }

    saveWorkspace(input) {
        this.mutate(state => {
            const name = text(input.name,80);
            if (!name) fail('Enter a workspace name.');
            state.workspace = { name, email: email(input.email) };
        });
    }
}
