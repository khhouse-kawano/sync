// // check_key.js
// const axios = require('axios');

// // ここに今のAPIキーを入れてください
// const API_KEY = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiMmIzOWE0OGY1OGE0ZGMzNTA0OTQ2NjkwNTkwMDE1ZWIyNTAwMjY3OGYzYTRiNDIxMWMwMTIxMzNjNDZiNWQyYjllNzM1MDZjNDljNGNiNDIiLCJpYXQiOjE3NzA2MDMwODYuMTA5MjA1LCJuYmYiOjE3NzA2MDMwODYuMTA5MjA2LCJleHAiOjQ5MjYyNzY2ODYuMTAzNzY4LCJzdWIiOiI3NDIzNTA3MCIsInNjb3BlcyI6WyJ1c2VyLnJlYWQiLCJ1c2VyLndyaXRlIiwidGFzay5yZWFkIiwidGFzay53cml0ZSIsIndlYmhvb2sucmVhZCIsIndlYmhvb2sud3JpdGUiLCJwcmVzZXQucmVhZCIsInByZXNldC53cml0ZSJdfQ.OGT8GnmempTx9s4ziLYt4ogUX1-daXIls8HiFoH-xLu3sh2yGHdsdT3IMS9o-2HX3sshSeTZRoDPzB73mpgC8gd1rl9y8-1b3mq3bKqM9e7dtZAiLpI7ZAUWJlvywY0CiWZyVs6mWCUALR13y8s-BVdQ5jZl167CAiNCd4yuaVVv11v1jXmVKNhtWULRGKkdzNNdLZWIzqDA5SjViE4Zqy4d24dAENRfW9TChKpsrcKgqSSHf9dIRbA4r8AUEZjwP4z14t884ahNmN6qrb3f76Kh9kSNwvlB68tUsWF8o8FNcoPddnlMhmVYsdsl10bYIhGbSzNQQcuFADZUfAB802RLVzzo5PhTPyjxx3P0mURX7BnSyqVEuZWXkTeDhScl423G1rdLo86fBE0cpGdJtpxY8Z80b5Z8lKBC3OvXWsQ3vqqpO7K-R6ktWci7kwNFhyWqKIsx5JGj9MqkhSfF_ykj_P8RdQrm-aA_bXvg6abXvKvONl44eINW1Tq7nITYM6SUzAaOXyR6RDLWarDRHNIoBwGCLa5KmOLgxaRz-ZinII5nPOo8F7OCIuLhyzn6_569za7kQ9n_bw5mSwncF3vHYuCuY6DSiXXG7OWXgc8BHa1AM1yNo6YZE7u-pNgpDbNhb6AqvejSTkRCXwTGxp-y6HUIq2RN0gEkJwJlIjw";

// async function checkPermissions() {
//     try {
//         console.log("🔑 APIキーの権限を確認中...");
//         const res = await axios.get('https://api.cloudconvert.com/v2/users/me', {
//             headers: { 'Authorization': `Bearer ${API_KEY}` }
//         });

//         console.log("✅ ユーザー名:", res.data.data.username);
//         console.log("📜 保持している権限 (Scopes):");
//         console.dir(res.data.data.scopes, { depth: null });

//         const scopes = res.data.data.scopes;
//         if (!scopes.includes('task.write')) {
//             console.error("\n❌ 【重要】 'task.write' がありません！これがないと変換を開始できません。");
//         } else {
//             console.log("\n✅ 'task.write' はあります。");
//         }

//         if (!scopes.includes('job.write')) {
//             console.log("⚠️ 'job.write' がありません（Job APIは使えません）。");
//         }

//     } catch (error) {
//         console.error("❌ 接続エラー:", error.response ? error.response.data : error.message);
//     }
// }

// checkPermissions();

const fetch = require("node-fetch");

const sample = [
  { address: "鹿児島市◯◯町", price: 1800, land_area: 120 },
  { address: "鹿児島市△△町", price: 2200, land_area: 150 },
];

(async () => {
  const res = await fetch("http://localhost:3000/api/portal_kaeru", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ estates: sample }),
  });

  const res2 = await fetch("https://sync-pg-cloud-9f739ab131ed.herokuapp.com/api/estate_info", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ estates: sample }),
  });

    const json = await res.json();
    console.log(json);
})();
