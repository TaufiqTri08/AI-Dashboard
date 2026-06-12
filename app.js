import { CONFIG } from './config.js';
import { detectAnomaly } from './anomalyDetector.js';
import { generateStory, generateTitle } from './storyEngine.js';
import { getAiInsight, getAiAnomalies } from './aiInsight.js';

let globalAnomalyData = null;

// Orchestration saat DOM siap
document.addEventListener("DOMContentLoaded", () => {
    initTabs();
    initAnomalyTabs();
    loadDataset();
    initChatbox();
    initFilters();
    initSidebarToggle();
});

function initSidebarToggle() {
    const sidebar = document.getElementById('appSidebar');
    const toggleBtn = document.getElementById('sidebarToggleBtn');
    const toggleIcon = document.getElementById('sidebarToggleIcon');

    if(toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            
            // Ubah icon SVG
            if(sidebar.classList.contains('collapsed')) {
                toggleIcon.innerHTML = '<path d="M9 18l6-6-6-6" />'; // Chevron Right
            } else {
                toggleIcon.innerHTML = '<path d="M15 18l-6-6 6-6" />'; // Chevron Left
            }

            // Memicu event resize agar grafik D3.js menyesuaikan ukuran baru
            setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
            }, 400); // 400ms menunggu animasi CSS selesai
        });
    }
}

function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');

            // Gulir kembali ke atas saat pindah tab
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
}

function initAnomalyTabs() {
    const tabs = document.querySelectorAll('#anomalyTabs .alert-tab');
    const panes = document.querySelectorAll('.anomaly-pane');
    const btnNarasi = document.getElementById('btnTriggerAi');

    const switchTab = (targetId) => {
        tabs.forEach(t => t.classList.remove('active'));
        panes.forEach(p => p.style.display = 'none');

        const activeTab = document.querySelector(`#anomalyTabs .alert-tab[data-tab="${targetId}"]`);
        if (activeTab) activeTab.classList.add('active');
        const activePane = document.getElementById(targetId);
        if (activePane) activePane.style.display = 'block';

        if (targetId === 'tab-narasi') {
            loadNarasiAi();
        }
    };

    tabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.getAttribute('data-tab')));
    });

    if (btnNarasi) {
        btnNarasi.addEventListener('click', () => switchTab('tab-narasi'));
    }
}

let isNarasiLoaded = false;
async function loadNarasiAi() {
    if (isNarasiLoaded) return;

    const narasiContainer = document.getElementById('narasiContent');
    if (!narasiContainer) return;

    narasiContainer.innerHTML = '<p style="color:var(--text-muted);"><em>🤖 AI sedang merangkum narasi anomali...</em></p>';

    let dataSummary = "Dataset belum dimuat.";
    if (window.globalRawData && window.globalRawData.length > 0) {
        const data = window.globalRawData;
        const tSales = d3.sum(data, d => d.Sales);
        const tProfit = d3.sum(data, d => d.Profit);
        dataSummary = `Total baris data: ${data.length}, Total Sales: $${tSales.toFixed(0)}, Total Profit: $${tProfit.toFixed(0)}.`;
    }

    const aiResponse = await getAiInsight("Tolong berikan narasi lengkap tentang anomali yang terjadi pada data ini. Jangan berikan teks lain selain jawaban. Format ke dalam paragraf yang mudah dibaca.", globalAnomalyData, dataSummary);

    let aiText = typeof aiResponse === 'string' ? aiResponse : aiResponse.narrative;

    if (aiResponse && aiResponse.headline) {
        const titleEl = document.getElementById('storyConflictTitle');
        if (titleEl) titleEl.innerHTML = `<span style="color: #ea580c;">🤖 AI Insight:</span> ${aiResponse.headline}`;
    }

    if (aiText) {
        narasiContainer.innerHTML = `<p style="color:var(--text-color); line-height:1.6; font-size:15px;">${aiText}</p>`;
    }
    isNarasiLoaded = true;
}

async function loadDataset() {
    try {
        // d3.csv secara otomatis mem-parsing file CSV dengan delimiter koma
        const data = await d3.csv(CONFIG.DATA_PATH);

        // Parsing angka
        data.forEach(d => {
            d.Sales = +d.Sales || 0;
            d.Profit = +d.Profit || 0;
            d.Qty = +d.Qty || 0;
        });

        // Menyimpan data global agar bisa diagregasi ulang oleh AI
        window.globalRawData = data;

        populateFilters(data);
        applyFilters();

    } catch (error) {
        console.error("Gagal memuat dataset CSV:", error);
        document.getElementById('pageTitleText').innerText = "Data gagal dimuat. Pastikan menggunakan Local Server.";
        document.getElementById('storySetupText').innerHTML = "<span style='color:var(--accent-red)'>CORS error atau file tidak ditemukan. Jalankan file HTML ini menggunakan Live Server.</span>";
    }
}

