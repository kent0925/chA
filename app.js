// --- 0. 核心安全配置 ---
const SYSTEM_SALT = "TrU$t_Sca1e_8xP@qL9!mZ";
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbw0dAVQ2HOQDvJKNBpj0FT1HJIPW6GLCdJkye3419ZMi2lzFqTUExD8oHdvLG4H_pKq/exec";
const DEFAULT_LIFF_ID = "2006766467-3X6V97xQ"; 

// --- 0.5 通用 API 呼叫 ---
async function callGAS(payload) {
    const isDemoUrl = !GAS_API_URL || GAS_API_URL.includes("AKfycbw0dAVQ");
    try {
        const resp = await fetch(GAS_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return await resp.json();
    } catch (err) {
        console.error("GAS Call Error:", err);
        throw err;
    }
}

let currentUser = { uid: 'GUEST_DEFAULT', platform: 'WEB', quota: 0, displayName: '訪客測試', pictureUrl: '', personalCount: 0 };

// --- 1. 加密模組 ---
function hashData(text) {
    if (!text) return Promise.resolve("");
    var saltedText = text + SYSTEM_SALT;
    var sha256 = function sha256(ascii) {
        function rightRotate(value, amount) { return (value >>> amount) | (value << (32 - amount)); };
        var mathPow = Math.pow;
        var maxWord = mathPow(2, 32);
        var lengthProperty = 'length';
        var i, j;
        var result = '';
        var words = [];
        var asciiBitLength = ascii[lengthProperty] * 8;
        var hash = sha256.h = sha256.h || [];
        var k = sha256.k = sha256.k || [];
        var primeCounter = k[lengthProperty];
        var isComposite = {};
        for (var candidate = 2; primeCounter < 64; candidate++) {
            if (!isComposite[candidate]) {
                for (i = 0; i < 313; i += candidate) { isComposite[i] = candidate; }
                hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
                k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
            }
        }
        ascii += '\x80';
        while (ascii[lengthProperty] % 64 - 56) ascii += '\x00';
        for (i = 0; i < ascii[lengthProperty]; i++) {
            j = ascii.charCodeAt(i);
            if (j >> 8) return;
            words[i >> 2] |= j << ((3 - i) % 4) * 8;
        }
        words[words[lengthProperty]] = ((asciiBitLength / maxWord) | 0);
        words[words[lengthProperty]] = (asciiBitLength | 0);
        for (j = 0; j < words[lengthProperty]; j += 16) {
            var w = words.slice(j, j + 16);
            var oldHash = hash;
            hash = hash.slice(0, 8);
            for (i = 0; i < 64; i++) {
                var i2 = i + j;
                var w15 = w[i - 15], w2 = w[i - 2];
                var a = hash[0], e = hash[4];
                var temp1 = hash[7] + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) + ((e & hash[5]) ^ ((~e) & hash[6])) + k[i] + (w[i] = (i < 16) ? w[i] : (w[i - 16] + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) | 0);
                var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
                hash = [(temp1 + temp2) | 0].concat(hash);
                hash[4] = (hash[4] + temp1) | 0;
            }
            for (i = 0; i < 8; i++) { hash[i] = (hash[i] + oldHash[i]) | 0; }
        }
        for (i = 0; i < 8; i++) {
            for (j = 3; j + 1; j--) {
                var b = (hash[i] >> (j * 8)) & 255;
                result += ((b < 16) ? '0' : '') + b.toString(16);
            }
        }
        return result;
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
                currentUser = { uid: `LINE_${profile.userId}`, platform: 'LINE', quota: 3, displayName: profile.displayName, pictureUrl: profile.pictureUrl };
            } else {
                liff.login();
                return;
            }
        } else {
            currentUser = { uid: 'TRIAL_USER', platform: 'WEB', quota: 0, displayName: '訪客測試 (WEB)' };
        }
        updateUserInfoUI();
    } catch (e) {
        console.error("Auth Init Error:", e);
        updateUserInfoUI();
    }
}

