export function generateStory(totalSales, totalProfit, profitMargin, anomaly) {
    const formatMoney = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
    
    const marginStr = (profitMargin * 100).toFixed(2) + "%";

    let story = `Secara keseluruhan, bisnis mencatatkan total penjualan mencapai ${formatMoney(totalSales)} dan rata-rata margin keuntungan di angka ${marginStr}.`;

    if (anomaly && anomaly.hasAnomaly) {
        story += ` Namun, terdapat indikasi efisiensi yang perlu diperhatikan pada area tertentu.`;
    } else {
        story += ` Performa bisnis terlihat stabil tanpa adanya anomali kerugian yang signifikan.`;
    }

    return story;
}

export function generateTitle(anomaly) {
    if (anomaly && anomaly.hasAnomaly) {
        return "AI Dashboard Analytics: Anomaly Detected";
    }
    return "AI Dashboard Analytics: Business Overview";
}

export function parseStoryResponse(response) {
    // Digunakan jika story digenerate langsung via LLM. 
    // Untuk saat ini, fungsi ini hanya sebagai utilitas passthrough atau text formatter.
    return response.trim();
}
