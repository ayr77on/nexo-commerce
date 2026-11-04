import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

// DOM integration tests exercise real event handlers. Canvas/layout remain browser QA.
const result = await build({
    configFile:false, logLevel:'silent',
    plugins:[{
        name:'dom-test-platform', enforce:'pre',
        resolveId(source) { if (source.endsWith('.css')) return '\0test:styles'; if (source === './charts.js') return '\0test:charts'; },
        load(id) {
            if (id === '\0test:styles') return '';
            if (id === '\0test:charts') return "export const colors = ['#8858ec','#ae90ed','#d2bff4','#ede4fc']; export function mountCharts(){} export function destroyCharts(){} export function updateChartTheme(){}";
        },
    }],
    build:{write:false,minify:false,rollupOptions:{input:fileURLToPath(new URL('../../static-demo/main.js',import.meta.url)),output:{format:'iife',inlineDynamicImports:true}}},
});
const bundle = result.output.find(item => item.type === 'chunk' && item.isEntry).code;
const html = await readFile(new URL('../../static-demo/index.html',import.meta.url),'utf8');

function setup(t,hash = '#/overview') {
    const dom = new JSDOM(html,{url:'https://example.test/nexo/' + hash,runScripts:'outside-only',pretendToBeVisual:true});
    const w = dom.window;
    w.structuredClone = structuredClone;
    w.scrollTo = () => {};
    w.HTMLElement.prototype.scrollIntoView = () => {};
    w.HTMLDialogElement.prototype.showModal = function(){ this.setAttribute('open',''); };
    w.HTMLDialogElement.prototype.close = function(){ this.removeAttribute('open'); this.dispatchEvent(new w.Event('close')); };
    w.fetch = () => { throw new Error('The static demo must not call a backend.'); };
    w.eval(bundle);
    t.after(() => w.close());
    const document = w.document;
    return {
        w, document,
        click(selector) { const element = document.querySelector(selector); assert.ok(element,`Missing control: ${selector}`); element.click(); },
        fill(selector,value) { const element = document.querySelector(selector); assert.ok(element,`Missing field: ${selector}`); element.value = value; element.dispatchEvent(new w.Event(element.tagName === 'SELECT' ? 'change' : 'input',{bubbles:true})); },
        submit(selector) { document.querySelector(selector).dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true})); },
        state() { return JSON.parse(w.localStorage.getItem('nexo-commerce-static-v1')); },
        async navigate(page) { if(w.location.hash === '#/' + page) return; const changed = new Promise(resolve => w.addEventListener('hashchange',resolve,{once:true})); w.location.hash = '#/' + page; await changed; },
    };
}

test('all screens navigate under a repository subpath without server routes',async t => {
    const ui = setup(t);
    for (const [page,title] of [['orders','Every order, considered.'],['customers','Your customers.'],['products','Products & inventory.'],['settings','A workspace that fits.'],['overview','Your business, in focus.']]) {
        await ui.navigate(page);
        assert.equal(ui.document.querySelector('h1').textContent,title);
        assert.ok(ui.document.querySelector(`a[aria-current="page"][href="#/${page}"]`));
    }
    assert.equal(ui.document.querySelector('[wire\\:id]'),null);
    assert.ok(ui.document.body.textContent.includes('Interactive demo'));
});

test('customer forms save, escape user input, and filter the table',async t => {
    const ui = setup(t,'#/customers');
    ui.click('[data-action="customer-create"]');
    ui.fill('[name="name"]','<img src=x onerror=alert(1)>');
    ui.fill('[name="email"]','visitor@example.test');
    ui.fill('[name="company"]','Test Studio');
    ui.submit('[data-form="customer"]');
    assert.ok(ui.state().customers.some(customer => customer.email === 'visitor@example.test'));
    assert.equal(ui.document.querySelector('img'),null);
    ui.fill('[data-filter="search"]','visitor@example.test');
    await new Promise(resolve => setTimeout(resolve,250));
    assert.equal(ui.document.querySelectorAll('tbody tr').length,1);
    assert.ok(ui.document.querySelector('tbody').textContent.includes('visitor@example.test'));
});