function updateUserInfoUI() {
    const nameSpan = document.getElementById('user-name');
    const avatarImg = document.getElementById('user-avatar');
    if (nameSpan) nameSpan.innerText = currentUser.displayName;
    if (avatarImg && currentUser.pictureUrl) avatarImg.src = currentUser.pictureUrl;
    const userBar = document.getElementById('user-bar');
    if (userBar) userBar.classList.remove('hidden');
}

// --- 3. 核心功能 (搜尋、回報) ---
async function handleSearch() {
    const name = document.getElementById('in-name').value.trim();
    const phoneRaw = document.getElementById('in-phone').value.trim();
    const phoneClean = phoneRaw.replace(/\D/g, '').slice(-4);
    if (!name) return alert("請輸入姓名");
    switchView('view-loading');
    const hName = await hashData(name);
    const hPhone = phoneClean ? await hashData(phoneClean) : "";
    const hUid = await hashData(currentUser.uid);
    try {
        const result = await callGAS({ action: "search", uid: hUid, platform: currentUser.platform, hName, hPhone });
        if (result && result.status === 'ok') {
            updateResultsUI(result);
            switchView('view-results');
        } else {
            alert(result.message || "查詢失敗");
            switchView('view-search');
        }
    } catch (e) {
        alert("連線失敗");
        switchView('view-search');
    }
}

async function submitReport() {
    const name = document.getElementById('report-name').value.trim();
    const phoneRaw = document.getElementById('report-phone').value.trim();
    const phoneClean = phoneRaw.replace(/\D/g, '').slice(-4);
    if (!name || phoneClean.length !== 4) return alert("請完整填寫姓名與電話末四碼");
    switchView('view-loading');
    const hName = await hashData(name);
    const hPhone = await hashData(phoneClean);
    const hUid = await hashData(currentUser.uid);
    try {
        const result = await callGAS({ action: "report", uid: hUid, platform: currentUser.platform, hName, hPhone, tags: Array.from(selectedTags) });
        alert(result.message || "建檔完成");
        location.reload();
    } catch (e) {
        alert("建檔失敗");
        switchView('view-search');
    }
}

// --- 4. UI 管理 ---
function switchView(viewId) {
    ['view-search', 'view-loading', 'view-results', 'view-report'].forEach(id => {
        const v = document.getElementById(id);
        if (v) v.classList.toggle('hidden', id !== viewId);
    });
}

function showToast(message, type = 'info') {
    let t = document.getElementById('ui-toast');
    if (!t) { t = document.createElement('div'); t.id = 'ui-toast'; t.className = 'ui-toast'; document.body.appendChild(t); }
    t.innerText = message; t.className = `ui-toast show ${type}`;
    setTimeout(() => t.classList.remove('show'), 3000);
}

async function toggleUidDisplay() {
    const el = document.getElementById('display-uid');
    if (!el || !currentUser.uid) return;
    if (el.innerText !== "●●●●●●●●") { el.innerText = "●●●●●●●●"; return; }
    const hUid = await hashData(currentUser.uid);
    el.innerText = hUid;
    if (navigator.clipboard) {
        await navigator.clipboard.writeText(hUid);
        showToast("✅ 已複製 ID", "success");
    }
    if (currentUser.platform !== 'WEB') {
        callGAS({ action: "log_admin_apply", name: currentUser.displayName, hUid: hUid });
    }
}

// --- 5. 初始化 ---
window.onload = async () => {
    await initializeAuth();
    if (document.getElementById('report-year')) generateYearOptions();
    switchView('view-search');
    updateLiveStats();
};

function generateYearOptions() {
    const s = document.getElementById('report-year');
    const cur = new Date().getFullYear();
    for (let y = cur; y >= 2018; y--) {
        const o = document.createElement('option'); o.value = y; o.innerText = `${y} 年`; s.appendChild(o);
    }
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

// 標籤、光譜等其餘 UI 邏輯... (此處為示意，實際應補全)
const TAG_LIBRARY = { tenant: [], landlord: [], student: [] };
let selectedTags = new Set();
function renderTags() { /* ... */ }
function updateResultsUI(data) { /* ... */ }
function openReportView() { switchView('view-report'); renderTags(); }
function resetApp() { location.reload(); }