// --- 0. 核心安全配置 ---
const SYSTEM_SALT = "TrU$t_Sca1e_8xP@qL9!mZ";

// 🔗 GAS Web App 部署 URL（部署後請替換為實際 URL）
// 這是前端唯一需要硬編碼的設定值，其他設定皆存放於 GAS 指令碼屬性
const GAS_API_URL = "YOUR_GAS_WEB_APP_URL_HERE";

// --- 0.5 通用 API 呼叫函式 ---
async function callGAS(payload) {
    if (!GAS_API_URL || GAS_API_URL === "YOUR_GAS_WEB_APP_URL_HERE") {
        console.warn("⚠️ GAS_API_URL 尚未配置，使用 Demo 模式");
        return null; // 回傳 null 表示未連線
    }
    const resp = await fetch(GAS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json();
}

// 🌟 新增：全域使用者身分狀態
let currentUser = {
    uid: 'GUEST_DEFAULT',
    platform: 'WEB',
    quota: 0 // 預設 0 次
};

// --- 1. 安全模組：加鹽雜湊 (SHA-256) ---
async function hashData(text) {
    if (!text) return "";
    const saltedText = text + SYSTEM_SALT;
    const msgBuffer = new TextEncoder().encode(saltedText);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 🌟 新增：雙軌環境偵測與登入模組 (LINE / Telegram)
async function initializeAuth() {
    try {
        // 偵測 A：Telegram (每日 1 次)
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
            const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
            currentUser = { uid: `TG_${tgUser.id}`, platform: 'TELEGRAM', quota: 1 };
            console.log("🛡️ Telegram 模式：每日 1 次查詢額度");
            return;
        }

        // 偵測 B：LINE (每日 3 次)
        if (window.liff) {
            // LIFF_ID 從後端指令碼屬性取得，透過 initializeAuth 參數傳入
            const liffId = currentUser._liffId || '';
            if (!liffId) {
                console.warn("⚠️ LIFF ID 尚未從後端取得，LINE 登入功能無法運作");
            } else {
                await liff.init({ liffId: liffId });
                if (liff.isLoggedIn()) {
                    const profile = await liff.getProfile();
                    currentUser = { uid: `LINE_${profile.userId}`, platform: 'LINE', quota: 3 };
                    console.log("🛡️ LINE 模式：每日 3 次查詢額度");
                    return;
                }
            }
        }

        // 偵測 C：網頁訪客 (試用版 - 僅能看 Demo)
        currentUser = { uid: 'TRIAL_USER', platform: 'WEB', quota: 0 };
        console.log("🛑 訪客模式：啟動試用版引流邏輯");

    } catch (error) {
        currentUser = { uid: 'TRIAL_USER', platform: 'WEB', quota: 0 };
    }
}

// --- 2. 視圖切換管理 ---
function switchView(viewId) {
    const allViews = ['view-search', 'view-loading', 'view-results', 'view-report'];
    allViews.forEach(id => {
        const view = document.getElementById(id);
        if (view) {
            view.classList.toggle('hidden', id !== viewId);
        }
    });
}

// --- 3. 雙向評鑑標籤庫資料 (Version 2.8 完整版) ---
const TAG_LIBRARY = {
    tenant: [
        { id: "T1", text: "✨ 屋況維持極佳", impact: "good" },
        { id: "T2", text: "🛠️ 擅自更動裝修", impact: "bad" },
        { id: "T3", text: "🤫 維持鄰里安寧", impact: "good" },
        { id: "T4", text: "📦 堆置雜物爭議", impact: "bad" },
        { id: "T5", text: "🛡️ 設備妥善維護", impact: "good" },
        { id: "T6", text: "🏚️ 設備毀損紀錄", impact: "bad" },
        { id: "T7", text: "📱 溝通聯繫順暢", impact: "good" },
        { id: "T8", text: "🔊 鄰里噪音投訴", impact: "bad" },
        { id: "T9", text: "🧹 空間整潔清空", impact: "good" },
        { id: "T10", text: "🚬 菸寵異味殘留", impact: "bad" },
        { id: "T11", text: "💰 準時給付租金", impact: "good" },
        { id: "T12", text: "💸 租金給付遲延", impact: "bad" }
    ],
    landlord: [
        { id: "L1", text: "💸 押金如期返還", impact: "good" },
        { id: "L2", text: "🔍 押金扣留爭議", impact: "bad" },
        { id: "L3", text: "⚡ 修繕處理迅速", impact: "good" },
        { id: "L4", text: "⏳ 修繕推託延遲", impact: "bad" },
        { id: "L5", text: "🏠 尊重房客隱私", impact: "good" },
        { id: "L6", text: "👣 未經授權入內", impact: "bad" },
        { id: "L7", text: "💧 台水台電計費", impact: "good" }, // 新增：優良水電
        { id: "L8", text: "📈 超收水電費用", impact: "bad" },  // 新增：風險水電
        { id: "L9", text: "📜 契約條款透明", impact: "good" },
        { id: "L10", text: "⚖️ 契約條款嚴苛", impact: "bad" },
        { id: "L11", text: "👼 配合申報稅補", impact: "good" },
        { id: "L12", text: "🚫 拒絕租金補貼", impact: "bad" },
        { id: "L13", text: "🤝 溝通明理友善", impact: "good" }, // 新增：優良溝通
        { id: "L14", text: "💢 情緒勒索施壓", impact: "bad" }   // 新增：風險溝通
    ],
    student: [
        { id: "S1", text: "🎓 專注學業單純", impact: "good" },
        { id: "S2", text: "🎉 帶人開趴喧嘩", impact: "bad" },
        { id: "S3", text: "🧹 宿舍維持整潔", impact: "good" },
        { id: "S4", text: "🛵 機車違規停放", impact: "bad" },
        { id: "S5", text: "🤝 家長理性溝通", impact: "good" },
        { id: "S6", text: "🛡️ 家長過度介入", impact: "bad" },
        { id: "S7", text: "💰 租金按時繳納", impact: "good" },
        { id: "S8", text: "💸 寒暑假欠繳/空窗", impact: "bad" }
    ],
};

let currentReportType = 'tenant';
let selectedTags = new Set();

// --- 4. 搜尋邏輯 (已修復整合版) ---
async function handleSearch() {
    // 🌟 訪客試用版邏輯
    if (currentUser.platform === 'WEB') {
        switchView('view-loading');
        setTimeout(() => {
            // 試用版固定給予「極高風險」的 Demo，讓訪客知道系統的威力
            updateResultsUI(99);
            switchView('view-results');
            // 在結果頁額外提示
            alert("✨ 這是「試用版預覽」。\n若要查詢真實資料庫，請點擊下方按鈕加入 LINE 或 Telegram 官方帳號。");
        }, 1500);
        return;
    }

    // 🌟 正式用戶 (LINE/TG) 查詢邏輯
    const name = document.getElementById('in-name').value.trim();

    // 💡 CIO 提醒：搜尋功能不分區，因此將 area 相關變數與阻擋邏輯移除
    // 若你有新增年齡欄位 (in-age) 作為輔助，可保留讀取
    const ageRange = document.getElementById('in-age') ? document.getElementById('in-age').value : "";

    const phoneRaw = document.getElementById('in-phone').value;
    // 🛡️ 修正：使用 slice(-4) 精準擷取「末四碼」
    const phoneClean = String(phoneRaw).replace(/\D/g, '').slice(-4);

    if (!name) return alert("查詢對象之姓名為必填");
    if (phoneRaw && phoneClean.length !== 4) return alert("電話末四碼輸入格式錯誤，必須為 4 位數字");

    switchView('view-loading');
    const hName = await hashData(name);
    const hPhone = phoneClean ? await hashData(phoneClean) : "";

    const payload = {
        action: "search",
        uid: currentUser.uid,
        platform: currentUser.platform,
        hName,
        hPhone,
        ageRange
    };

    console.log("🚀 [搜尋 Payload]:", payload);

    try {
        const result = await callGAS(payload);
        if (result === null) {
            // GAS 未配置 → Demo fallback
            updateResultsUI(95);
        } else if (result.status === 'ok') {
            updateResultsUI(result);
        } else {
            alert(result.message || '查詢失敗，請稍後再試');
            switchView('view-search');
            return;
        }
        switchView('view-results');
    } catch (err) {
        console.error('搜尋 API 呼叫失敗:', err);
        alert('連線異常，請稍後再試');
        switchView('view-search');
    }
}

// --- 5. 結果渲染引擎 ---
function updateResultsUI(input) {
    const adviceEl = document.getElementById('risk-advice');
    const userCard = document.querySelector('.user-data');
    const legalFooter = document.querySelector('.legal-footer');

    // ── 模式判斷 ──
    if (typeof input === 'number') {
        // 【Demo 測試模式】
        const R = input;
        let cfg = { color: 'green', text: '建議依一般流程作業，視需要優化條件' };
        if (R > 80) cfg = { color: 'red', text: '建議強化風險控管或評估承租必要性' };
        else if (R > 50) cfg = { color: 'orange', text: '建議補強第三方擔保或查驗佐證資料' };
        else if (R > 20) cfg = { color: 'yellow', text: '建議依標準程序查核，並落實約定事項' };

        // 更新滑軌指標
        const riskKey = R > 80 ? 'HIGH' : R > 50 ? 'MEDIUM' : R > 20 ? 'LOW' : 'NONE';
        updateSpectrum(riskKey);

        // 建議文字
        if (adviceEl) adviceEl.innerText = cfg.text;

        // 卡片邊框色
        if (userCard) userCard.className = 'result-card user-data border-' + cfg.color;

        // Demo：模擬有回報紀錄
        if (R > 80) {
            if (userCard) userCard.style.display = 'block';
            const userTitle = document.getElementById('res-user-title');
            if (userTitle) userTitle.innerText = '共 1 筆回報';
            const userTagsRow = document.getElementById('res-user-tags');
            if (userTagsRow) userTagsRow.innerHTML = `<span class="ui-tag user-tag">📦 雜物領主</span>`;
            if (legalFooter) legalFooter.style.display = 'block';
        } else {
            if (userCard) userCard.style.display = 'none';
            if (legalFooter) legalFooter.style.display = 'none';
        }

    } else {
        // 【正式連線模式】
        const { riskLevel, courtInfo, userInfo } = input;

        let cfg;
        if (riskLevel === 'HIGH') {
            cfg = { color: 'red', text: '建議強化風險控管或評估承租必要性' };
        } else if (riskLevel === 'MEDIUM') {
            cfg = { color: 'orange', text: '建議補強第三方擔保或查驗佐證資料' };
        } else if (riskLevel === 'LOW') {
            cfg = { color: 'yellow', text: '建議依標準程序查核，並落實約定事項' };
        } else {
            cfg = { color: 'green', text: '建議依一般流程作業，視需要優化條件' };
        }

        // 更新滑軌指標
        updateSpectrum(riskLevel || 'NONE');

        // 建議文字
        if (adviceEl) adviceEl.innerText = cfg.text;

        // 卡片邊框色
        if (userCard) userCard.className = `result-card user-data border-${cfg.color}`;

        // 平台建檔紀錄
        if (userInfo && userInfo.found) {
            if (userCard) userCard.style.display = 'block';
            const userTitle = userCard.querySelector('h3');
            if (userTitle) {
                userTitle.innerText = `共 ${userInfo.reportCount || 0} 筆回報`;
                userTitle.style.display = 'block';
            }
            const userSummary = userCard.querySelector('.summary');
            if (userSummary) userSummary.style.display = 'none';

            const tagRow = userCard.querySelector('.tag-row');
            if (tagRow) {
                tagRow.innerHTML = '';
                if (userInfo.tags && userInfo.tags.length > 0) {
                    userInfo.tags.forEach(tagText => {
                        const span = document.createElement('span');
                        span.className = `ui-tag user-tag`;
                        span.innerText = tagText;
                        tagRow.appendChild(span);
                    });
                }
            }
            if (legalFooter) legalFooter.style.display = 'block';
        } else {
            if (userCard) userCard.style.display = 'none';
            if (legalFooter) legalFooter.style.display = 'none';
        }
    }
}

// --- 5.5 風險滑軌更新 ---
function updateSpectrum(riskKey) {
    // 使用 rAF 延遲確保 DOM 已渲染可見（避免 hidden 狀態下 transition 不觸發）
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            const pointer = document.getElementById('spectrum-pointer');
            if (!pointer) return;

            // 四段各佔 25%，指標停在該區段中央
            const posMap = {
                NONE: '12.5%',   // 綠區中央
                LOW: '37.5%',    // 黃區中央
                MEDIUM: '62.5%', // 橘區中央
                HIGH: '87.5%'    // 紅區中央
            };

            // 對應區段索引（0=綠, 1=黃, 2=橘, 3=紅）
            const segIndex = { NONE: 0, LOW: 1, MEDIUM: 2, HIGH: 3 };

            // 移動指標
            pointer.style.left = posMap[riskKey] || '12.5%';

            // 高亮對應色塊，其餘淡化
            const segs = document.querySelectorAll('.spectrum-seg');
            segs.forEach((seg, i) => {
                seg.classList.toggle('active', i === segIndex[riskKey]);
            });
        });
    });
}


