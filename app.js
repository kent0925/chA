// --- 0. 核心安全配置 ---
const SYSTEM_SALT = "TrU$t_Sca1e_8xP@qL9!mZ";
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbw0dAVQ2HOQDvJKNBpj0FT1HJIPW6GLCdJkye3419ZMi2lzFqTUExD8oHdvLG4H_pKq/exec";
const DEFAULT_LIFF_ID = "2006766467-3X6V97xQ"; 

// --- 0.5 通用 API 呼叫 ---
async function callGAS(payload) {
    try {
        const resp = await fetch(GAS_API_URL, {
            method: "POST",
            mode: "cors",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload)
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return await resp.json();
    } catch (err) {
        console.warn("連線異常:", err.message);
        return null;
    }
}

let currentUser = { uid: 'GUEST', platform: 'WEB', displayName: '訪客測試', pictureUrl: '', personalCount: 0 };

// --- 1. 加密引擎 ---
function hashData(text) {
    if (!text) return Promise.resolve("");
    var saltedText = text + SYSTEM_SALT;
    var sha256 = function(ascii) {
        function rR(v, a) { return (v >>> a) | (v << (32 - a)); };
        var mP = Math.pow, mW = mP(2, 32), res = '', words = [], h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19], k = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
        ascii += '\x80'; while (ascii.length % 64 - 56) ascii += '\x00';
        for (var i = 0; i < ascii.length; i++) { var j = ascii.charCodeAt(i); words[i >> 2] |= j << ((3 - i) % 4) * 8; }
        words[words.length] = ((ascii.length * 8 / mW) | 0); words[words.length] = (ascii.length * 8 | 0);
        for (j = 0; j < words.length; j += 16) {
            var w = words.slice(j, j + 16), oldH = h.slice(0);
            for (i = 0; i < 64; i++) {
                var w15 = w[i-15], w2 = w[i-2];
                var a = h[0], e = h[4];
                var t1 = h[7] + (rR(e, 6) ^ rR(e, 11) ^ rR(e, 25)) + ((e & h[5]) ^ ((~e) & h[6])) + k[i] + (w[i] = (i < 16) ? w[i] : (w[i-16] + (rR(w15, 7) ^ rR(w15, 18) ^ (w15 >>> 3)) + w[i-7] + (rR(w2, 17) ^ rR(w2, 19) ^ (w2 >>> 10))) | 0);
                var t2 = (rR(a, 2) ^ rR(a, 13) ^ rR(a, 22)) + ((a & h[1]) ^ (a & h[2]) ^ (h[1] & h[2]));
                h = [(t1 + t2) | 0].concat(h); h[4] = (h[4] + t1) | 0; h = h.slice(0, 8);
            }
            for (i = 0; i < 8; i++) h[i] = (h[i] + oldH[i]) | 0;
        }
        for (i = 0; i < 8; i++) { for (var b, k = 3; k + 1; k--) { b = (h[i] >> (k * 8)) & 255; res += ((b < 16) ? '0' : '') + b.toString(16); } }
        return res;
    };
    return Promise.resolve(sha256(saltedText));
}

// --- 2. 身分識別 ---
async function initializeAuth() {
    try {
        if (window.liff) {
            await liff.init({ liffId: DEFAULT_LIFF_ID });
            if (liff.isLoggedIn()) {
                const profile = await liff.getProfile();
                currentUser = { uid: `LINE_${profile.userId}`, platform: 'LINE', displayName: profile.displayName, pictureUrl: profile.pictureUrl };
            } else { liff.login(); return; }
        }
    } catch (e) {
        console.error("Auth Error:", e.message);
        currentUser = { uid: 'GUEST_DEFAULT', platform: 'WEB', displayName: '訪客測試' };
    }
    updateUserInfoUI();
}

function updateUserInfoUI() {
    const n = document.getElementById('user-name'), a = document.getElementById('user-avatar'), b = document.getElementById('user-bar');
    if (n) n.innerText = currentUser.displayName;
    if (a && currentUser.pictureUrl) a.src = currentUser.pictureUrl;
    if (b) b.classList.remove('hidden');
}

