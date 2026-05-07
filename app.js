// --- 0. 核心安全配置 ---
const SYSTEM_SALT = "TrU$t_Sca1e_8xP@qL9!mZ";
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbw0dAVQ2HOQDvJKNBpj0FT1HJIPW6GLCdJkye3419ZMi2lzFqTUExD8oHdvLG4H_pKq/exec";
const DEFAULT_LIFF_ID = "2009974240-zhGWMVVX";

// --- 0.5 通用 API 呼叫 ---
async function callGAS(payload) {
    try {
        const response = await fetch(GAS_API_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const result = await response.json();
        
        // --- 除錯模式：若有伺服器內部錯誤，直接噴出詳細 log ---
        if (result.status === 'error' && result.details) {
            console.error("GAS 內部錯誤:", result.details, "\nStack:", result.stack);
            alert(`伺服器內部錯誤詳細資訊：\n\n${result.details}\n\n請截圖回報開發者。`);
        }
        
        return result;
    } catch (error) {
        console.error("API Error:", error);
        return { status: "error", message: "連線失敗，請檢查網路連線" };
    }
}

async function getClientIP() {
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        return data.ip;
    } catch(e) {
        return "UNKNOWN";
    }
}

let currentUser = { uid: 'GUEST', platform: 'WEB', displayName: '訪客測試', pictureUrl: '', personalCount: 0 };