// --- 6. 回報系統邏輯 ---
// --- 輔助函式：切換回報身分 ---
function setReportType(type) {
    // 1. 更新全域變數
    currentReportType = type;

    // 2. 切換按鈕的視覺外觀 (藍色 active 狀態)
    document.getElementById('btn-report-tenant').classList.remove('active');
    document.getElementById('btn-report-student').classList.remove('active');
    document.getElementById('btn-report-landlord').classList.remove('active');
    document.getElementById(`btn-report-${type}`).classList.add('active');

    // 3. 動態切換專屬輸入欄位 (隱藏/顯示)
    const fieldsTenant = document.getElementById('fields-tenant');
    const fieldsLandlord = document.getElementById('fields-landlord');

    if (type === 'tenant' || type === 'student') {
        // 房客與學生，共用「承租型態與租金」欄位
        if (fieldsTenant) fieldsTenant.style.display = 'block';
        if (fieldsLandlord) fieldsLandlord.style.display = 'none';
    } else if (type === 'landlord') {
        // 房東，顯示「出租人屬性與出租型態」欄位
        if (fieldsTenant) fieldsTenant.style.display = 'none';
        if (fieldsLandlord) fieldsLandlord.style.display = 'block';
    }

    // 4. 重置並重新渲染光譜標籤
    selectedTags.clear(); // 清空已選標籤
    renderTags(); // 重新渲染標籤（renderTags 自動讀取 currentReportType）
}