function processData(data) {
    const formatCurrency = d3.format("$,.0f");

    // Hitung KPI
    const totalSales = d3.sum(data, d => d.Sales);
    const totalProfit = d3.sum(data, d => d.Profit);
    const totalQty = d3.sum(data, d => d.Qty);
    const profitMargin = totalSales > 0 ? (totalProfit / totalSales) : 0;
    const totalOrders = data.length; // Estimasi berdasar row data

    // Deteksi Anomali
    globalAnomalyData = detectAnomaly(data);

    // Reset status Narasi AI karena data berubah
    isNarasiLoaded = false;
    const narasiContainer = document.getElementById('narasiContent');
    if (narasiContainer) {
        narasiContainer.innerHTML = '<p style="color:var(--text-muted); font-style:italic;">Klik "Narasi AI" untuk penjelasan dari LLM terkait data baru.</p>';
    }

    // Generate Cerita & Judul
    document.getElementById('pageTitleText').innerText = generateTitle(globalAnomalyData);
    document.getElementById('storySetupText').innerText = generateStory(totalSales, totalProfit, profitMargin, globalAnomalyData);

    // Update KPI UI
    document.getElementById('kpiSales').innerText = formatCurrency(totalSales);
    document.getElementById('kpiProfit').innerText = formatCurrency(totalProfit);

    const marginEl = document.getElementById('kpiMargin');
    marginEl.innerText = (profitMargin * 100).toFixed(2) + "%";
    marginEl.className = `kpi-value ${profitMargin >= 0 ? 'positive' : 'negative'}`;

    document.getElementById('kpiOrders').innerText = d3.format(",")(totalOrders);
    const kpiQtyEl = document.getElementById('kpiQty');
    if (kpiQtyEl) kpiQtyEl.innerText = d3.format(",")(totalQty);

    // Update Conflict Zone
    const alertWrapper = document.querySelector('.alert-wrapper');
    const badgeCritical = document.getElementById('badgeCritical');
    const badgeWarning = document.getElementById('badgeWarning');

    if (globalAnomalyData && globalAnomalyData.hasAnomaly) {
        document.getElementById('storyConflictTitle').innerText = `Anomali Terdeteksi: ${globalAnomalyData.type}`;
        const storyConflictText = document.getElementById('storyConflictText');
        if (storyConflictText) storyConflictText.innerText = globalAnomalyData.description;

        if (badgeCritical) badgeCritical.style.display = 'inline-block';
        if (badgeWarning) badgeWarning.style.display = 'inline-block';
    } else {
        document.getElementById('storyConflictTitle').innerText = "Status: Normal";
        const storyConflictText = document.getElementById('storyConflictText');
        if (storyConflictText) storyConflictText.innerText = "Tidak ditemukan anomali signifikan pada struktur biaya dan keuntungan.";

        if (alertWrapper) {
            alertWrapper.style.border = "1px solid var(--accent-green)";
            alertWrapper.style.backgroundColor = "#f0fdf4";
        }
        const alertSpan = document.querySelector('.alert-panel-left span');
        if (alertSpan) alertSpan.innerText = "✅";
        if (badgeCritical) badgeCritical.style.display = 'none';
        if (badgeWarning) badgeWarning.style.display = 'none';
    }

    // Siapkan Data untuk Grafik
    const salesByCategory = Array.from(
        d3.rollup(data, v => d3.sum(v, d => d.Sales), d => d.Category),
        ([key, value]) => ({ key, value })
    ).sort((a, b) => b.value - a.value);

    const salesBySegment = Array.from(
        d3.rollup(data, v => d3.sum(v, d => d.Sales), d => d.Segment),
        ([key, value]) => ({ key, value })
    ).sort((a, b) => b.value - a.value);

    const profitBySubcat = Array.from(
        d3.rollup(data, v => d3.sum(v, d => d.Profit), d => d.SubCategory),
        ([key, value]) => ({ key, value })
    ).sort((a, b) => b.value - a.value);

    const scatterData = Array.from(
        d3.rollup(data,
            v => ({ sales: d3.sum(v, d => d.Sales), profit: d3.sum(v, d => d.Profit) }),
            d => d.City || 'Unknown City'
        ),
        ([key, value]) => ({ key, sales: value.sales, profit: value.profit })
    );

    const formatMonthTrend = d3.timeFormat("%Y-%m");
    const trendData = Array.from(
        d3.rollup(data, v => d3.sum(v, d => d.Sales), d => formatMonthTrend(new Date(d.OrderDate))),
        ([key, value]) => ({ key, value })
    ).sort((a, b) => a.key.localeCompare(b.key));

    // Isi Summary Table
    populateSummaryTable(data, salesByCategory, formatCurrency);

    // Render Grafik D3
    if (trendData.length > 0) {
        drawLineChart("#chart-trend", trendData, formatCurrency);
        const maxTrend = trendData.reduce((a, b) => a.value > b.value ? a : b);
        const minTrend = trendData.reduce((a, b) => a.value < b.value ? a : b);
        document.getElementById('desc-trend').innerHTML = `💡 Penjualan memuncak pada <strong>${maxTrend.key}</strong> (${formatCurrency(maxTrend.value)}) dan terendah pada <strong>${minTrend.key}</strong> (${formatCurrency(minTrend.value)}).`;
    }

    if (salesByCategory.length > 0) {
        const topCat = salesByCategory[0];
        document.getElementById('desc-sales').innerHTML = `💡 Kategori <strong>${topCat.key}</strong> memimpin.`;
    }

    if (salesBySegment.length > 0) {
        const topSeg = salesBySegment[0];
        const segEl = document.getElementById('desc-segment');
        if(segEl) segEl.innerHTML = `💡 Segmen <strong>${topSeg.key}</strong> paling besar.`;
    }

    if (profitBySubcat.length > 0) {
        const topProf = profitBySubcat[0];
        const worstProf = profitBySubcat[profitBySubcat.length - 1];
        let profitText = `💡 <strong>${topProf.key}</strong> adalah kontributor profit tertinggi. `;
        if (worstProf.value < 0) {
            profitText += `<span style="color:var(--accent-red)">Waspadai <strong>${worstProf.key}</strong> dengan kerugian ${formatCurrency(worstProf.value)}.</span>`;
        }
        document.getElementById('desc-profit').innerHTML = profitText;
    }

    if (scatterData.length > 0) {
        const lossCities = scatterData.filter(d => d.profit < 0);
        const topCity = scatterData.reduce((a, b) => a.profit > b.profit ? a : b);
        let scatterText = `💡 <strong>${topCity.key}</strong> memimpin profitabilitas. `;
        if (lossCities.length > 0) {
            const worstCity = lossCities.reduce((a, b) => a.profit < b.profit ? a : b);
            scatterText += `Terdapat ${lossCities.length} kota merugi, dengan kerugian terdalam di <strong>${worstCity.key}</strong>.`;
        }
        document.getElementById('desc-scatter').innerHTML = scatterText;
    }

    drawDonutChart("#chart-sales", salesByCategory, formatCurrency);
    drawDonutChart("#chart-segment", salesBySegment, formatCurrency);
    drawVerticalBarChart("#chart-profit", profitBySubcat.slice(0, 15), formatCurrency); // top 15
    drawScatterPlot("#chart-scatter", scatterData, formatCurrency);

    // Render Anomalies
    const listContainer = document.getElementById('anomalyList');
    if (listContainer) {
        if (globalAnomalyData.anomaliesList && globalAnomalyData.anomaliesList.length > 0) {
            listContainer.innerHTML = '';
            globalAnomalyData.anomaliesList.forEach(ano => {
                const li = document.createElement('li');

                // Add red dot indicator for critical, orange for warning (based on title)
                const isCritical = ano.title.includes("Turun Drastis") || ano.title.includes("di bawah rata-rata");
                const dotColor = isCritical ? "var(--accent-red)" : "#f97316";

                li.innerHTML = `
                    <div style="display:flex; gap:10px; align-items:flex-start;">
                        <span style="color:${dotColor}; font-size:1.2rem; line-height:1;">&bull;</span>
                        <div>
                            <div style="font-weight:600; color:var(--navy-dark);">${ano.title}</div>
                            <div style="color:var(--text-muted); font-size:0.9rem; font-family:monospace; margin-top:4px;">${ano.description}</div>
                        </div>
                    </div>
                `;
                listContainer.appendChild(li);
            });

            // Update badge counts
            const criticalCount = globalAnomalyData.anomaliesList.filter(a => a.title.includes("Turun Drastis") || a.title.includes("di bawah rata-rata")).length;
            const warningCount = globalAnomalyData.anomaliesList.length - criticalCount;

            const badgeCritical = document.getElementById('badgeCritical');
            const badgeWarning = document.getElementById('badgeWarning');
            if (badgeCritical) {
                badgeCritical.innerText = `${criticalCount} Kritis`;
                badgeCritical.style.display = criticalCount > 0 ? 'inline-block' : 'none';
            }
            if (badgeWarning) {
                badgeWarning.innerText = `${warningCount} Peringatan`;
                badgeWarning.style.display = warningCount > 0 ? 'inline-block' : 'none';
            }
        } else {
            listContainer.innerHTML = '<li>Tidak ada anomali signifikan yang terdeteksi.</li>';
        }
    }
}

