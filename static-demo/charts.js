import Chart from 'chart.js/auto';

const palette = () => document.documentElement.dataset.theme === 'dark' ? { text:'#aaa8bc', grid:'#2d2e3a', border:'#1b1c25' } : { text:'#797688', grid:'#f0f0f5', border:'#fff' };
const usd = value => new Intl.NumberFormat('en-US',{ style:'currency', currency:'USD', maximumFractionDigits:0 }).format(value);
const colors = ['#8858ec','#ae90ed','#d2bff4','#ede4fc','#afc5ee','#b6d7c6'];
let charts = [];

export function destroyCharts() { charts.forEach(chart => chart.destroy()); charts = []; }

export function mountCharts(data) {
    destroyCharts();
    const revenueCanvas = document.querySelector('#revenue-chart');
    if (!revenueCanvas) return;
    Chart.defaults.font.family = 'Inter, sans-serif';
    Chart.defaults.font.size = 11;
    const p = palette();
    const gradient = revenueCanvas.getContext('2d').createLinearGradient(0,0,0,270);
    gradient.addColorStop(0,'rgba(130,84,237,.19)'); gradient.addColorStop(1,'rgba(130,84,237,0)');
    charts.push(new Chart(revenueCanvas,{
        type:'line',
        data:{labels:data.chart.labels,datasets:[
            {label:'This period',data:data.chart.current,borderColor:'#8858ec',backgroundColor:gradient,fill:true,tension:.38,borderWidth:2.6,pointRadius:0,pointHoverRadius:5,pointHoverBackgroundColor:'#8858ec',pointHoverBorderColor:'#fff',pointHoverBorderWidth:3},
            {label:'Previous period',data:data.chart.previous,borderColor:'#c5bdd9',borderDash:[5,5],tension:.38,borderWidth:1.7,pointRadius:0},
        ]},
        options:{responsive:true,maintainAspectRatio:false,animation:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? false : {duration:450},interaction:{intersect:false,mode:'index'},layout:{padding:{top:15,right:8}},plugins:{legend:{display:false},tooltip:{backgroundColor:'#252131',padding:12,cornerRadius:9,callbacks:{label:c => ` ${c.dataset.label}: ${usd(c.parsed.y)}`}}},scales:{x:{border:{display:false},grid:{display:false},ticks:{color:p.text,maxTicksLimit:6,maxRotation:0,padding:12}},y:{beginAtZero:true,border:{display:false,dash:[3,4]},grid:{color:p.grid,drawTicks:false},ticks:{color:p.text,maxTicksLimit:5,padding:12,callback:value => value >= 1000 ? '$' + (value / 1000).toFixed(1).replace('.0','') + 'k' : '$' + value}}}},
    }));
    const categoryCanvas = document.querySelector('#category-chart');
    if (categoryCanvas) charts.push(new Chart(categoryCanvas,{
        type:'doughnut',
        data:{labels:data.categories.length ? data.categories.map(category => category.name) : ['No paid sales'],datasets:[{data:data.categories.length ? data.categories.map(category => category.revenue) : [1],backgroundColor:data.categories.length ? colors : ['#e6e3eb'],borderWidth:4,borderColor:p.border,borderRadius:5,hoverOffset:4}]},
        options:{responsive:true,maintainAspectRatio:false,cutout:'77%',animation:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? false : {duration:450},plugins:{legend:{display:false},tooltip:{enabled:data.categories.length > 0,callbacks:{label:c => ` ${c.label}: ${usd(c.raw / 100)}`}}}},
    }));
}

export function updateChartTheme() {
    const p = palette();
    for (const chart of charts) {
        if (chart.config.type === 'line') { chart.options.scales.x.ticks.color = p.text; chart.options.scales.y.ticks.color = p.text; chart.options.scales.y.grid.color = p.grid; }
        else chart.data.datasets[0].borderColor = p.border;
        chart.update('none');
    }
}

export { colors };