// --- 渲染特徵標籤 (中立合併版) ---
function renderTags() {
    const container = document.getElementById('tag-container');
    if (!container) return;

    container.innerHTML = '';

    TAG_LIBRARY[currentReportType].forEach(tag => {
        const chip = document.createElement('div');
        chip.className = 'tag-chip';
        chip.dataset.impact = tag.impact; // 保留 data-impact 供 CSS hover 效果使用
        chip.innerText = tag.text;

        chip.onclick = () => {
            if (selectedTags.has(tag.text)) {
                selectedTags.delete(tag.text);
                chip.classList.remove('selected');
            } else {
                selectedTags.add(tag.text);
                chip.classList.add('selected');
            }
        };

        container.appendChild(chip);
    });
}

async function submitReport() {
    const area = document.getElementById('report-area').value;
    const name = document.getElementById('report-name').value.trim();
    const age = document.getElementById('report-age').value;
    const phoneRaw = document.getElementById('report-phone').value;
    const year = document.getElementById('report-year').value;
    const isAgreed = document.getElementById('report-agreement').checked;

    const phoneClean = String(phoneRaw).replace(/\D/g, '').slice(-4);

    if (!isAgreed) return alert("請勾選同意法律免責切結書");
    if (!area || !name || !age || !year) return alert("請完整填寫生活圈、姓名、年齡與發生年份");
    // 電話為必填，且輸入後必須恰好 4 位純數字
    if (!phoneRaw || phoneClean.length !== 4) return alert("電話末四碼必須為 4 位數字");
    if (selectedTags.size === 0) return alert("請至少選擇一個特徵標籤");

    let specificData = {};
    if (currentReportType === 'tenant' || currentReportType === 'student') {
        // 房客與學生共用「承租型態與租金」欄位
        const tTarget = document.getElementById('report-tenant-target');
        const tRent = document.getElementById('report-tenant-rent');
        if (!tTarget.value || !tRent.value) return alert("請選擇承租型態與租金級距");
        specificData = { target: tTarget.value, rentLevel: tRent.value };
    } else if (currentReportType === 'landlord') {
        const lType = document.getElementById('report-landlord-type');
        const lTarget = document.getElementById('report-landlord-target');
        if (!lType.value || !lTarget.value) return alert("請選擇出租人屬性與出租型態");
        specificData = { landlordType: lType.value, target: lTarget.value };
    }

    switchView('view-loading');

    const hName = await hashData(name);
    const hPhone = await hashData(phoneClean);

    const payload = {
        action: "report",
        uid: currentUser.uid,
        platform: currentUser.platform,
        type: currentReportType,
        area: area,
        hName,
        hPhone,
        ageRange: age,
        year: year,
        specificData: specificData,
        tags: Array.from(selectedTags),
        timestamp: new Date().toISOString()
    };

    console.log("🚀 [回報 Payload]:", payload);

    try {
        const result = await callGAS(payload);
        if (result === null) {
            // GAS 未配置 → Demo fallback
            alert("✅ [Demo] 紀錄已完成單向加密建檔。原始輸入資訊已於本地端清除。");
        } else if (result.status === 'ok') {
            alert("✅ " + (result.message || "紀錄已完成單向加密建檔。"));
        } else {
            alert("❌ " + (result.message || "回報失敗，請稍後再試"));
            switchView('view-report');
            return;
        }
        resetApp();
    } catch (err) {
        console.error('回報 API 呼叫失敗:', err);
        alert('連線異常，請稍後再試');
        switchView('view-report');
    }
}

