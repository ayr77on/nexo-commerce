const DAY = 86400000;
export const sum = (items, field) => items.reduce((value,item) => value + Number(item[field] || 0),0);
export const latest = records => [...records].sort((a,b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id);
export const stockLabel = product => !product.active ? 'inactive' : product.stock === 0 ? 'Out of stock' : product.stock <= product.lowStockThreshold ? 'Low stock' : 'In stock';

export function overview(state, period = 30, now = new Date()) {
    period = [7,30,90].includes(Number(period)) ? Number(period) : 30;
    const end = Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate() + 1);
    const start = end - period * DAY, previousStart = start - period * DAY;
    const within = (value,from,to) => value && Date.parse(value) >= from && Date.parse(value) < to;
    const paid = state.orders.filter(order => order.paymentStatus === 'paid' && within(order.paidAt,start,end));
    const previous = state.orders.filter(order => order.paymentStatus === 'paid' && within(order.paidAt,previousStart,start));
    const revenue = sum(paid,'totalCents'), previousRevenue = sum(previous,'totalCents');
    const count = state.orders.filter(order => order.status !== 'cancelled' && within(order.createdAt,start,end)).length;
    const previousCount = state.orders.filter(order => order.status !== 'cancelled' && within(order.createdAt,previousStart,start)).length;
    const newCustomers = state.customers.filter(customer => within(customer.createdAt,start,end)).length;
    const previousCustomers = state.customers.filter(customer => within(customer.createdAt,previousStart,start)).length;
    const aov = paid.length ? Math.round(revenue / paid.length) : 0;
    const previousAov = previous.length ? Math.round(previousRevenue / previous.length) : 0;
    const growth = [revenue,count,newCustomers,aov].map((value,index) => {
        const prior = [previousRevenue,previousCount,previousCustomers,previousAov][index];
        return prior > 0 ? Math.round((value - prior) / prior * 1000) / 10 : null;
    });
    const chart = { labels: [], current: [], previous: [] };
    for (let index = 0; index < period; index++) {
        const from = start + index * DAY;
        chart.labels.push(new Date(from).toLocaleDateString('en-US',{ month: 'short', day: 'numeric', timeZone: 'UTC' }));
        chart.current.push(sum(paid.filter(order => within(order.paidAt,from,from + DAY)),'totalCents') / 100);
        chart.previous.push(sum(previous.filter(order => within(order.paidAt,previousStart + index * DAY,previousStart + (index + 1) * DAY)),'totalCents') / 100);
    }
    const categoryRevenue = {}, sold = {};
    for (const order of paid) for (const item of order.items) {
        const product = state.products.find(product => product.id === item.productId);
        const category = product?.category || 'Other';
        categoryRevenue[category] = (categoryRevenue[category] || 0) + item.totalCents;
        sold[item.productId] = (sold[item.productId] || 0) + item.quantity;
    }
    return {
        revenue, count, newCustomers, aov, growth, chart,
        start: new Date(start), end: new Date(end - 1),
        categories: Object.entries(categoryRevenue).map(([name,revenue]) => ({ name,revenue })).sort((a,b) => b.revenue - a.revenue),
        topProducts: state.products.map(product => ({ ...product, sold: sold[product.id] || 0 })).sort((a,b) => b.sold - a.sold).slice(0,4),
        recentOrders: latest(state.orders).slice(0,5),
        lowStock: state.products.filter(product => product.active && product.stock <= product.lowStockThreshold).sort((a,b) => a.stock - b.stock),
        pendingCount: state.orders.filter(order => order.status === 'confirmed').length,
    };
}

const matches = (value,query) => String(value || '').toLowerCase().includes(query);

export function queryCustomers(state, filters = {}) {
    const search = (filters.search || '').trim().toLowerCase();
    const records = state.customers.map(customer => {
        const orders = state.orders.filter(order => order.customerId === customer.id);
        return { ...customer, orderCount: orders.length, lifetimeValue: sum(orders.filter(order => order.paymentStatus === 'paid'),'totalCents') };
    }).filter(customer => (!filters.status || customer.status === filters.status) && [customer.name,customer.email,customer.company].some(value => matches(value,search)));
    return filters.sort === 'name' ? records.sort((a,b) => a.name.localeCompare(b.name)) : filters.sort === 'value' ? records.sort((a,b) => b.lifetimeValue - a.lifetimeValue) : latest(records);
}

export function queryProducts(state, filters = {}) {
    const search = (filters.search || '').trim().toLowerCase();
    const records = state.products.filter(product => {
        const stockMatch = filters.stock === 'archived' ? !product.active : product.active && (filters.stock === 'low' ? product.stock <= product.lowStockThreshold : filters.stock === 'available' ? product.stock > 0 : true);
        return stockMatch && (!filters.category || product.category === filters.category) && [product.name,product.sku].some(value => matches(value,search));
    });
    return filters.sort === 'name' ? records.sort((a,b) => a.name.localeCompare(b.name)) : filters.sort === 'price' ? records.sort((a,b) => b.priceCents - a.priceCents) : filters.sort === 'stock' ? records.sort((a,b) => a.stock - b.stock) : latest(records);
}

export function queryOrders(state, filters = {}) {
    const search = (filters.search || '').trim().toLowerCase();
    const records = state.orders.filter(order => {
        const customer = state.customers.find(customer => customer.id === order.customerId);
        return (!filters.status || order.status === filters.status) && (!filters.payment || order.paymentStatus === filters.payment)
            && [order.number,customer?.name,customer?.email].some(value => matches(value,search));
    });
    return filters.sort === 'oldest' ? latest(records).reverse() : filters.sort === 'value' ? records.sort((a,b) => b.totalCents - a.totalCents) : latest(records);
}

export function paginate(records, requestedPage = 1, size = 8) {
    const pages = Math.max(1,Math.ceil(records.length / size));
    const page = Math.max(1,Math.min(Number(requestedPage) || 1,pages));
    return { rows: records.slice((page - 1) * size,page * size), page, pages, total: records.length, first: records.length ? (page - 1) * size + 1 : 0, last: Math.min(page * size,records.length) };
}

export function ordersCsv(state, orders) {
    const cell = value => {
        let result = String(value ?? '');
        if (/^[\s]*[=+\-@\t\r]/u.test(result)) result = "'" + result;
        return '"' + result.replaceAll('"','""') + '"';
    };
    return '\uFEFF' + [
        ['Order','Date (UTC)','Customer','Email','Status','Payment','Total (USD)'],
        ...orders.map(order => {
            const customer = state.customers.find(customer => customer.id === order.customerId);
            return [order.number,order.createdAt,customer?.name,customer?.email,order.status,order.paymentStatus,(order.totalCents / 100).toFixed(2)];
        }),
    ].map(row => row.map(cell).join(',')).join('\r\n');
}