test('product form and stock modal record browser-local inventory movements',t => {
    const ui = setup(t,'#/products');
    ui.click('[data-action="product-create"]');
    ui.fill('[name="name"]','New demo lamp'); ui.fill('[name="sku"]','VISITOR-001');
    ui.fill('[name="price"]','89.95'); ui.fill('[name="initialStock"]','12');
    ui.submit('[data-form="product"]');
    const product = ui.state().products.find(product => product.sku === 'VISITOR-001');
    assert.equal(product.priceCents,8995);
    ui.click(`[data-action="product-stock"][data-id="${product.id}"]`);
    ui.fill('[name="quantity"]','-3'); ui.fill('[name="reason"]','Sample allocation');
    ui.submit('[data-form="stock"]');
    assert.equal(ui.state().products.find(item => item.id === product.id).stock,9);
    assert.ok(ui.state().movements.some(movement => movement.productId === product.id && movement.quantity === -3));
});

test('multi-line order creation, confirmation, payment and fulfillment work through the interface',t => {
    const ui = setup(t,'#/orders');
    const before = ui.state().products.find(product => product.id === 1).stock;
    ui.click('[data-action="order-create"]'); ui.fill('[name="customerId"]','1');
    ui.fill('[data-line="0"] select','1'); ui.fill('[data-line="0"] input','2');
    ui.click('[data-action="line-add"]'); ui.fill('[data-line="1"] select','2');
    assert.equal(ui.document.querySelector('#draft-total').textContent,'$387.00');
    ui.submit('[data-form="order"]');
    const order = ui.state().orders.at(-1);
    assert.equal(order.status,'draft');
    ui.click('[data-transition="confirm"]');
    assert.equal(ui.state().products.find(product => product.id === 1).stock,before - 2);
    ui.click('[data-transition="pay"]');
    assert.ok(ui.document.querySelector('#demo-dialog').textContent.includes('no money is charged'));
    ui.click('[data-action="confirm-action"]');
    assert.equal(ui.state().orders.find(item => item.id === order.id).paymentStatus,'paid');
    ui.click('[data-transition="fulfill"]');
    assert.equal(ui.state().orders.find(item => item.id === order.id).status,'fulfilled');
});

test('stock errors keep the order as a draft and display a clear error',t => {
    const ui = setup(t,'#/orders');
    ui.click('[data-action="order-create"]'); ui.fill('[name="customerId"]','1');
    ui.fill('[data-line="0"] select','11'); ui.submit('[data-form="order"]');
    const order = ui.state().orders.at(-1);
    ui.click('[data-transition="confirm"]');
    assert.equal(ui.state().orders.find(item => item.id === order.id).status,'draft');
    assert.ok(ui.document.querySelector('#demo-dialog .form-error').textContent.includes('Insufficient stock'));
});

test('appearance, quick navigation and reset controls are functional',t => {
    const ui = setup(t,'#/settings');
    ui.click('[data-theme-option="dark"]');
    assert.equal(ui.document.documentElement.dataset.theme,'dark');
    assert.equal(ui.w.localStorage.getItem('nexo-theme'),'dark');
    ui.fill('[data-form="profile"] [name="name"]','Visitor Name');
    ui.submit('[data-form="profile"]');
    assert.equal(ui.state().profile.name,'Visitor Name');
    ui.click('[data-action="command"]'); ui.fill('[data-command-query]','not-a-page');
    assert.equal(ui.document.querySelector('#command-empty').hidden,false);
    ui.click('[data-action="close-modal"]');
    ui.click('[data-action="reset-demo"]'); ui.click('[data-action="confirm-action"]');
    assert.equal(ui.state().profile.name,'Alex Morgan');
    assert.equal(ui.document.documentElement.dataset.theme,'dark');
});

test('bookmarked order details resolve and close on a static host',t => {
    const ui = setup(t,'#/orders?order=1');
    assert.ok(ui.document.querySelector('#demo-dialog').open);
    assert.ok(ui.document.querySelector('#dialog-title').textContent.startsWith('NX-'));
    ui.click('[data-action="close-modal"]');
    assert.equal(ui.w.location.hash,'#/orders');
});