// --- 7. 通用輔助函式 ---

/** 開啟回報視圖 */
function openReportView() {
    if (currentUser.platform === 'WEB' || currentUser.uid === 'BLOCKED') {
        alert("🔒 安全驗證要求：\n請使用 LINE 開啟本系統，以解鎖建立履約紀錄建檔之權限。");
        return;
    }
    if (currentUser.platform === 'TELEGRAM') {
        alert("🔒 訪客權限限制：\n為確保資料庫真實性，Telegram 環境目前僅開放「查詢」功能。若需新增履約紀錄，請改用 LINE 官方帳號開啟本系統。");
        return;
    }

    switchView('view-report');
    renderTags();
}

/** 返回搜尋視圖，並重置所有輸入 */
function resetApp() {
    switchView('view-search');

    // 清空搜尋頁表單
    const inName = document.getElementById('in-name');
    const inAge = document.getElementById('in-age');
    const inPhone = document.getElementById('in-phone');
    if (inName) inName.value = '';
    if (inAge) inAge.selectedIndex = 0;
    if (inPhone) inPhone.value = '';

    // 清空回報頁表單
    const reportName = document.getElementById('report-name');
    const reportPhone = document.getElementById('report-phone');
    const reportArea = document.getElementById('report-area');
    const reportAge = document.getElementById('report-age');
    const reportYear = document.getElementById('report-year');
    const agreement = document.getElementById('report-agreement');

    if (reportName) reportName.value = '';
    if (reportPhone) reportPhone.value = '';
    if (reportArea) reportArea.selectedIndex = 0;
    if (reportAge) reportAge.selectedIndex = 0;
    if (reportYear) reportYear.selectedIndex = 0;
    if (agreement) agreement.checked = false;

    const selects = document.querySelectorAll('.dynamic-fields select');
    selects.forEach(s => s.selectedIndex = 0);

    selectedTags.clear();
    renderTags();

    const legalFooter = document.querySelector('.legal-footer');
    if (legalFooter) legalFooter.style.display = 'none';

    window.scrollTo(0, 0);
}