function populateSummaryTable(data, salesByCategory, formatCurrency) {
    const tbody = document.querySelector("#summaryTable tbody");
    tbody.innerHTML = "";
    const profitByCategory = Array.from(
        d3.rollup(data, v => d3.sum(v, d => d.Profit), d => d.Category),
        ([key, value]) => ({ key, value })
    );

    salesByCategory.forEach(s => {
        const p = profitByCategory.find(p => p.key === s.key);
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${s.key}</td>
            <td>${formatCurrency(s.value)}</td>
            <td style="color: ${p.value < 0 ? 'var(--accent-red)' : 'var(--accent-green)'}; font-weight:600;">${formatCurrency(p.value)}</td>
        `;
        tbody.appendChild(tr);
    });
}

// === FUNGSI FILTER ===
function initFilters() {
    document.getElementById('filterYear').addEventListener('change', applyFilters);
    document.getElementById('filterCategory').addEventListener('change', applyFilters);
    document.getElementById('filterRegion').addEventListener('change', applyFilters);

    document.getElementById('btnResetFilter').addEventListener('click', () => {
        document.getElementById('filterYear').value = 'all';
        document.getElementById('filterCategory').value = 'all';
        document.getElementById('filterRegion').value = 'all';
        applyFilters();
    });
}

function populateFilters(data) {
    const years = new Set();
    const categories = new Set();
    const regions = new Set();

    data.forEach(d => {
        if (d.OrderDate) {
            const year = new Date(d.OrderDate).getFullYear();
            if (!isNaN(year)) years.add(year);
        }
        if (d.Category) categories.add(d.Category);
        if (d.CountryRegion) regions.add(d.CountryRegion);
    });

    const yearSelect = document.getElementById('filterYear');
    Array.from(years).sort().forEach(y => {
        const opt = document.createElement('option');
        opt.value = y;
        opt.innerText = y;
        yearSelect.appendChild(opt);
    });

    const catSelect = document.getElementById('filterCategory');
    Array.from(categories).sort().forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.innerText = c;
        catSelect.appendChild(opt);
    });

    const regSelect = document.getElementById('filterRegion');
    Array.from(regions).sort().forEach(r => {
        const opt = document.createElement('option');
        opt.value = r;
        opt.innerText = r;
        regSelect.appendChild(opt);
    });
}

function applyFilters() {
    if (!window.globalRawData) return;

    const yearVal = document.getElementById('filterYear').value;
    const catVal = document.getElementById('filterCategory').value;
    const regVal = document.getElementById('filterRegion').value;

    let filtered = window.globalRawData;

    if (yearVal !== 'all') {
        filtered = filtered.filter(d => new Date(d.OrderDate).getFullYear().toString() === yearVal);
    }
    if (catVal !== 'all') {
        filtered = filtered.filter(d => d.Category === catVal);
    }
    if (regVal !== 'all') {
        filtered = filtered.filter(d => d.CountryRegion === regVal);
    }

    processData(filtered);
}

function initChatbox() {
    const btnAsk = document.getElementById('btnAskAi');
    const inputField = document.getElementById('aiInput');
    const chatbox = document.getElementById('aiChatbox');

    const handleAsk = async (forceQuery = null) => {
        const query = forceQuery || inputField.value.trim();
        if (!query) return;

        // Tampilkan prompt user
        chatbox.innerHTML += `<p style="margin-top:10px; color: var(--accent-blue);"><strong>Anda:</strong> ${query}</p>`;
        inputField.value = '';
        btnAsk.disabled = true;
        btnAsk.innerHTML = "Memproses...";

        // Tambahkan placeholder loading
        const loadingId = "load-" + Date.now();
        chatbox.innerHTML += `<p id="${loadingId}" style="margin-top:10px; color: var(--text-muted);"><em>AI sedang berpikir...</em></p>`;
        chatbox.scrollTop = chatbox.scrollHeight;

        // Sembunyikan grafik dinamis lama saat ada prompt baru
        const dynamicContainer = document.getElementById('dynamic-chart-container');
        if (dynamicContainer) dynamicContainer.style.display = 'none';

        // Buat Ringkasan Data
        let dataSummary = "Dataset belum dimuat.";
        if (window.globalRawData && window.globalRawData.length > 0) {
            const data = window.globalRawData;
            const tSales = d3.sum(data, d => d.Sales);
            const tProfit = d3.sum(data, d => d.Profit);
            const tQty = d3.sum(data, d => d.Qty);
            const topCat = Array.from(d3.rollup(data, v => d3.sum(v, d => d.Sales), d => d.Category)).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Tidak diketahui';
            dataSummary = `Data terfilter. Total Sales: $${tSales.toFixed(0)}, Total Profit: $${tProfit.toFixed(0)}, Qty: ${tQty}. Kategori Dominan: ${topCat}.`;
        }

        // Fetch dari LLM via aiInsight.js
        const aiResponse = await getAiInsight(query, globalAnomalyData, dataSummary);

        // Hapus loading, tampilkan response
        document.getElementById(loadingId).remove();

        let aiText = typeof aiResponse === 'string' ? aiResponse : aiResponse.narrative;
        if (!aiText) aiText = "Terjadi kesalahan saat memproses respons AI.";

        chatbox.innerHTML += `<p style="margin-top:10px; color: var(--navy-dark);"><strong>AI:</strong> ${aiText}</p>`;
        chatbox.scrollTop = chatbox.scrollHeight;

        // Eksekusi chart command jika ada
        if (typeof aiResponse === 'object' && aiResponse.chart_command && aiResponse.chart_command.type && aiResponse.chart_command.type !== 'none') {
            executeChartCommand(aiResponse.chart_command);
        }

        btnAsk.disabled = false;
        btnAsk.innerHTML = "Minta Insight &rarr;";
    };

    btnAsk.addEventListener('click', () => handleAsk());
    inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAsk();
    });

    // Handle Quick Prompts
    const quickBtns = document.querySelectorAll('.quick-prompt-btn');
    quickBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const promptText = btn.innerText;
            handleAsk(promptText);
        });
    });
}

// === FUNGSI UTILITAS D3 CHART ===

function executeChartCommand(command) {
    if (!window.globalRawData) return;

    const container = document.getElementById('dynamic-chart-container');
    const titleEl = document.getElementById('dynamic-chart-title');
    container.style.display = 'block';
    titleEl.innerText = command.title || "Visualisasi Dinamis";

    document.getElementById('dynamic-chart-area').innerHTML = ''; // bersihkan chart lama

    let groupedData = [];
    const data = window.globalRawData;

    const formatMonth = d3.timeFormat("%Y-%m");
    const formatQuarter = d => {
        const date = new Date(d);
        const q = Math.floor(date.getMonth() / 3) + 1;
        return `${date.getFullYear()}-Q${q}`;
    };
    const formatYear = d3.timeFormat("%Y");

    const yMetric = command.y_axis === 'profit' ? d => d.Profit : d => d.Sales;

    // Khusus untuk scatter plot
    if (command.type === 'scatter') {
        const xMetric = command.x_axis === 'discount' ? d => d.Discount : (command.x_axis === 'profit' ? d => d.Profit : d => d.Sales);
        const yMetricSc = command.y_axis === 'profit' ? d => d.Profit : (command.y_axis === 'discount' ? d => d.Discount : d => d.Sales);

        const scatterData = Array.from(
            d3.rollup(data,
                v => ({ x: d3.sum(v, xMetric), y: d3.sum(v, yMetricSc) }),
                d => d.City || 'Unknown City'
            ),
            ([key, value]) => ({ key, x: value.x, y: value.y })
        );
        drawDynamicScatterPlot("#dynamic-chart-area", scatterData, command.x_axis, command.y_axis, d3.format("$,.0f"));
        container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
    }

    // Grouping untuk Line/Bar
    if (command.x_axis === 'month') {
        groupedData = Array.from(d3.rollup(data, v => d3.sum(v, yMetric), d => formatMonth(new Date(d.OrderDate))), ([key, value]) => ({ key, value })).sort((a, b) => a.key.localeCompare(b.key));
    } else if (command.x_axis === 'quarter') {
        groupedData = Array.from(d3.rollup(data, v => d3.sum(v, yMetric), d => formatQuarter(d.OrderDate)), ([key, value]) => ({ key, value })).sort((a, b) => a.key.localeCompare(b.key));
    } else if (command.x_axis === 'year') {
        groupedData = Array.from(d3.rollup(data, v => d3.sum(v, yMetric), d => formatYear(new Date(d.OrderDate))), ([key, value]) => ({ key, value })).sort((a, b) => a.key.localeCompare(b.key));
    } else if (command.x_axis === 'category') {
        groupedData = Array.from(d3.rollup(data, v => d3.sum(v, yMetric), d => d.Category), ([key, value]) => ({ key, value })).sort((a, b) => b.value - a.value);
    } else if (command.x_axis === 'subcategory') {
        groupedData = Array.from(d3.rollup(data, v => d3.sum(v, yMetric), d => d.SubCategory), ([key, value]) => ({ key, value })).sort((a, b) => b.value - a.value).slice(0, 10);
    } else if (command.x_axis === 'region' || command.x_axis === 'country') {
        groupedData = Array.from(d3.rollup(data, v => d3.sum(v, yMetric), d => d.CountryRegion), ([key, value]) => ({ key, value })).sort((a, b) => b.value - a.value).slice(0, 10);
    } else {
        titleEl.innerText += ` (Error: x_axis '${command.x_axis}' tidak didukung)`;
        return;
    }

    const formatCurrency = d3.format("$,.0f");

    if (command.type === 'line' || command.x_axis === 'month' || command.x_axis === 'quarter' || command.x_axis === 'year') {
        drawLineChart("#dynamic-chart-area", groupedData, formatCurrency);
    } else {
        drawVerticalBarChart("#dynamic-chart-area", groupedData, formatCurrency);
    }

    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function drawLineChart(selector, data, formatCurrency) {
    const container = document.querySelector(selector);
    container.innerHTML = "";
    // Line chart implementation
    const width = container.clientWidth;
    const height = 300;
    const margin = { top: 20, right: 30, bottom: 50, left: 60 };

    const svg = d3.select(selector)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scalePoint()
        .domain(data.map(d => d.key))
        .range([0, width - margin.left - margin.right])
        .padding(0.5);

    svg.append("g")
        .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "translate(-10,0)rotate(-45)")
        .style("text-anchor", "end")
        .style("font-family", "Inter");

    const yMin = Math.min(0, d3.min(data, d => d.value));
    const y = d3.scaleLinear()
        .domain([yMin, d3.max(data, d => d.value) * 1.1])
        .range([height - margin.top - margin.bottom, 0]);

    svg.append("g")
        .call(d3.axisLeft(y).tickFormat(d3.format(".2s")))
        .selectAll("text").style("font-family", "Inter");

    svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "var(--accent-blue)")
        .attr("stroke-width", 3)
        .attr("d", d3.line()
            .x(d => x(d.key))
            .y(d => y(d.value))
            .curve(d3.curveMonotoneX)
        );

    // Calculate Trendline (Least Squares)
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    data.forEach((d, i) => {
        sumX += i;
        sumY += d.value;
        sumXY += i * d.value;
        sumX2 += i * i;
    });
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const startTrendY = intercept;
    const endTrendY = slope * (n - 1) + intercept;

    svg.append("line")
        .attr("x1", x(data[0].key))
        .attr("y1", y(startTrendY))
        .attr("x2", x(data[n-1].key))
        .attr("y2", y(endTrendY))
        .attr("stroke", "rgba(255,255,255,0.4)")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "6,4");

    // Min & Max Indicators
    const maxVal = d3.max(data, d => d.value);
    const minVal = d3.min(data, d => d.value);

    svg.selectAll("myCircles")
        .data(data)
        .join("circle")
        .attr("fill", d => {
            if (d.value === maxVal) return "var(--accent-green)";
            if (d.value === minVal) return "var(--accent-red)";
            return "var(--navy-dark)";
        })
        .attr("stroke", "white")
        .attr("stroke-width", 2)
        .attr("cx", d => x(d.key))
        .attr("cy", d => y(d.value))
        .attr("r", d => (d.value === maxVal || d.value === minVal) ? 7 : 5)
        .on("mouseover", function (event, d) {
            tooltip.transition().duration(200).style("opacity", .9);
            
            let labelText = d.key + "<br/>" + formatCurrency(d.value);
            if (d.value === maxVal) labelText += "<br/><span style='color:#10b981;font-weight:bold'>Titik Tertinggi</span>";
            if (d.value === minVal) labelText += "<br/><span style='color:#ef4444;font-weight:bold'>Titik Terendah</span>";
            
            tooltip.html(labelText)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
            d3.select(this).attr("r", 9);
        })
        .on("mouseout", function (event, d) {
            tooltip.transition().duration(500).style("opacity", 0);
            d3.select(this).attr("r", (d.value === maxVal || d.value === minVal) ? 7 : 5);
        });
}

const tooltip = d3.select("body").append("div").attr("class", "tooltip");

function drawDonutChart(selector, data, formatCurrency) {
    document.querySelector(selector).innerHTML = "";
    if (!data || data.length === 0) return;

    const container = document.querySelector(selector);
    const width = container.clientWidth;
    const height = container.clientHeight || 350;
    const margin = 20;

    const radius = Math.min(width, height - 40) / 2 - margin;

    const svg = d3.select(selector)
      .append("svg")
        .attr("width", width)
        .attr("height", height - 40)
      .append("g")
        .attr("transform", `translate(${width/2},${(height-40)/2})`);

    const color = d3.scaleOrdinal()
      .domain(data.map(d => d.key))
      .range(["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#0ea5e9"]);

    const pie = d3.pie()
      .value(d => d.value)
      .sort(null);

    const data_ready = pie(data);

    const arc = d3.arc()
      .innerRadius(radius * 0.5)         // This is the size of the donut hole
      .outerRadius(radius * 0.8);

    const arcHover = d3.arc()
      .innerRadius(radius * 0.5)
      .outerRadius(radius * 0.9);

    svg
      .selectAll('allSlices')
      .data(data_ready)
      .join('path')
      .attr('d', arc)
      .attr('fill', d => color(d.data.key))
      .attr("stroke", "var(--bg-main)")
      .style("stroke-width", "2px")
      .style("opacity", 0.8)
      .on("mouseover", function(event, d) {
          d3.select(this).transition().duration(200).attr("d", arcHover).style("opacity", 1);
          tooltip.transition().duration(200).style("opacity", .9);
          tooltip.html(`${d.data.key}<br/>${formatCurrency(d.data.value)}`)
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function(event, d) {
          d3.select(this).transition().duration(500).attr("d", arc).style("opacity", 0.8);
          tooltip.transition().duration(500).style("opacity", 0);
      });

    // Menambahkan Keterangan Warna (Legend)
    const legendContainer = d3.select(selector)
        .append("div")
        .style("display", "flex")
        .style("justify-content", "center")
        .style("flex-wrap", "wrap")
        .style("gap", "15px")
        .style("width", "100%")
        .style("margin-top", "10px");

    const legends = legendContainer.selectAll(".legend-item")
        .data(data)
        .enter()
        .append("div")
        .style("display", "flex")
        .style("align-items", "center")
        .style("gap", "6px");

    legends.append("div")
        .style("width", "12px")
        .style("height", "12px")
        .style("border-radius", "50%")
        .style("background-color", d => color(d.key));

    legends.append("span")
        .text(d => d.key)
        .style("font-size", "12px")
        .style("font-weight", "500")
        .style("color", "var(--text-main)");
}

function drawHorizontalBarChart(selector, data, color, formatCurrency) {
    document.querySelector(selector).innerHTML = "";
    const container = document.querySelector(selector);
    const width = container.clientWidth;
    const height = container.clientHeight;
    const margin = { top: 20, right: 30, bottom: 40, left: 90 };

    const svg = d3.select(selector)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.value)])
        .range([0, width - margin.left - margin.right]);

    svg.append("g")
        .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
        .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format(".2s")))
        .selectAll("text").style("font-family", "Inter").style("color", "var(--text-muted)");

    const y = d3.scaleBand()
        .range([0, height - margin.top - margin.bottom])
        .domain(data.map(d => d.key))
        .padding(.2);

    svg.append("g")
        .call(d3.axisLeft(y))
        .selectAll("text").style("font-family", "Inter").style("font-size", "12px").style("color", "var(--navy-dark)");

    svg.selectAll("myRect")
        .data(data)
        .join("rect")
        .attr("x", x(0))
        .attr("y", d => y(d.key))
        .attr("width", d => x(d.value))
        .attr("height", y.bandwidth())
        .attr("fill", color)
        .attr("rx", 4)
        .on("mouseover", function (event, d) {
            tooltip.transition().duration(200).style("opacity", .9);
            tooltip.html(d.key + "<br/>" + formatCurrency(d.value))
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
            d3.select(this).style("opacity", 0.8);
        })
        .on("mouseout", function () {
            tooltip.transition().duration(500).style("opacity", 0);
            d3.select(this).style("opacity", 1);
        });
}

function drawVerticalBarChart(selector, data, formatCurrency) {
    document.querySelector(selector).innerHTML = "";
    const container = document.querySelector(selector);
    const width = container.clientWidth;
    const height = container.clientHeight;
    const margin = { top: 20, right: 20, bottom: 80, left: 60 };

    const svg = d3.select(selector)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
        .range([0, width - margin.left - margin.right])
        .domain(data.map(d => d.key))
        .padding(0.2);

    svg.append("g")
        .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "translate(-10,0)rotate(-45)")
        .style("text-anchor", "end")
        .style("font-family", "Inter");

    const y = d3.scaleLinear()
        .domain([d3.min(data, d => d.value) < 0 ? d3.min(data, d => d.value) * 1.1 : 0, d3.max(data, d => d.value)])
        .range([height - margin.top - margin.bottom, 0]);

    svg.append("g")
        .call(d3.axisLeft(y).tickFormat(d3.format(".2s")))
        .selectAll("text").style("font-family", "Inter");

    if (d3.min(data, d => d.value) < 0) {
        svg.append("line")
            .attr("x1", 0)
            .attr("x2", width - margin.left - margin.right)
            .attr("y1", y(0))
            .attr("y2", y(0))
            .attr("stroke", "#cbd5e1")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "4,4");
    }

    svg.selectAll("mybar")
        .data(data)
        .join("rect")
        .attr("x", d => x(d.key))
        .attr("y", d => y(Math.max(0, d.value)))
        .attr("width", x.bandwidth())
        .attr("height", d => Math.abs(y(d.value) - y(0)))
        .attr("fill", d => d.value < 0 ? CONFIG.UI.NEGATIVE_COLOR : CONFIG.UI.NEUTRAL_COLOR)
        .attr("rx", 4)
        .on("mouseover", function (event, d) {
            tooltip.transition().duration(200).style("opacity", .9);
            tooltip.html(d.key + "<br/>" + formatCurrency(d.value))
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
            d3.select(this).style("opacity", 0.8);
        })
        .on("mouseout", function () {
            tooltip.transition().duration(500).style("opacity", 0);
            d3.select(this).style("opacity", 1);
        });
}

function drawScatterPlot(selector, data, formatCurrency) {
    document.querySelector(selector).innerHTML = "";
    const container = document.querySelector(selector);
    const width = container.clientWidth;
    const height = container.clientHeight || 400;
    const margin = { top: 20, right: 30, bottom: 50, left: 70 };

    const svg = d3.select(selector)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.sales) * 1.1])
        .range([0, width - margin.left - margin.right]);

    svg.append("g")
        .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
        .call(d3.axisBottom(x).ticks(6).tickFormat(d3.format(".2s")))
        .selectAll("text").style("font-family", "Inter");

    const yMin = Math.min(0, d3.min(data, d => d.profit));
    const yMax = d3.max(data, d => d.profit);
    const y = d3.scaleLinear()
        .domain([yMin * 1.1, yMax * 1.1])
        .range([height - margin.top - margin.bottom, 0]);

    svg.append("g")
        .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format(".2s")))
        .selectAll("text").style("font-family", "Inter");

    // Add zero line for profit
    if (yMin < 0) {
        svg.append("line")
            .attr("x1", 0)
            .attr("x2", width - margin.left - margin.right)
            .attr("y1", y(0))
            .attr("y2", y(0))
            .attr("stroke", "#cbd5e1")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "4,4");
    }

    // X Axis Label
    svg.append("text")
        .attr("text-anchor", "end")
        .attr("x", width - margin.left - margin.right)
        .attr("y", height - margin.top - 10)
        .style("font-family", "Inter")
        .style("font-size", "12px")
        .style("fill", "var(--text-muted)")
        .text("Total Sales ($)");

    // Y Axis Label
    svg.append("text")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-90)")
        .attr("y", -50)
        .attr("x", 0)
        .style("font-family", "Inter")
        .style("font-size", "12px")
        .style("fill", "var(--text-muted)")
        .text("Total Profit ($)");

    svg.append('g')
        .selectAll("dot")
        .data(data)
        .join("circle")
        .attr("cx", d => x(d.sales))
        .attr("cy", d => y(d.profit))
        .attr("r", 7)
        .style("fill", d => d.profit < 0 ? "var(--accent-red)" : "var(--accent-blue)")
        .style("opacity", 0.7)
        .style("stroke", "white")
        .on("mouseover", function (event, d) {
            tooltip.transition().duration(200).style("opacity", .9);
            tooltip.html(`<strong>${d.key}</strong><br/>Sales: ${formatCurrency(d.sales)}<br/>Profit: ${formatCurrency(d.profit)}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
            d3.select(this).style("opacity", 1).attr("r", 9);
        })
        .on("mouseout", function () {
            tooltip.transition().duration(500).style("opacity", 0);
            d3.select(this).style("opacity", 0.7).attr("r", 7);
        });
}