// --- 3. 標籤與庫 ---
const TAG_LIBRARY = {
    tenant: [
        { text: "✨ 屋況維持極佳", impact: "good" }, { text: "🛠️ 擅自更動裝修", impact: "bad" },
        { text: "🤫 維持鄰里安寧", impact: "good" }, { text: "📦 堆置雜物爭議", impact: "bad" },
        { text: "💰 準時給付租金", impact: "good" }, { text: "💸 租金給付遲延", impact: "bad" }
    ],
    landlord: [
        { text: "💸 押金如期返還", impact: "good" }, { text: "🔍 押金扣留爭議", impact: "bad" },
        { text: "⚡ 修繕處理迅速", impact: "good" }, { text: "⏳ 修繕推託延遲", impact: "bad" }
    ],
    student: [
        { text: "🎓 專注學業單純", impact: "good" }, { text: "🎉 帶人開趴喧嘩", impact: "bad" }
    ]
};
let selectedTags = new Set();
let currentReportType = 'tenant';

function renderTags() {
    const container = document.getElementById('tag-container');
    if (!container) return;
    container.innerHTML = '';
    TAG_LIBRARY[currentReportType].forEach(tag => {
        const chip = document.createElement('div');
        chip.className = 'tag-chip';
        chip.innerText = tag.text;
        chip.onclick = () => {
            if (selectedTags.has(tag.text)) { selectedTags.delete(tag.text); chip.classList.remove('selected'); }
            else { selectedTags.add(tag.text); chip.classList.add('selected'); }
        };
        container.appendChild(chip);
    });
}

// --- 4. 搜尋邏輯 ---
async function handleSearch() {
    const name = document.getElementById('in-name').value.trim();
    if (!name) return alert("請輸入姓名");
    switchView('view-loading');
    const hName = await hashData(name);
    const hUid = await hashData(currentUser.uid);
    try {
        const result = await callGAS({ action: "search", uid: hUid, platform: currentUser.platform, hName });
        if (result && result.status === 'ok') { updateResultsUI(result); }
        else { updateResultsUI(95); }
    } catch (e) { updateResultsUI(95); }
    switchView('view-results');
}

function updateResultsUI(input) {
    const adviceEl = document.getElementById('risk-advice');
    let risk = 'NONE';
    if (typeof input === 'number') { adviceEl.innerText = "建議依標準程序查核 (試用模式)"; }
    else { risk = input.riskLevel || 'NONE'; adviceEl.innerText = input.message || "建議依標準程序查核"; }
    updateSpectrum(risk);
}

function updateSpectrum(riskKey) {
    const pointer = document.getElementById('spectrum-pointer');
    const posMap = { NONE: '12.5%', LOW: '37.5%', MEDIUM: '62.5%', HIGH: '87.5%' };
    if (pointer) pointer.style.left = posMap[riskKey] || '12.5%';
}

// --- 5. 初始化 ---
window.onload = async () => {
    await initializeAuth();
    if (document.getElementById('report-year')) {
        const s = document.getElementById('report-year'), cur = new Date().getFullYear();
        for (let y = cur; y >= 2018; y--) { const o = document.createElement('option'); o.value = y; o.innerText = `${y} 年`; s.appendChild(o); }
    }
    switchView('view-search');
    updateLiveStats();
};

function switchView(vId) {
    ['view-search', 'view-loading', 'view-results', 'view-report'].forEach(id => {
        const v = document.getElementById(id);
        if (v) v.classList.toggle('hidden', id !== vId);
    });
}

async function updateLiveStats() {
    try {
        const s = await callGAS({ action: "get_stats" });
        if (s && s.status === "ok") {
            document.getElementById("stat-total").innerText = s.total || 0;
            document.getElementById("stat-high").innerText = s.highRisk || 0;
            document.getElementById("stat-today").innerText = s.today || 0;
        }
    } catch (e) {}
}

async function toggleUidDisplay() {
    const el = document.getElementById('display-uid');
    if (!el || !currentUser.uid) return;
    if (el.innerText !== "●●●●●●●●") { el.innerText = "●●●●●●●●"; return; }
    const hUid = await hashData(currentUser.uid);
    el.innerText = hUid;
    if (navigator.clipboard) { await navigator.clipboard.writeText(hUid); alert("✅ 已複製 ID"); }
    callGAS({ action: "log_admin_apply", name: currentUser.displayName, hUid: hUid });
}

function openReportView() { switchView('view-report'); renderTags(); }
function resetApp() { location.reload(); }