function openTakedownForm() {
    // 💡 替換說明：請將 @your_line_oa_id 改為你真實的 LINE 官方帳號 ID (記得保留 @ 符號)
    const lineOaUrl = "https://line.me/R/ti/p/@your_line_oa_id";

    // 開啟新視窗/喚醒 LINE App 進入聊天室
    window.open(lineOaUrl, '_blank');
}

// --- 8. 即時數據儀表板更新 ---
async function updateLiveStats() {
    // Demo 預設值（當 GAS 未配置時使用）
    const fallback = { courtCount: 5012345, userCount: 1204 };
    try {
        const result = await callGAS({ action: "stats" });
        const data = (result && result.status === 'ok') ? result : fallback;
        const stCourt = document.getElementById('stat-court-num');
        const stUser = document.getElementById('stat-user-num');
        if (stCourt) stCourt.innerText = (data.courtCount || 0).toLocaleString();
        if (stUser) stUser.innerText = (data.userCount || 0).toLocaleString();
        console.log("📊 儀表板數據已同步更新");
    } catch (error) {
        console.error("無法更新儀表板數據:", error);
        // 失敗時使用 fallback
        const stCourt = document.getElementById('stat-court-num');
        const stUser = document.getElementById('stat-user-num');
        if (stCourt) stCourt.innerText = fallback.courtCount.toLocaleString();
        if (stUser) stUser.innerText = fallback.userCount.toLocaleString();
    }
}