// --- 1. 加密引擎 ---
function hashData(text) {
    if (!text) return Promise.resolve("");
    var saltedText = text + SYSTEM_SALT;
    var sha256 = function (ascii) {
        function rR(v, a) { return (v >>> a) | (v << (32 - a)); };
        var mP = Math.pow, mW = mP(2, 32), res = '', words = [], h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19], k = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
        ascii += '\x80'; while (ascii.length % 64 - 56) ascii += '\x00';
        for (var i = 0; i < ascii.length; i++) { var j = ascii.charCodeAt(i); words[i >> 2] |= j << ((3 - i) % 4) * 8; }
        words[words.length] = ((ascii.length * 8 / mW) | 0); words[words.length] = (ascii.length * 8 | 0);
        for (j = 0; j < words.length; j += 16) {
            var w = words.slice(j, j + 16), oldH = h.slice(0);
            for (i = 0; i < 64; i++) {
                var w15 = w[i - 15], w2 = w[i - 2];
                var a = h[0], e = h[4];
                var t1 = h[7] + (rR(e, 6) ^ rR(e, 11) ^ rR(e, 25)) + ((e & h[5]) ^ ((~e) & h[6])) + k[i] + (w[i] = (i < 16) ? w[i] : (w[i - 16] + (rR(w15, 7) ^ rR(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rR(w2, 17) ^ rR(w2, 19) ^ (w2 >>> 10))) | 0);
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
    } catch (e) { console.error("Auth Error:", e.message); currentUser = { uid: 'GUEST_DEFAULT', platform: 'WEB', displayName: '訪客測試' }; }
    updateUserInfoUI();
}

function updateUserInfoUI() {
    const n = document.getElementById('user-name'), a = document.getElementById('user-avatar'), b = document.getElementById('user-bar');
    if (n) n.innerText = currentUser.displayName;
    if (a && currentUser.pictureUrl) a.src = currentUser.pictureUrl;
    if (b) b.classList.remove('hidden');
}

// --- 3. 標籤庫 (與 Code.gs 100% 對接) ---
const TAG_LIBRARY = {
    tenant: [
        { text: "✨ 屋況維持極佳", impact: "good" },
        { text: "🛠️ 擅自更動裝修", impact: "bad" },
        { text: "🤫 維持鄰里安寧", impact: "good" },
        { text: "📦 堆置雜物爭議", impact: "bad" },
        { text: "🛡️ 設備妥善維護", impact: "good" },
        { text: "🏚️ 設備毀損紀錄", impact: "bad" },
        { text: "📱 溝通聯繫順暢", impact: "good" },
        { text: "🔊 鄰里噪音投訴", impact: "bad" },
        { text: "🧹 空間整潔清空", impact: "good" },
        { text: "🚬 菸寵異味殘留", impact: "bad" },
        { text: "💰 準時給付租金", impact: "good" },
        { text: "💸 租金給付遲延", impact: "bad" }
    ],
    landlord: [
        { text: "💸 押金如期返還", impact: "good" },
        { text: "🔍 押金扣留爭議", impact: "bad" },
        { text: "⚡ 修繕處理迅速", impact: "good" },
        { text: "⏳ 修繕推託延遲", impact: "bad" },
        { text: "🏠 尊重房客隱私", impact: "good" },
        { text: "👣 未經授權入內", impact: "bad" },
        { text: "💧 台水台電計費", impact: "good" },
        { text: "📈 超收水電費用", impact: "bad" },
        { text: "📜 契約條款透明", impact: "good" },
        { text: "⚖️ 契約條款嚴苛", impact: "bad" },
        { text: "👼 配合申報稅補", impact: "good" },
        { text: "🚫 拒絕租金補貼", impact: "bad" },
        { text: "🤝 溝通明理友善", impact: "good" },
        { text: "💢 情緒勒索施壓", impact: "bad" }
    ],
    student: [
        { text: "🎓 專注學業單純", impact: "good" },
        { text: "🎉 帶人開趴喧嘩", impact: "bad" },
        { text: "🧹 宿舍維持整潔", impact: "good" },
        { text: "🛵 機車違規停放", impact: "bad" },
        { text: "🤝 家長理性溝通", impact: "good" },
        { text: "🛡️ 家長過度介入", impact: "bad" },
        { text: "💰 租金按時繳納", impact: "good" },
        { text: "💸 寒暑假欠繳/空窗", impact: "bad" }
    ]
};
let selectedTags = new Set();
let currentReportType = 'tenant';

function setReportType(type) {
    currentReportType = type;
    document.querySelectorAll('.identity-switch button').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`btn-report-${type}`)?.classList.add('active');
    document.getElementById('fields-tenant').style.display = (type === 'tenant' || type === 'student') ? 'block' : 'none';
    document.getElementById('fields-landlord').style.display = (type === 'landlord') ? 'block' : 'none';
    selectedTags.clear();
    renderTags();
}

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

// --- 4. 搜尋與結果渲染 (補全參數) ---
async function handleSearch() {
    const name = document.getElementById('in-name').value.trim();
    const phoneRaw = document.getElementById('in-phone').value.trim();
    const phoneClean = phoneRaw.replace(/\D/g, '').slice(-4);
    const gender = document.getElementById('in-gender')?.value || "";
    const ageRange = document.getElementById('in-age')?.value || "";

    if (!name) return alert("請輸入姓名");
    switchView('view-loading');
    const hName = await hashData(name);
    const hPhone = phoneClean ? await hashData(phoneClean) : "";
    const hUid = await hashData(currentUser.uid);
    try {
        const result = await callGAS({ action: "search", uid: hUid, platform: currentUser.platform, hName, hPhone, gender, ageRange });
        if (result && result.status === 'ok') {
            updateResultsUI(result);
            switchView('view-results');
        } else {
            alert(result?.message || "查詢遭到拒絕，請確認是否已透過 LINE 登入或額度已用盡。");
            switchView('view-search');
        }
    } catch (e) {
        alert("網路連線異常，請稍後再試。");
        switchView('view-search');
    }
}

function updateResultsUI(input) {
    const adviceEl = document.getElementById('risk-advice');
    const risk = input.riskLevel || 'NONE';

    let advice = "建議依標準程序查核";
    if (risk === "HIGH") advice = "建議強化風險控管或評估承租必要性";
    else if (risk === "MEDIUM") advice = "建議補強第三方擔保或查驗佐證資料";
    else if (risk === "LOW") advice = "建議落實約定事項並留存紀錄";
    else advice = "未偵測到異常關聯，可依一般流程作業";

    adviceEl.innerText = advice;

    // 渲染特徵標籤，確保讀取 userInfo 內的 tags
    if (input.userInfo && input.userInfo.tags && input.userInfo.tags.length > 0) {
        renderResultTags(input.userInfo.tags);
    } else {
        renderResultTags([]); // 清空或顯示查無資料
    }

    updateSpectrum(risk);
    renderQueryRef(input.isAdmin);

    // 💡 若為管理員，直接將下方的大按鈕顯示出來，不需再點擊小齒輪
    const adminSection = document.getElementById('admin-tool-section');
    if (adminSection) {
        adminSection.classList.toggle('hidden', !input.isAdmin);
    }
}

function renderResultTags(tags) {
    const container = document.getElementById('results-tags');
    if (!container) return;
    container.innerHTML = '';

    if (!tags || tags.length === 0) {
        document.getElementById('results-tags-container')?.classList.add('hidden');
        container.innerHTML = "<div class='sub-text' style='color:#94a3b8;'>🛡️ 資料庫內查無此對象之異常履約紀錄</div>";
        return;
    }

    document.getElementById('results-tags-container')?.classList.remove('hidden');
    tags.forEach(tag => {
        const el = document.createElement('div');
        el.className = 'ui-tag';
        if (tag.weight <= 0.4) el.classList.add('decay-40');
        else if (tag.weight <= 0.75) el.classList.add('decay-70');
        el.innerHTML = `${tag.text} <span class="tag-count">${tag.count}</span>`;
        container.appendChild(el);
    });
}

function updateSpectrum(riskKey) {
    const pointer = document.getElementById('spectrum-pointer');
    const posMap = { NONE: '12.5%', LOW: '37.5%', MEDIUM: '62.5%', HIGH: '87.5%' };
    if (pointer) pointer.style.left = posMap[riskKey] || '12.5%';
    document.querySelectorAll('.spectrum-seg').forEach((seg, i) => {
        const segKeys = ['NONE', 'LOW', 'MEDIUM', 'HIGH'];
        seg.classList.toggle('active', segKeys[i] === riskKey);
    });
}

function renderQueryRef(isAdmin = false) {
    const refEl = document.getElementById('query-ref');
    if (!refEl) return;
    let html = `查詢流水號: REF-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    // 🛠️ 只有管理員會看到流水號旁邊的小齒輪，點了才在最下方顯示工具
    if (isAdmin) {
        html += ` <span onclick="toggleAdminTool()" style="cursor:pointer; color:var(--primary); font-size:1.1em; vertical-align:middle; margin-left:10px; opacity:0.6;">🛠️</span>`;
    }
    refEl.innerHTML = html;
}

function toggleAdminTool() {
    switchView('view-admin-tool');
}

// --- 5. 回報提交 (補全性別欄位) ---
async function submitReport() {
    const name = document.getElementById('report-name').value.trim();
    const phoneRaw = document.getElementById('report-phone').value.trim();
    const phoneClean = phoneRaw.replace(/\D/g, '').slice(-4);
    const area = document.getElementById('report-area').value;
    const age = document.getElementById('report-age').value;
    const gender = document.getElementById('report-gender').value;
    const year = document.getElementById('report-year').value;
    const agreement = document.getElementById('report-agreement').checked;

    if (!agreement) return alert("請勾選切結書");
    if (!name) return alert("請輸入對象姓名");
    if (phoneClean.length !== 4) return alert("請輸入正確的電話末四碼");
    if (!area) return alert("請選擇區域");
    if (!year) return alert("請選擇回報年份");
    if (!document.getElementById('report-rent')?.value) return alert("請選擇每月租金");
    if (!document.getElementById('report-layout')?.value) return alert("請選擇格局類型");
    if (selectedTags.size === 0) return alert("請至少選擇一個標籤");

    switchView('view-loading');
    const hName = await hashData(name);
    const hPhone = await hashData(phoneClean);
    const hUid = await hashData(currentUser.uid);

    const specificData = {
        rentRange: document.getElementById('report-rent')?.value || '',
        layout: document.getElementById('report-layout')?.value || '',
        target: document.getElementById('report-tenant-target')?.value || '',
        landlordType: document.getElementById('report-landlord-type')?.value || ''
    };

    // 取得法庭證據包
    const ip = await getClientIP();
    const evidence = {
        uid: currentUser.uid,
        ip: ip,
        userAgent: navigator.userAgent
    };

    const payload = {
        action: "report", uid: hUid, platform: currentUser.platform, type: currentReportType,
        area, hName, hPhone, ageRange: age, gender, year, tags: Array.from(selectedTags), timestamp: new Date().toISOString(), specificData, evidence
    };

    try {
        const result = await callGAS(payload);
        alert(result?.message || "建檔完成");
        location.reload();
    } catch (e) { alert("建檔失敗"); switchView('view-report'); }
}

// --- 6. ToS 與 UI 管理 ---
function openToSModal(force = false) {
    const modal = document.getElementById('tos-modal');
    const acceptBtn = document.getElementById('btn-accept-tos');
    const content = document.getElementById('tos-content');
    modal.classList.remove('hidden');
    if (force) {
        document.getElementById('tos-close-btn').style.display = 'none';
        acceptBtn.disabled = true;
        content.onscroll = () => { if (content.scrollTop + content.clientHeight >= content.scrollHeight - 5) { acceptBtn.disabled = false; acceptBtn.innerText = "我同意"; } };
    }
}
function acceptToS() { localStorage.setItem('tos_v1', 'true'); document.getElementById('tos-modal').classList.add('hidden'); }
function checkFirstTimeUser() { if (!localStorage.getItem('tos_v1')) openToSModal(true); }
function switchView(vId) { ['view-search', 'view-loading', 'view-results', 'view-report', 'view-admin-tool'].forEach(id => { const v = document.getElementById(id); if (v) v.classList.toggle('hidden', id !== vId); }); }

function resetApp() { 
    if(document.getElementById('in-name')) document.getElementById('in-name').value = ''; 
    if(document.getElementById('in-phone')) document.getElementById('in-phone').value = ''; 
    switchView('view-search'); 
}

function openReportView() {
    // 🔓 徹底解鎖：不再進行前端身分判定，直接進入回報頁面
    switchView('view-report');
    renderTags();
}
function openTakedownForm() { window.open("https://line.me/R/ti/p/@994sepbg", '_blank'); }

// --- 7. 初始化 ---
window.onload = async () => {
    await initializeAuth();
    if (document.getElementById('report-year')) {
        const s = document.getElementById('report-year'), cur = new Date().getFullYear();
        for (let y = cur; y >= 2018; y--) { const o = document.createElement('option'); o.value = y; o.innerText = `${y} 年`; s.appendChild(o); }
    }
    switchView('view-search');
    updateLiveStats();
    checkFirstTimeUser();
};

// --- 8. 管理員工具 ---
async function adminSearch() {
    const name = document.getElementById('admin-search-name').value.trim();
    const phone = document.getElementById('admin-search-phone').value.trim();
    if (!name) return alert("請輸入目標對象姓名");

    switchView('view-loading');
    const hName = await hashData(name);
    const hPhone = phone.length === 4 ? await hashData(phone) : "";
    const hUid = await hashData(currentUser.uid);

    try {
        const res = await callGAS({ action: 'admin_search', uid: hUid, platform: currentUser.platform, hName, hPhone });
        if (res.status === 'ok') {
            switchView('view-admin-tool');
            const container = document.getElementById('admin-results-container');
            const results = document.getElementById('admin-results');
            container.classList.remove('hidden');
            results.innerHTML = '';

            if (!res.records || res.records.length === 0) {
                results.innerHTML = '<p class="sub-text">找不到任何符合的活躍紀錄。</p>';
                return;
            }

            res.records.forEach(rec => {
                const el = document.createElement('div');
                el.style = "padding: 15px; border-bottom: 1px solid var(--card-border); margin-bottom: 10px;";
                el.innerHTML = `
                    <div style="color:var(--text); font-weight:700;">內部流水號: ${rec.id}</div>
                    <div class="sub-text">建檔日期: ${rec.date} | 標籤數: ${rec.tags}</div>
                    <button class="btn-small-outline" style="color:var(--danger); border-color:var(--danger); margin-top:10px;" onclick="adminTakedown('${rec.id}')">強制下架此筆紀錄</button>
                `;
                results.appendChild(el);
            });
        } else {
            alert(res.message || "搜尋失敗或您沒有管理員權限");
            switchView('view-admin-tool');
        }
    } catch (e) {
        alert("網路連線異常，請稍後再試。");
        switchView('view-admin-tool');
    }
}

async function adminTakedown(recordId) {
    if (!confirm("確定要強制下架這筆紀錄嗎？下架後系統將永久不再採用此筆數據！")) return;
    switchView('view-loading');
    const hUid = await hashData(currentUser.uid);
    try {
        const res = await callGAS({ action: 'admin_takedown', uid: hUid, platform: currentUser.platform, recordId });
        if (res.status === 'ok') {
            alert("✅ 紀錄已成功下架！");
            document.getElementById('admin-results-container').classList.add('hidden');
        } else {
            alert(res.message || "下架失敗");
        }
    } catch(e) {
        alert("網路連線異常，請稍後再試。");
    }
    switchView('view-admin-tool');
}

async function updateLiveStats() {
    try {
        const s = await callGAS({ action: "stats" });
        if (s && s.status === "ok") {
            document.getElementById("stat-total").innerText = s.total || 0;
            document.getElementById("stat-high").innerText = s.highRisk || 0;
            document.getElementById("stat-today").innerText = s.today || 0;
        }
    } catch (e) { }
}