function drawDynamicScatterPlot(selector, data, xLabel, yLabel, formatCurrency) {
    document.querySelector(selector).innerHTML = "";
    const container = document.querySelector(selector);
    const width = container.clientWidth;
    const height = container.clientHeight || 400;
    const margin = { top: 20, right: 30, bottom: 50, left: 70 };

    const svg = d3.select(selector)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.x) * 1.1])
        .range([0, width - margin.left - margin.right]);

    svg.append("g")
        .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
        .call(d3.axisBottom(x).ticks(6).tickFormat(d3.format(".2s")))
        .selectAll("text").style("font-family", "Inter");

    const yMin = Math.min(0, d3.min(data, d => d.y));
    const yMax = d3.max(data, d => d.y);
    const y = d3.scaleLinear()
        .domain([yMin * 1.1, yMax * 1.1])
        .range([height - margin.top - margin.bottom, 0]);

    svg.append("g")
        .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format(".2s")))
        .selectAll("text").style("font-family", "Inter");

    // Zero line
    if (yMin < 0) {
        svg.append("line")
            .attr("x1", 0)
            .attr("x2", width - margin.left - margin.right)
            .attr("y1", y(0))
            .attr("y2", y(0))
            .attr("stroke", "rgba(255,255,255,0.2)")
            .attr("stroke-dasharray", "4,4");
    }

    svg.append("text")
        .attr("text-anchor", "end")
        .attr("x", width - margin.left - margin.right)
        .attr("y", height - margin.top - 10)
        .style("font-size", "12px")
        .style("fill", "var(--text-muted)")
        .text(xLabel.toUpperCase());

    svg.append("text")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-90)")
        .attr("y", -50)
        .attr("x", 0)
        .style("font-size", "12px")
        .style("fill", "var(--text-muted)")
        .text(yLabel.toUpperCase());

    svg.append('g')
        .selectAll("dot")
        .data(data)
        .join("circle")
        .attr("cx", d => x(d.x))
        .attr("cy", d => y(d.y))
        .attr("r", 7)
        .style("fill", d => d.y < 0 ? "var(--accent-red)" : "var(--accent-blue)")
        .style("opacity", 0.7)
        .on("mouseover", function (event, d) {
            tooltip.transition().duration(200).style("opacity", .9);
            const valX = xLabel === 'discount' ? d.x.toFixed(2) : formatCurrency(d.x);
            const valY = yLabel === 'discount' ? d.y.toFixed(2) : formatCurrency(d.y);
            tooltip.html(`<strong>${d.key}</strong><br/>${xLabel}: ${valX}<br/>${yLabel}: ${valY}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
            d3.select(this).style("opacity", 1).attr("r", 9);
        })
        .on("mouseout", function () {
            tooltip.transition().duration(500).style("opacity", 0);
            d3.select(this).style("opacity", 0.7).attr("r", 7);
        });
}