// --- 8.5 動態生成發生年份 ---
function generateYearOptions() {
    const yearSelect = document.getElementById('report-year');
    if (!yearSelect) return;

    // 自動取得當下時間並換算為民國年
    const currentYear = new Date().getFullYear();
    const twYear = currentYear - 1911; // 系統將自動算出 115

    // 清除舊選項，確保只保留第一個預設值
    yearSelect.length = 1;

    // 動態新增選項 1：今年 (例如：115年)
    yearSelect.add(new Option(`${twYear}年 (近期)`, twYear.toString()));

    // 動態新增選項 2：前三年 (例如：112-114年)
    yearSelect.add(new Option(`${twYear - 3}-${twYear - 1}年`, `${twYear - 3}-${twYear - 1}`));

    // 動態新增選項 3：更早以前 (例如：111年以前)
    yearSelect.add(new Option(`${twYear - 4}年以前`, `${twYear - 4}以前`));
}

// --- 輔助函式：將 Source_JID 轉換為標準裁判字號 ---
function formatJID(sourceJID) {
    if (!sourceJID) return "查看法院公開判決"; // 若無資料的備用文字

    const parts = sourceJID.split(',');
    // 確認字串有用逗號隔開，且長度足夠 (SJEV, 108, 重建簡, 39...)
    if (parts.length >= 4) {
        // 取出對應的欄位並組合
        return `${parts[1]}年度${parts[2]}字第${parts[3]}號`;
    }
    return sourceJID; // 若格式不符，直接印出原值
}

// --- 9. 初始化 ---
window.onload = async () => {
    // 先從後端取得設定值（LIFF_ID 等）
    try {
        const config = await callGAS({ action: 'config' });
        if (config && config.status === 'ok') {
            currentUser._liffId = config.liffId || '';
            console.log('🔧 後端設定已載入');
        }
    } catch (err) {
        console.warn('⚠️ 無法取得後端設定，使用預設值:', err.message);
    }

    await initializeAuth();
    generateYearOptions();
    switchView('view-search');
    renderTags();
    updateLiveStats();
};