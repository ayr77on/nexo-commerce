import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/manrope/latin-700.css';
import '@fontsource/manrope/latin-800.css';
import Chart from 'chart.js/auto';
import { Livewire, Alpine } from '../../vendor/livewire/livewire/dist/livewire.esm';

const getTheme = () => document.documentElement.dataset.theme || 'light';
const chartPalette = () => getTheme() === 'dark'
    ? { text: '#a3a4b5', grid: '#2d2e3a', border: '#1b1c25' }
    : { text: '#9293a3', grid: '#f0f0f5', border: '#ffffff' };
const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
Chart.defaults.font.family = 'Inter, sans-serif';
Chart.defaults.font.size = 11;
Chart.defaults.plugins.legend.display = false;

Alpine.store('ui', {
    theme: getTheme(), sidebar: false, command: false, query: '',
    toggleTheme() {
        this.theme = this.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.dataset.theme = this.theme;
        try { localStorage.setItem('nexo-theme', this.theme); } catch (_) {}
        window.dispatchEvent(new Event('nexo:theme'));
    },
});

Alpine.data('revenueChart', data => {
    let chart;
    let refresh;
    return {
        init() {
            const canvas = this.$refs.canvas;
            const context = canvas.getContext('2d');
            const gradient = context.createLinearGradient(0, 0, 0, 270);
            gradient.addColorStop(0, 'rgba(130, 84, 237, .19)');
            gradient.addColorStop(1, 'rgba(130, 84, 237, 0)');
            const palette = chartPalette();
            chart = new Chart(canvas, {
                type: 'line',
                data: { labels: data.labels, datasets: [
                    { label: 'This period', data: data.current, borderColor: '#8858ec', backgroundColor: gradient, fill: true, tension: .38, borderWidth: 2.6, pointRadius: 0, pointHoverRadius: 5, pointHoverBackgroundColor: '#8858ec', pointHoverBorderColor: '#fff', pointHoverBorderWidth: 3 },
                    { label: 'Previous period', data: data.previous, borderColor: '#c5bdd9', borderDash: [5, 5], tension: .38, borderWidth: 1.7, pointRadius: 0 },
                ] },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    animation: reducedMotion ? false : { duration: 550 },
                    interaction: { intersect: false, mode: 'index' },
                    layout: { padding: { top: 15, right: 8 } },
                    plugins: { tooltip: { backgroundColor: '#252131', padding: 12, cornerRadius: 9, displayColors: true, callbacks: { label: c => ` ${c.dataset.label}: ${money(c.parsed.y)}` } } },
                    scales: {
                        x: { border: { display: false }, grid: { display: false }, ticks: { color: palette.text, maxTicksLimit: 6, maxRotation: 0, autoSkip: true, padding: 12 } },
                        y: { beginAtZero: true, border: { display: false, dash: [3, 4] }, grid: { color: palette.grid, drawTicks: false }, ticks: { color: palette.text, maxTicksLimit: 5, padding: 12, callback: value => value >= 1000 ? '$' + (value / 1000).toFixed(1).replace('.0', '') + 'k' : '$' + value } },
                    },
                },
            });
            refresh = () => { const p = chartPalette(); chart.options.scales.x.ticks.color = p.text; chart.options.scales.y.ticks.color = p.text; chart.options.scales.y.grid.color = p.grid; chart.update('none'); };
            window.addEventListener('nexo:theme', refresh);
        },
        destroy() { window.removeEventListener('nexo:theme', refresh); chart?.destroy(); },
    };
});

Alpine.data('categoryChart', data => {
    let chart;
    let refresh;
    return {
        init() {
            chart = new Chart(this.$refs.canvas, {
                type: 'doughnut',
                data: { labels: data.labels.length ? data.labels : ['No sales yet'], datasets: [{ data: data.values.length ? data.values : [1], backgroundColor: data.values.length ? ['#8858ec', '#ae90ed', '#d2bff4', '#ede4fc'] : ['#e6e3eb'], borderWidth: 4, borderColor: chartPalette().border, borderRadius: 5, hoverOffset: 4 }] },
                options: { responsive: true, maintainAspectRatio: false, cutout: '77%', animation: reducedMotion ? false : { duration: 600 }, plugins: { tooltip: { enabled: data.values.length > 0, callbacks: { label: c => ' ' + c.label + ': ' + money(c.raw / 100) } } } },
            });
            refresh = () => { chart.data.datasets[0].borderColor = chartPalette().border; chart.update('none'); };
            window.addEventListener('nexo:theme', refresh);
        },
        destroy() { window.removeEventListener('nexo:theme', refresh); chart?.destroy(); },
    };
});

window.Livewire = Livewire;
Livewire.start();
