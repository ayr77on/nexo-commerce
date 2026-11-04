import '../resources/css/app.css';
import './style.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/manrope/latin-700.css';
import '@fontsource/manrope/latin-800.css';
import { WorkspaceStore } from './store.js';
import { queryOrders, ordersCsv } from './queries.js';
import { e, icon, money, iconButton } from './ui.js';
import { shell, pages, overviewPage, customersPage, productsPage, ordersPage, settingsPage } from './views.js';
import { customerForm, customerDetail, productForm, stockForm, orderForm, orderLines, orderDetail } from './forms.js';
import { mountCharts, destroyCharts, updateChartTheme } from './charts.js';

let storage = null;
try { storage = window.localStorage; } catch { /* In-memory preview when storage is unavailable. */ }
const store = new WorkspaceStore(storage);
const defaults = () => ({ search:'', status:'', payment:'', category:'', stock:'', sort:'newest' });

class DemoApp {
    constructor() {
        this.page = 'overview';
        this.period = 30;
        this.filters = defaults();
        this.pagination = 1;
        this.draftLines = [];
        this.pendingAction = null;
        this.toastTimer = null;
        this.searchTimer = null;
        this.sidebarOpen = false;
        this.lastFocus = null;
    }

    mount() {
        document.addEventListener('click', event => this.click(event));
        document.addEventListener('submit', event => this.submit(event));
        document.addEventListener('input', event => this.input(event));
        document.addEventListener('change', event => this.change(event));
        document.addEventListener('keydown', event => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); this.openCommand(); }
            if (event.key === 'Escape' && this.sidebarOpen) this.setSidebar(false);
        });
        window.addEventListener('hashchange', () => this.route(true));
        window.addEventListener('resize', () => { if (window.innerWidth > 800 && this.sidebarOpen) this.setSidebar(false); });
        this.route(false);
    }

    route(focus) {
        clearTimeout(this.searchTimer);
        this.closeModal();
        const [path,query] = window.location.hash.replace(/^#\/?/,'').split('?');
        this.page = pages.some(item => item[0] === path) ? path : 'overview';
        this.filters = defaults();
        this.pagination = 1;
        const params = new URLSearchParams(query || '');
        for (const key of Object.keys(this.filters)) if (params.has(key)) this.filters[key] = params.get(key).slice(0,200);
        this.render();
        if (this.page === 'orders' && params.has('order')) {
            try { this.openOrder(Number(params.get('order'))); } catch (error) { this.toast(error.message); }
        }
        if (focus) { document.querySelector('h1')?.focus({preventScroll:true}); window.scrollTo(0,0); }
    }

    render() {
        const active = document.activeElement;
        const filter = active?.dataset.filter;
        const selection = filter === 'search' ? active.selectionStart : null;
        destroyCharts();
        const state = store.state;
        const view = this.page === 'overview' ? overviewPage(state,this.period)
            : this.page === 'customers' ? customersPage(state,this.filters,this.pagination)
            : this.page === 'products' ? productsPage(state,this.filters,this.pagination)
            : this.page === 'orders' ? ordersPage(state,this.filters,this.pagination) : settingsPage(state);
        if (view.data?.page) this.pagination = view.data.page;
        document.querySelector('#app').innerHTML = shell(state,this.page,view.html,store.persistent);
        document.title = `${pages.find(item => item[0] === this.page)[2]} · Nexo Commerce Demo`;
        if (this.page === 'overview') mountCharts(view.data);
        this.setSidebar(false);
        if (filter) {
            const input = document.querySelector(`[data-filter="${filter}"]`);
            input?.focus({preventScroll:true});
            if (selection !== null && input?.setSelectionRange) input.setSelectionRange(selection,selection);
        }
    }

    setSidebar(open) {
        this.sidebarOpen = open;
        document.querySelector('.sidebar')?.classList.toggle('sidebar-open',open);
        const overlay = document.querySelector('.mobile-backdrop');
        if (overlay) overlay.hidden = !open;
        const trigger = document.querySelector('[data-action="open-sidebar"]');
        trigger?.setAttribute('aria-expanded',String(open));
        if (open) document.querySelector('.sidebar .nav-link')?.focus();
    }

    openModal({title,content,eyebrow = 'YOUR WORKSPACE',wide = false}) {
        this.lastFocus = document.activeElement;
        const old = document.querySelector('#demo-dialog');
        if (old?.open) old.close();
        document.querySelector('#modal-root').innerHTML = `<dialog id="demo-dialog" class="demo-dialog" aria-labelledby="dialog-title"><section class="modal${wide ? ' modal-wide' : ''}"><div class="modal-header"><div><span class="eyebrow">${e(eyebrow)}</span><h2 id="dialog-title" tabindex="-1">${e(title)}</h2></div>${iconButton('Close dialog','close-modal','x')}</div>${content}</section></dialog>`;
        const dialog = document.querySelector('#demo-dialog');
        dialog.addEventListener('click',event => { if (event.target === dialog) this.closeModal(); });
        dialog.addEventListener('close',() => {
            if (this.lastFocus?.isConnected) this.lastFocus.focus({preventScroll:true});
            const route = window.location.hash;
            if (route.includes('order=')) window.history.replaceState(null,'',window.location.pathname + window.location.search + '#/orders');
        });
        dialog.showModal();
    }

    closeModal() {
        const dialog = document.querySelector('#demo-dialog');
        if (dialog?.open) dialog.close();
        this.pendingAction = null;
    }

    confirm(title,description,label,callback) {
        this.openModal({title,eyebrow:'YOUR PERSONAL DEMO',content:`<div class="modal-body"><p class="demo-explanation">${e(description)}</p></div><div class="modal-footer"><button class="button button-secondary" data-action="close-modal">Keep exploring</button><button class="button button-primary" data-action="confirm-action">${e(label)}</button></div>`});
        this.pendingAction = callback;
    }

    showError(error,form = null) {
        const container = form?.querySelector('.form-error') || document.querySelector('#demo-dialog .form-error');
        if (container) { container.hidden = false; container.className = 'form-errors form-error'; container.textContent = error.message; container.scrollIntoView({block:'nearest'}); }
        else this.toast(error.message,true);
    }

    toast(message,error = false) {
        clearTimeout(this.toastTimer);
        document.querySelector('#toast-root').innerHTML = `<div class="toast${error ? ' toast-error' : ''}" role="status"><span>${icon(error ? 'alert' : 'check')}</span><p>${e(message)}</p>${iconButton('Dismiss notification','toast-close','x')}</div>`;
        this.toastTimer = setTimeout(() => { document.querySelector('#toast-root').innerHTML = ''; },4500);
    }

    theme(value = null) {
        const theme = value || (document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
        document.documentElement.dataset.theme = theme;
        try { storage?.setItem('nexo-theme',theme); } catch { /* Appearance works for this visit. */ }
        const themeIcon = document.querySelector('#theme-icon');
        if (themeIcon) themeIcon.innerHTML = icon(theme === 'dark' ? 'moon' : 'sun');
        document.querySelectorAll('[data-theme-option]').forEach(option => {
            const active = option.dataset.themeOption === theme;
            option.classList.toggle('selected',active); option.setAttribute('aria-pressed',String(active));
        });
        updateChartTheme();
    }

    openOrder(id) { this.openModal(orderDetail(store.state,id)); }

    openCommand() {
        this.openModal({title:'A shortcut to your workspace.',eyebrow:'QUICK NAVIGATION',content:`<div class="command-input">${icon('search')}<input type="search" data-command-query aria-label="Find a page" placeholder="Where would you like to go?"></div><div class="command-results">${pages.map(([route,glyph,label,description]) => `<a href="#/${route}" data-command-label="${e((label + ' ' + description).toLowerCase())}">${icon(glyph)}<span><strong>${label}</strong><small>${description}</small></span>${icon('arrow-right')}</a>`).join('')}<p id="command-empty" class="demo-command-empty" hidden>No matching pages. Try orders, customers, or products.</p></div>`});
    }

    alerts() {
        this.openModal({title:'A little heads-up.',eyebrow:'WORKSPACE ALERTS',content:`<div class="modal-body"><a href="#/products?stock=low" class="history-row"><div><strong>Review low-stock products</strong><p>Keep your bestsellers available.</p></div>${icon('chevron-right')}</a><a href="#/orders?status=confirmed" class="history-row"><div><strong>Orders ready to process</strong><p>Your next customer delivery.</p></div>${icon('chevron-right')}</a></div>`});
    }

    updateDraftLines() {
        const container = document.querySelector('#draft-lines');
        if (!container) return;
        container.innerHTML = orderLines(store.state,this.draftLines);
        this.updateDraftTotal();
    }

    readDraftLines() {
        this.draftLines = [...document.querySelectorAll('[data-line]')].map(row => ({productId:row.querySelector('[data-line-field="productId"]').value,quantity:row.querySelector('[data-line-field="quantity"]').value}));
    }

    updateDraftTotal() {
        let total = 0;
        document.querySelectorAll('[data-line]').forEach((row,index) => {
            const line = this.draftLines[index];
            const product = store.state.products.find(product => product.id === Number(line.productId));
            const quantity = Number.isFinite(Number(line.quantity)) ? Math.max(0,Math.min(1000,Number(line.quantity))) : 0;
            const amount = (product?.priceCents || 0) * quantity;
            total += amount;
            row.querySelector('[data-line-total]').textContent = money(amount);
        });
        const totalElement = document.querySelector('#draft-total');
        if (totalElement) totalElement.textContent = money(total);
    }

    input(event) {
        if (event.target.matches('[data-filter="search"]')) {
            clearTimeout(this.searchTimer);
            this.filters.search = event.target.value;
            this.pagination = 1;
            this.searchTimer = setTimeout(() => this.render(),200);
        }
        if (event.target.matches('[data-line-field]')) { this.readDraftLines(); this.updateDraftTotal(); }
        if (event.target.matches('[data-command-query]')) {
            const query = event.target.value.toLowerCase().trim();
            const results = [...document.querySelectorAll('[data-command-label]')];
            results.forEach(result => { result.hidden = !result.dataset.commandLabel.includes(query); });
            document.querySelector('#command-empty').hidden = results.some(result => !result.hidden);
        }
    }

    change(event) {
        if (event.target.matches('select[data-filter]')) {
            clearTimeout(this.searchTimer);
            this.filters[event.target.dataset.filter] = event.target.value;
            this.pagination = 1; this.render();
        }
        if (event.target.matches('[data-period]')) { this.period = Number(event.target.value); this.render(); }
        if (event.target.matches('[data-line-field]')) { this.readDraftLines(); this.updateDraftTotal(); }
    }

    click(event) {
        const anchor = event.target.closest('a[href^="#/"]');
        if (anchor) {
            this.closeModal();
            this.setSidebar(false);
            if (anchor.getAttribute('href') === window.location.hash) this.route(true);
            return;
        }
        const target = event.target.closest('[data-action]');
        if (!target || target.disabled) return;
        event.preventDefault();
        const id = Number(target.dataset.id);
        const state = store.state;
        try {
            switch (target.dataset.action) {
                case 'open-sidebar': this.setSidebar(true); break;
                case 'close-sidebar': this.setSidebar(false); break;
                case 'theme': this.theme(); break;
                case 'appearance': this.theme(target.dataset.themeOption); break;
                case 'command': this.openCommand(); break;
                case 'alerts': this.alerts(); break;
                case 'close-modal': this.closeModal(); break;
                case 'toast-close': document.querySelector('#toast-root').innerHTML = ''; break;
                case 'page': this.pagination = Number(target.dataset.page); this.render(); break;
                case 'customer-create': this.openModal(customerForm()); break;
                case 'customer-edit': this.openModal(customerForm(state.customers.find(customer => customer.id === id))); break;
                case 'customer-view': this.openModal(customerDetail(state,id)); break;
                case 'customer-remove': {
                    const hasHistory = state.orders.some(order => order.customerId === id);
                    this.confirm(hasHistory ? 'Archive this customer?' : 'Delete this sample customer?',hasHistory ? 'Their order history will be preserved. They will no longer be available for new orders.' : 'This removes the customer from your personal demo. Reset demo data to restore the original sample workspace.',hasHistory ? 'Archive customer' : 'Delete customer',() => { const result = store.removeCustomer(id); this.render(); this.toast(`Customer ${result}.`); });
                    break;
                }
                case 'product-create': this.openModal(productForm()); break;
                case 'product-edit': this.openModal(productForm(state.products.find(product => product.id === id))); break;
                case 'product-stock': this.openModal(stockForm(state,id)); break;
                case 'product-archive': this.confirm('Archive this product?','Past orders keep their history. You can restore the product from the Archived view.','Archive product',() => { store.archiveProduct(id); this.render(); this.toast('Product archived. Sales history preserved.'); }); break;
                case 'order-create': this.draftLines = [{productId:'',quantity:1}]; this.openModal(orderForm(state,this.draftLines)); break;
                case 'line-add': if (this.draftLines.length < 30) { this.readDraftLines(); this.draftLines.push({productId:'',quantity:1}); this.updateDraftLines(); document.querySelector('#draft-lines .order-line:last-child select')?.focus(); } break;
                case 'line-remove': if (this.draftLines.length > 1) { this.readDraftLines(); this.draftLines.splice(Number(target.dataset.index),1); this.updateDraftLines(); } break;
                case 'order-view': this.openOrder(id); break;
                case 'order-transition': {
                    const action = target.dataset.transition;
                    const apply = () => { store.actOnOrder(id,action); this.render(); this.openOrder(id); this.toast({confirm:'Order confirmed. Sample stock updated.',pay:'Sample payment recorded.',fulfill:'Order marked as fulfilled.',cancel:'Order cancelled. Sample stock returned.'}[action]); };
                    if (action === 'cancel' || action === 'pay') this.confirm(action === 'pay' ? 'Simulate this payment?' : 'Cancel this order?',action === 'pay' ? 'Record the sample order as paid. This is a simulation; no money is charged or transferred.' : 'Any deducted sample stock will be returned to your inventory.',action === 'pay' ? 'Simulate payment' : 'Cancel order',apply);
                    else apply();
                    break;
                }
                case 'confirm-action': { const action = this.pendingAction; this.closeModal(); action?.(); break; }
                case 'reset-demo': this.confirm('A fresh start?','Restore the original sample data and profile in this browser. Your current demo changes will be replaced.','Reset demo',() => { store.reset(); this.filters = defaults(); this.pagination = 1; this.render(); this.toast('Your sample workspace is ready for a fresh start.'); }); break;
                case 'export': this.export(); break;
            }
        } catch (error) { this.showError(error); }
    }

    submit(event) {
        const form = event.target.closest('form[data-form]');
        if (!form) return;
        event.preventDefault();
        const data = Object.fromEntries(new FormData(form));
        const id = Number(form.dataset.id) || null;
        try {
            switch (form.dataset.form) {
                case 'customer': store.saveCustomer(data,id); this.closeModal(); this.render(); this.toast('Customer saved to your demo workspace.'); break;
                case 'product': store.saveProduct({...data,active:new FormData(form).has('active')},id); this.closeModal(); this.render(); this.toast('Product saved successfully.'); break;
                case 'stock': store.adjustStock(id,data); this.closeModal(); this.render(); this.toast('Sample inventory updated. Adjustment recorded.'); break;
                case 'order': { this.readDraftLines(); const orderId = store.createOrder(Number(data.customerId),this.draftLines,data.notes); this.closeModal(); this.render(); this.openOrder(orderId); this.toast('Draft created. Confirm it when you are ready.'); break; }
                case 'profile': store.saveProfile(data); this.render(); this.toast('Demo profile updated.'); break;
                case 'workspace': store.saveWorkspace(data); this.render(); this.toast('Demo workspace settings saved.'); break;
            }
        } catch (error) { this.showError(error,form); }
    }

    export() {
        let orders = queryOrders(store.state,this.page === 'orders' ? this.filters : {});
        if (this.page === 'overview') {
            const end = new Date(); end.setUTCHours(24,0,0,0);
            const start = end.getTime() - this.period * 86400000;
            orders = orders.filter(order => Date.parse(order.createdAt) >= start && Date.parse(order.createdAt) < end.getTime());
        }
        const blob = new Blob([ordersCsv(store.state,orders)],{type:'text/csv;charset=utf-8'});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = url; link.download = `nexo-sample-orders-${new Date().toISOString().slice(0,10)}.csv`;
        document.body.append(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url),1000);
        this.toast('Sample orders exported as CSV.');
    }
}

new DemoApp().mount();
