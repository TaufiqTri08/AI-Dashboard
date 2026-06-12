import { CONFIG } from './config.js';

/**
 * Meminta LLM (Ollama) untuk memberikan insight dan menjawab pertanyaan pengguna.
 */
export async function getAiInsight(promptText, anomalyContext, dataSummary = "") {
    const systemPrompt = `Kamu adalah AI asisten khusus (Business Analyst) untuk Dashboard Analitik Penjualan.
PENTING: Output HANYA boleh JSON valid, tanpa teks lain!
{
    "headline": "Headline jurnalistik spesifik (8-15 kata) yang merangkum anomali. Wajib mengandung metrik angka, persentase, atau nama produk/kategori penyebab masalah.",
    "narrative": "Teks jawabanmu.",
    "chart_command": {
        "type": "line|bar|scatter|none",
        "title": "Judul Grafik",
        "x_axis": "quarter|month|year|category|subcategory|region|discount|sales",
        "y_axis": "sales|profit"
    }
}
Konteks Data Saat Ini: ${dataSummary}
Konteks Anomali: ${anomalyContext ? anomalyContext.description : 'Tidak ada'}
ATURAN GRAFIK & BATASAN:
1. JIKA DAN HANYA JIKA pengguna SECARA EKSPLISIT menyuruhmu MEMBUAT, MENAMPILKAN, atau MENGGAMBAR "grafik"/"chart"/"visualisasi" baru (misal: "buatkan chart", "tampilkan grafik"), isi 'type' dengan 'line', 'bar', atau 'scatter'. Jika pengguna hanya BERCERITA atau MINTA PENJELASAN tentang chart (misal: "jelaskan chart ini"), WAJIB isi 'type': 'none'.
2. JIKA pengguna meminta rekomendasi, saran bisnis, insight strategi, atau menanyakan "Mengapa" dan "Bagaimana" terkait sales/profit/diskon, BERIKAN JAWABAN ANALITIS YANG MENDALAM. 
3. SANGAT PENTING: Jika pengguna meminta hal yang SAMA SEKALI TIDAK RELEVAN dengan data analitik atau bisnis (contoh: minta dibuatkan kode HTML/CSS, halaman login, resep masakan, tugas sekolah, politik), KAMU WAJIB MENOLAKNYA. Isi "narrative" dengan kalimat: "Maaf, kemampuan saya dibatasi khusus untuk menganalisis data penjualan dan memberikan rekomendasi bisnis pada dashboard ini saja." dan isi "headline" dengan "Pertanyaan Di Luar Konteks".`;

    try {
        const response = await fetch(CONFIG.API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${CONFIG.API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: CONFIG.MODEL_NAME,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: promptText }
                ],
                temperature: 0.5,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        let content = data.choices[0].message.content;
        
        try {
            const parsed = JSON.parse(content);
            return parsed; // Returns object { narrative, chart_command }
        } catch(e) {
            return { narrative: content }; // Fallback
        }
    } catch (error) {
        console.error("Error fetching AI Insight:", error);
        return "Maaf, terjadi kesalahan saat menghubungi asisten AI (Groq). Periksa koneksi internet atau sisa kuota API Key Anda.";
    }
}

/**
 * Meminta LLM menganalisis ringkasan data dan mengembalikan daftar anomali berformat JSON.
 */
export async function getAiAnomalies(dataSummary) {
    const systemPrompt = `Kamu adalah sistem pendeteksi anomali data otomatis. Tugasmu adalah menganalisis ringkasan data berikut dan menemukan anomali seperti kerugian ekstrim, lonjakan penjualan (MoM), atau profit margin yang sangat rendah/tinggi.
    
Data Summary:
${JSON.stringify(dataSummary)}

PENTING: Output HANYA boleh berupa JSON Array valid dengan format berikut, tanpa ada teks tambahan apapun sebelum atau sesudah JSON:
[
  {
    "title": "Judul Anomali (misal: Profit Margin Anomali: Tables)",
    "description": "Deskripsi singkat (misal: margin -8.5% | jauh di bawah rata-rata)"
  }
]
`;

    try {
        const response = await fetch(CONFIG.API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${CONFIG.API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: CONFIG.MODEL_NAME,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: "Tolong deteksi anomali dari data tersebut dan kembalikan HANYA format JSON tanpa teks lain." }
                ],
                temperature: 0.3, // Lebih rendah agar output konsisten
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        let content = data.choices[0].message.content;
        
        // Memastikan jika AI membungkus dengan json object { anomalies: [...] }
        const parsed = JSON.parse(content);
        if (parsed.anomalies) return parsed.anomalies;
        return Array.isArray(parsed) ? parsed : [parsed];
    } catch (error) {
        console.error("Error fetching AI Anomalies:", error);
        return null;
    }
}
