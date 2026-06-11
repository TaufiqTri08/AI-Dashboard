<?php
// ollama-proxy.php
// Placeholder untuk final capstone structure
// Saat ini aplikasi JavaScript berjalan secara langsung memanggil Groq API melalui client-side.
// File ini disiapkan jika pada masa depan Anda ingin merutekan panggilan AI melalui backend server (PHP).

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

$response = [
    "status" => "success",
    "message" => "Ollama / LLM Proxy is active.",
    "note" => "Routing requests server-side is not implemented in this boilerplate."
];

echo json_encode($response);
?>
