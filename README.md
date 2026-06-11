# 📊 AI Sales Analytics Dashboard

![Dashboard Preview](https://img.shields.io/badge/Status-Completed-brightgreen?style=for-the-badge) ![Tech Stack](https://img.shields.io/badge/Tech-HTML%20%7C%20CSS%20%7C%20JS%20%7C%20D3.js-blue?style=for-the-badge) ![AI](https://img.shields.io/badge/AI-Groq%20Llama%203.1-orange?style=for-the-badge)

**AI Sales Analytics Dashboard** adalah proyek tugas akhir (*EAS DAVIS B*) yang dirancang untuk memberikan wawasan (insight) bisnis komprehensif menggunakan data penjualan. Berbeda dengan dashboard konvensional, proyek ini tidak hanya menampilkan visualisasi statis, melainkan dilengkapi dengan **kecerdasan buatan (AI)** yang mampu membaca data, mendeteksi anomali, dan memberikan rekomendasi strategi bisnis secara *real-time*.

---

## ✨ Fitur Utama

### 1. 🤖 Integrasi AI (*Business Analyst Assistant*)
Ditenagai oleh **Groq API (Llama 3.1 8B)**, dashboard ini dapat bertindak sebagai *Business Analyst* virtual.
- **Natural Language Query**: Anda dapat mengajukan pertanyaan seperti *"Bagaimana cara meningkatkan profit di wilayah yang rugi?"* dan AI akan menjawab berdasarkan data riil yang ada pada dataset.
- **Dynamic Charts**: AI dapat membaca anomali dan jika diminta, ia mampu merender grafik baru secara dinamis (Line, Bar, atau Scatter) tepat di dalam jendela *chat*.

### 2. 🚨 Deteksi Anomali Otomatis
Sistem dilengkapi dengan algoritma deteksi anomali mandiri (dibangun dengan Vanilla JavaScript) yang berjalan di latar belakang:
- Mendeteksi produk-produk spesifik yang memicu **Kebocoran Profit Kritis**.
- Menganalisis dampak pemberian diskon berlebihan yang merugikan perusahaan.
- Menganalisis pergerakan persentase Profit Margin dan *Month-over-Month (MoM) Revenue*.

### 3. 📈 Visualisasi Data Interaktif (D3.js)
Menampilkan berbagai metrik penting (KPI) dengan desain *Dark Mode Liquid Glass*:
- **Tren Penjualan Bulanan**: Fluktuasi pendapatan dari waktu ke waktu.
- **Sales by Category**: Perbandingan volume penjualan antar kategori utama.
- **Profit by Sub-Category**: Identifikasi sub-kategori produk yang paling menguntungkan maupun yang merugikan (ditandai dengan warna merah).
- **Sales vs Profit (Distribusi Kota)**: Scatter plot padat yang memetakan performa ratusan kota secara spesifik.

### 4. 📊 Tableau Integration
Sebagai pelengkap, dashboard ini juga menyertakan *tab* khusus yang melakukan *embed* langsung (*iframe*) terhadap visualisasi tingkat lanjut dari **Tableau Public**.

---

## 🛠️ Teknologi yang Digunakan
- **Frontend**: HTML5, CSS3 (Glassmorphism Dark Theme), Vanilla JavaScript.
- **Data Visualization**: [D3.js (v7)](https://d3js.org/) untuk rendering grafik *custom*.
- **AI / LLM**: [Groq API](https://groq.com/) menggunakan model `llama-3.1-8b-instant`.
- **Dataset**: `Sales_BY_Category.csv` (Custom Sales Dataset).

---

## 🚀 Cara Menjalankan Secara Lokal

Karena proyek ini menggunakan `d3.csv()` untuk membaca file dataset, maka **wajib** dijalankan melalui *Local Web Server* guna menghindari blokir *CORS Policy* dari browser.

1. Buka folder proyek di terminal atau *command prompt*.
2. Jalankan server lokal. Jika Anda memiliki PHP, Anda bisa menggunakan perintah:
   ```bash
   php -S localhost:8080
   ```
   *(Alternatif: Gunakan ekstensi **Live Server** di VS Code atau `python -m http.server 8080`).*
3. Buka *browser* Anda dan kunjungi `http://localhost:8080`.

---

## 👤 Identitas Pembuat
Proyek ini dikembangkan oleh:
**Taufiq Tri Winardi**
- **NPM**: 23082010008
- **Mata Kuliah**: EAS DAVIS B

---
*Didesain khusus untuk memenuhi panduan EAS dengan mengedepankan kreativitas dan analitik berbasis AI.*
