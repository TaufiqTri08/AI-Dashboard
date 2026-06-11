/**
 * Deteksi anomali pada data
 * Menggunakan perhitungan statistik (Z-score & MoM) untuk mendeteksi anomali.
 */
export function detectAnomaly(data) {
    if (!data || data.length === 0) return { hasAnomaly: false, anomaliesList: [], description: "" };

    const anomaliesList = [];

    // 1. Z-Score Anomali Profit Margin per SubCategory
    const profitMarginBySubcat = Array.from(
        d3.rollup(data, 
            v => ({ sales: d3.sum(v, d => d.Sales), profit: d3.sum(v, d => d.Profit) }), 
            d => d.SubCategory
        ),
        ([key, value]) => ({ key, margin: value.sales > 0 ? value.profit / value.sales : 0 })
    );

    const margins = profitMarginBySubcat.map(d => d.margin);
    const meanMargin = d3.mean(margins);
    const stdDevMargin = d3.deviation(margins);

    profitMarginBySubcat.forEach(d => {
        if (stdDevMargin > 0) {
            d.zScore = (d.margin - meanMargin) / stdDevMargin;
            if (d.zScore <= -1.5) {
                anomaliesList.push({
                    title: `Profit Margin Anomali: ${d.key}`,
                    description: `margin ${(d.margin * 100).toFixed(1)}% | Z-score ${d.zScore.toFixed(2)} | jauh di bawah rata-rata`
                });
            } else if (d.zScore >= 1.5) {
                anomaliesList.push({
                    title: `Profit Margin Anomali: ${d.key}`,
                    description: `margin ${(d.margin * 100).toFixed(1)}% | Z-score ${d.zScore.toFixed(2)} | jauh di atas rata-rata`
                });
            }
        }
    });

    // 2. MoM Revenue Naik/Turun Drastis
    const formatMonth = d3.timeFormat("%Y-%m");
    const salesByMonthMap = d3.rollup(data, v => d3.sum(v, d => d.Sales), d => {
        // Parse date e.g. "2001-07-01 00:00:00.000"
        const date = new Date(d.OrderDate);
        return formatMonth(date);
    });

    // Sort by month
    const salesByMonth = Array.from(salesByMonthMap, ([month, sales]) => ({ month, sales })).sort((a, b) => a.month.localeCompare(b.month));

    const formatMoney = d3.format("$,.0f");
    for (let i = 1; i < salesByMonth.length; i++) {
        const prev = salesByMonth[i - 1];
        const curr = salesByMonth[i];
        if (prev.sales > 0) {
            const mom = (curr.sales - prev.sales) / prev.sales;
            if (mom >= 1.0) { // Naik drastis > 100%
                anomaliesList.push({
                    title: `Revenue Naik Drastis: ${curr.month}`,
                    description: `${(mom * 100).toFixed(1)}% MoM | ${formatMoney(curr.sales)} vs ${formatMoney(prev.sales)} bulan lalu`
                });
            } else if (mom <= -0.5) { // Turun drastis > 50%
                anomaliesList.push({
                    title: `Revenue Turun Drastis: ${curr.month}`,
                    description: `${(mom * 100).toFixed(1)}% MoM | ${formatMoney(curr.sales)} vs ${formatMoney(prev.sales)} bulan lalu`
                });
            }
        }
    }

    // 3. Deteksi Produk Merugikan (Negative Profit)
    const profitByProduct = Array.from(
        d3.rollup(data, v => d3.sum(v, d => d.Profit), d => d.ProductName),
        ([key, profit]) => ({ key, profit })
    ).filter(d => d.profit < 0).sort((a, b) => a.profit - b.profit);

    if (profitByProduct.length > 0) {
        const worstProduct = profitByProduct[0];
        // Hanya laporkan jika kerugian signifikan (misal: di bawah -$100)
        if (worstProduct.profit < -100) {
            anomaliesList.push({
                title: `Kebocoran Profit Kritis: Produk Merugikan`,
                description: `Produk '${worstProduct.key}' menghasilkan kerugian terbesar sebesar ${formatMoney(worstProduct.profit)}.`
            });
        }
    }

    // 4. Deteksi Dampak Diskon Berlebihan
    const discountImpact = data.filter(d => d.Discount > 0 && d.Profit < 0);
    if (discountImpact.length > 0) {
        const totalLossFromDiscount = d3.sum(discountImpact, d => d.Profit);
        if (totalLossFromDiscount < -500) {
            anomaliesList.push({
                title: `Peringatan Diskon: Memicu Kerugian`,
                description: `Terdapat ${discountImpact.length} transaksi berdiskon yang justru menyebabkan total kerugian hingga ${formatMoney(totalLossFromDiscount)}.`
            });
        }
    }

    // Urutkan anomali (MoM drastis dan Kebocoran Profit di atas)
    anomaliesList.sort((a, b) => {
        if (a.title.includes("Kritis") || a.title.includes("Turun Drastis")) return -1;
        if (a.title.includes("Naik Drastis")) return 1;
        return 0;
    });

    return {
        hasAnomaly: anomaliesList.length > 0,
        type: anomaliesList.length > 0 ? anomaliesList[0].title : "Normal",
        description: `Ditemukan ${anomaliesList.length} anomali statistik berdasarkan perhitungan Profit Margin dan pertumbuhan Revenue (MoM).`,
        anomaliesList: anomaliesList
    };
}
