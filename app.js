// --- 0. 核心安全配置 ---
const SYSTEM_SALT = "TrU$t_Sca1e_8xP@qL9!mZ";

// 🔗 GAS Web App 部署 URL（部署後請替換為實際 URL）
// 這是前端唯一需要硬編碼的設定值，其他設定皆存放於 GAS 指令碼屬性
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbw0dAVQ2HOQDvJKNBpj0FT1HJIPW6GLCdJkye3419ZMi2lzFqTUExD8oHdvLG4H_pKq/exec";

// --- 0.5 通用 API 呼叫函式 ---
async function callGAS(payload) {
    if (!GAS_API_URL || GAS_API_URL === "https://script.google.com/macros/s/AKfycbw0dAVQ2HOQDvJKNBpj0FT1HJIPW6GLCdJkye3419ZMi2lzFqTUExD8oHdvLG4H_pKq/exec") {
        console.warn("⚠️ GAS_API_URL 尚未配置，使用 Demo 模式");
        return null;
    }

    // 建立逾時控制 (10秒)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
        const resp = await fetch(GAS_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return await resp.json();
    } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            throw new Error('連線逾時，請檢查網路狀態');
        }
        throw err;
    }
}

// 🌟 新增：全域使用者身分狀態
let currentUser = {
    uid: 'GUEST_DEFAULT',
    platform: 'WEB',
    quota: 0,
    displayName: '訪客測試',
    pictureUrl: '',
    personalCount: 0,
    _liffId: ''
};

// --- 1. 安全模組：加鹽雜湊 (SHA-256) ---
// --- 1. 安全模組：標準 SHA-256 (Web Crypto) ---
async function hashData(text) {
    if (!text) return "";
    const saltedText = text + SYSTEM_SALT;
    const msgBuffer = new TextEncoder().encode(saltedText);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 🔧 管理員身分識別 (點擊獲取完整加密 ID)
async function toggleUidDisplay() {
    const uidEl = document.getElementById('display-uid');
    if (!uidEl || !currentUser.uid) return;

    if (uidEl.innerText !== "●●●●●●●●") {
        uidEl.innerText = "●●●●●●●●";
        return;
    }

    try {
        const hUid = await hashData(currentUser.uid);
        // 🌟 這裡取消了 substring 限制，直接顯示完整 64 字元
        uidEl.innerText = hUid;
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(hUid);
            showToast("✅ 完整加密 ID 已複製！", "success");
        }
    } catch (e) {
        uidEl.innerText = "獲取失敗";
        console.error(e);
    }
}

// 🌟 新增：雙軌環境偵測與登入模組 (LINE / Telegram)
async function initializeAuth() {
    try {
        // 偵測 A：Telegram (每日 1 次)
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
            const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
            currentUser = {
                uid: `TG_${tgUser.id}`,
                platform: 'TELEGRAM',
                quota: 1,
                displayName: tgUser.first_name || 'TG User',
                pictureUrl: tgUser.photo_url || ''
            };
            console.log("🛡️ Telegram 模式");
            updateUserInfoUI();
            return;
        }

        // 偵測 B：LINE (每日 3 次)
        if (window.liff) {
            const liffId = currentUser._liffId || '';
            if (liffId) {
                await liff.init({ liffId: liffId });
                if (liff.isLoggedIn()) {
                    const profile = await liff.getProfile();
                    currentUser = {
                        uid: `LINE_${profile.userId}`,
                        platform: 'LINE',
                        quota: 3,
                        displayName: profile.displayName,
                        pictureUrl: profile.pictureUrl
                    };
                    console.log("🛡️ LINE 模式");
                    updateUserInfoUI();
                    return;
                }
            }
        }

        // 偵測 C：網頁訪客 (試用版)
        currentUser = { uid: 'TRIAL_USER', platform: 'WEB', quota: 0, displayName: '訪客測試 (WEB)', pictureUrl: '' };
        console.log("🛑 訪客模式");
        updateUserInfoUI();

    } catch (error) {
        console.error("Auth Init Error:", error);
        updateUserInfoUI();
    }
}

// 🌟 新增：更新介面使用者資訊
function updateUserInfoUI() {
    const userBar = document.getElementById('user-bar');
    const avatarImg = document.getElementById('user-avatar');
    const nameSpan = document.getElementById('user-name');
    const quotaSpan = document.getElementById('user-quota');

    if (!userBar) return;

    userBar.classList.remove('hidden');
    nameSpan.innerText = currentUser.displayName;

    if (currentUser.pictureUrl) {
        avatarImg.src = currentUser.pictureUrl;
    } else {
        avatarImg.src = "https://www.w3schools.com/howto/img_avatar.png";
    }

    let pCount = currentUser.personalCount || 0;
    let platformText = "";
    if (currentUser.platform === 'LINE') {
        platformText = "⭐ LINE 認證用戶";
    } else if (currentUser.platform === 'TELEGRAM') {
        platformText = "🔹 Telegram 用戶";
    } else {
        platformText = "☁️ 網頁試用模式";
    }

    quotaSpan.innerText = `${platformText} | 您已貢獻 ${pCount} 筆紀錄`;
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

// --- 2.5 服務條款 (ToS) 管理模組 ---
let isForceReading = false; // 是否為強制閱讀模式

/** 
 * 開啟服務條款 Modal
 * @param {boolean} force - 是否為強制初次閱讀 (不允許關閉直到同意)
 */
function openToSModal(force = false) {
    isForceReading = force;
    const modal = document.getElementById('tos-modal');
    const closeBtn = document.getElementById('tos-close-btn');
    const content = document.getElementById('tos-content');
    const acceptBtn = document.getElementById('btn-accept-tos');

    modal.classList.remove('hidden');

    if (force) {
        // 強制閱讀模式：隱藏右上角 X，按鈕需滾動解鎖
        closeBtn.style.display = 'none';
        acceptBtn.disabled = true;
        acceptBtn.innerText = "請向下滑動閱讀完畢以同意條款";
        acceptBtn.style.display = 'block';

        // 監聽滾動以啟用同意按鈕
        content.addEventListener('scroll', handleToSScroll);
        // 如果螢幕夠大，內容不需要滾動，直接解鎖
        if (content.scrollHeight <= content.clientHeight) {
            enableAcceptBtn();
        }
    } else {
        // 主動查閱模式：顯示右上角 X，隱藏底部同意按鈕
        closeBtn.style.display = 'block';
        acceptBtn.style.display = 'none';
        content.removeEventListener('scroll', handleToSScroll);
    }
}

function handleToSScroll() {
    const content = document.getElementById('tos-content');
    // 判斷是否滾動到底部 (容許 10px 誤差)
    if (content.scrollTop + content.clientHeight >= content.scrollHeight - 10) {
        enableAcceptBtn();
    }
}

function enableAcceptBtn() {
    const acceptBtn = document.getElementById('btn-accept-tos');
    acceptBtn.disabled = false;
    acceptBtn.innerText = "我已詳細閱讀並完全同意";
}

function closeToSModal() {
    // 只有在非強制閱讀模式下才允許點擊 X 或背景關閉
    if (!isForceReading) {
        document.getElementById('tos-modal').classList.add('hidden');
    }
}

function acceptToS() {
    // 將同意狀態寫入瀏覽器 LocalStorage
    localStorage.setItem('blindfold_tos_accepted_v1', 'true');
    document.getElementById('tos-modal').classList.add('hidden');
    isForceReading = false;
}

// 檢查是否初次登入
function checkFirstTimeUser() {
    const hasAccepted = localStorage.getItem('blindfold_tos_accepted_v1');
    if (!hasAccepted) {
        // 未同意過，強制彈出
        openToSModal(true);
    }
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
            // 試用版給予 85-99 之間的隨機分數
            const demoScore = Math.floor(Math.random() * 15) + 85;
            updateResultsUI(demoScore);
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
    const gender = document.getElementById('in-gender') ? document.getElementById('in-gender').value : "";

    const phoneRaw = document.getElementById('in-phone').value;
    // 🛡️ 修正：使用 slice(-4) 精準擷取「末四碼」
    const phoneClean = String(phoneRaw).replace(/\D/g, '').slice(-4);

    if (!name) return alert("查詢對象之姓名為必填");
    if (phoneRaw && phoneClean.length !== 4) return alert("電話末四碼輸入格式錯誤，必須為 4 位數字");

    switchView('view-loading');
    const hName = await hashData(name);
    const hPhone = phoneClean ? await hashData(phoneClean) : "";
    const hUid = await hashData(currentUser.uid);

    const payload = {
        action: "search",
        uid: hUid,
        platform: currentUser.platform,
        hName,
        hPhone,
        ageRange,
        gender
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

        // 🔒 權限檢查：若是管理員，顯示下架工具按鈕
        const adminBtn = document.getElementById('btn-admin-manage');
        if (adminBtn) {
            adminBtn.style.display = result.isAdmin ? "block" : "none";
        }

        updateLiveStats(); // 搜尋後也同步一次數據
    } catch (err) {
        console.error('搜尋 API 呼叫失敗:', err);
        showToast(`❌ 查詢失敗: ${err.message}`, 'danger');
        switchView('view-search');
    }
}

// --- 5. 結果渲染引擎 ---
function updateResultsUI(input) {
    const adviceEl = document.getElementById('risk-advice');

    // ── 模式判斷 ──
    if (typeof input === 'number') {
        // 【Demo 測試模式】
        const R = input;
        let text = '建議依一般流程作業，視需要優化條件';
        if (R > 80) text = '建議強化風險控管或評估承租必要性';
        else if (R > 50) text = '建議補強第三方擔保或查驗佐證資料';
        else if (R > 20) text = '建議依標準程序查核，並落實約定事項';

        // 更新滑軌指標
        const riskKey = R > 80 ? 'HIGH' : R > 50 ? 'MEDIUM' : R > 20 ? 'LOW' : 'NONE';
        updateSpectrum(riskKey);

        // 建議文字
        if (adviceEl) adviceEl.innerText = text;

        // 🌟 Demo 模式模擬標籤數據 (展示完整衰退層級)
        const demoTags = [
            { text: "💸 租金給付遲延", count: 2, weight: 1.0 }, // 1年內 (鮮紅/100%)
            { text: "✨ 屋況維持極佳", count: 1, weight: 0.7 }, // 1-2年 (稍微淡化/70%)
            { text: "🏚️ 設備毀損紀錄", count: 1, weight: 0.4 }, // 2-3年 (50%透明/⏳)
            { text: "📦 堆置雜物爭議", count: 3, weight: 0.1 }  // 3年以上 (灰階/10%)
        ];
        renderResultTags(demoTags);
        renderQueryRef();

    } else {
        // 【正式連線模式】
        const { riskLevel, tags } = input;

        let text;
        if (riskLevel === 'HIGH') {
            text = '建議強化風險控管或評估承租必要性';
        } else if (riskLevel === 'MEDIUM') {
            text = '建議補強第三方擔保或查驗佐證資料';
        } else if (riskLevel === 'LOW') {
            text = '建議依標準程序查核，並落實約定事項';
        } else {
            text = '建議依一般流程作業，視需要優化條件';
        }

        // 更新滑軌指標
        updateSpectrum(riskLevel || 'NONE');

        // 建議文字
        if (adviceEl) adviceEl.innerText = text;

        // 🌟 正式模式渲染標籤
        renderResultTags(tags || []);
        renderQueryRef();
    }

    // 🌟 修正：顯示法律頁腳
    const legalFooter = document.querySelector('.legal-footer');
    if (legalFooter) {
        legalFooter.style.display = 'block';
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

/** 🌟 新增：渲染結果標籤與衰退權重 */
function renderResultTags(tags) {
    const container = document.getElementById('results-tags');
    const wrapper = document.getElementById('results-tags-container');
    if (!container || !wrapper) return;

    container.innerHTML = '';

    if (!tags || tags.length === 0) {
        wrapper.classList.add('hidden');
        return;
    }

    wrapper.classList.remove('hidden');

    tags.forEach(tag => {
        const tagEl = document.createElement('div');
        tagEl.className = 'ui-tag';

        // 歷史衰退視覺邏輯 (精細 4 層級)
        if (tag.weight <= 0.1) tagEl.classList.add('decay-10');
        else if (tag.weight <= 0.4) tagEl.classList.add('decay-40');
        else if (tag.weight <= 0.75) tagEl.classList.add('decay-70');

        tagEl.innerHTML = `
            ${tag.text}
            <span class="tag-count">${tag.count}</span>
        `;

        container.appendChild(tagEl);
    });
}

/** 🌟 新增：渲染查詢流水號 */
function renderQueryRef() {
    const refEl = document.getElementById('query-ref');
    if (!refEl) return;
    const randomRef = 'REF-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    refEl.innerText = `查詢流水號: ${randomRef}`;
}


// --- 6. 回報系統邏輯 ---
// --- 輔助函式：切換回報身分 ---
function setReportType(type) {
    // 1. 更新全域變數
    currentReportType = type;

    // 2. 切換按鈕的視覺外觀 (藍色 active 狀態)
    document.querySelectorAll('.identity-switch button').forEach(btn => {
        btn.classList.remove('active');
    });
    const targetBtn = document.getElementById(`btn-report-${type}`);
    if (targetBtn) targetBtn.classList.add('active');

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
    const gender = document.getElementById('report-gender').value;
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
    const hUid = await hashData(currentUser.uid);

    const payload = {
        action: "report",
        uid: hUid,
        platform: currentUser.platform,
        type: currentReportType,
        area: area,
        hName,
        hPhone,
        ageRange: age,
        gender: gender,
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
        updateLiveStats(); // 提交成功後立即更新儀表板
        resetApp();
    } catch (err) {
        console.error('回報 API 呼叫失敗:', err);
        showToast(`❌ 連線異常: ${err.message}`, 'danger');
        switchView('view-report');
    }
}

// 🌟 新增：吐司訊息 (Toast Notification)
function showToast(message, type = 'info') {
    let toast = document.getElementById('ui-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'ui-toast';
        toast.className = 'ui-toast';
        document.body.appendChild(toast);
    }

    toast.innerText = message;
    toast.className = `ui-toast show ${type}`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}

// --- 7. 通用輔助函式 ---

/** 開啟回報視圖 */
function openReportView() {
    if (currentUser.uid === 'BLOCKED') {
        alert("🔒 權限限制：\n您的帳號已被停權，無法使用建檔功能。");
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
    if (document.getElementById('in-name')) document.getElementById('in-name').value = '';
    if (document.getElementById('in-phone')) document.getElementById('in-phone').value = '';
    if (document.getElementById('in-age')) document.getElementById('in-age').selectedIndex = 0;
    if (document.getElementById('in-gender')) document.getElementById('in-gender').selectedIndex = 0;

    // 清空回報頁表單
    if (document.getElementById('report-name')) document.getElementById('report-name').value = '';
    if (document.getElementById('report-phone')) document.getElementById('report-phone').value = '';
    if (document.getElementById('report-age')) document.getElementById('report-age').selectedIndex = 0;
    if (document.getElementById('report-gender')) document.getElementById('report-gender').selectedIndex = 0;
    const reportArea = document.getElementById('report-area');
    const reportYear = document.getElementById('report-year');
    const agreement = document.getElementById('report-agreement');

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

    // 🌟 修正：重置結果頁標籤
    const tagsContainer = document.getElementById('results-tags');
    if (tagsContainer) tagsContainer.innerHTML = '';
    const tagsWrapper = document.getElementById('results-tags-container');
    if (tagsWrapper) tagsWrapper.classList.add('hidden');
    const queryRef = document.getElementById('query-ref');
    if (queryRef) queryRef.innerText = '';

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
    const fallback = { userCount: 1204, personalCount: 0 };
    try {
        const result = await callGAS({
            action: "stats",
            uid: currentUser.uid
        });
        const data = (result && result.status === 'ok') ? result : fallback;
        const stUser = document.getElementById('stat-user-num');
        if (stUser) stUser.innerText = (data.userCount || 0).toLocaleString();

        // 更新全域使用者狀態中的筆數
        currentUser.personalCount = data.personalCount || 0;
        updateUserInfoUI();

        console.log("📊 儀表板數據已同步更新");
    } catch (error) {
        console.error("無法更新儀表板數據:", error);
        const stUser = document.getElementById('stat-user-num');
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

// ============================================================
//  ⚙️ 管理員專用函式
// ============================================================

// 🔧 管理員身分識別 (純前端計算，點擊即複製)
async function toggleUidDisplay() {
    const uidEl = document.getElementById('display-uid');
    if (!uidEl || !currentUser.uid) return;

    // 若已顯示，則切換回隱藏
    if (uidEl.innerText !== "●●●●●●●●") {
        uidEl.innerText = "●●●●●●●●";
        return;
    }

    try {
        // 1. 直接進行前端加密
        const hUid = await hashData(currentUser.uid);
        
        // 2. 顯示完整代碼
        uidEl.innerText = hUid;
        
        // 3. 自動複製
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(hUid);
            showToast("✅ 加密 ID 已複製到剪貼簿", "success");
        } else {
            showToast("🔑 請長按選取並複製 ID", "info");
        }
        
    } catch (err) {
        uidEl.innerText = "識別碼計算中...";
        console.error("UID Error:", err);
    }
}

/**
 * 管理員搜尋匹配紀錄
 */
async function adminSearchRecords() {
    const name = document.getElementById('adm-name').value.trim();
    const phoneRaw = document.getElementById('adm-phone').value.trim();
    const phoneClean = phoneRaw.replace(/\D/g, '').slice(-4);

    if (!name) return alert("請輸入姓名");

    switchView('view-loading');

    try {
        const hName = await hashData(name);
        const hPhone = phoneClean ? await hashData(phoneClean) : "";
        const hUid = await hashData(currentUser.uid);

        const payload = {
            action: "admin_search",
            uid: hUid,
            hName,
            hPhone
        };

        const result = await callGAS(payload);
        switchView('view-admin-tool');

        if (result && result.status === "ok") {
            renderAdminResults(result.records);
        } else {
            alert(result.message || "搜尋失敗或無權限");
        }
    } catch (e) {
        alert("管理員連線錯誤");
        switchView('view-admin-tool');
    }
}

/**
 * 渲染管理員搜尋結果
 */
function renderAdminResults(records) {
    const area = document.getElementById('adm-results-area');
    const list = document.getElementById('adm-results-list');
    if (!area || !list) return;

    area.style.display = 'block';
    list.innerHTML = '';

    if (!records || records.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:#999;">查無任何紀錄</p>';
        return;
    }

    records.forEach(rec => {
        const div = document.createElement('div');
        div.className = 'adm-record-item';
        div.innerHTML = `
            <small>ID: ${rec.id} | 時間: ${rec.date} | 地區: ${rec.area}</small>
            <div style="margin-bottom:8px;">
                <b>標籤:</b> ${JSON.parse(rec.tags).join(', ')}
            </div>
            <button class="btn-small-outline" style="color:#e74c3c; border-color:#ff7675;" 
                onclick="adminTakedown('${rec.id}')">🚫 立即下架</button>
        `;
        list.appendChild(div);
    });
}

/**
 * 執行下架
 */
async function adminTakedown(recordId) {
    if (!confirm(`確定要下架 ID: ${recordId} 的紀錄嗎？下架後前端將無法查詢。`)) return;

    try {
        const hUid = await hashData(currentUser.uid);
        const payload = {
            action: "admin_takedown",
            uid: hUid,
            recordId: recordId
        };

        const result = await callGAS(payload);
        if (result && result.status === "ok") {
            alert("下架成功！");
            adminSearchRecords(); // 重新整理清單
        } else {
            alert(result.message || "下架失敗");
        }
    } catch (e) {
        alert("下架連線錯誤");
    }
}

// --- 8.6 Toast 提示系統 ---
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerText = message;

    container.appendChild(toast);

    // 觸發進場動畫
    setTimeout(() => toast.classList.add('show'), 10);

    // 3秒後自動移除
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- 9. 初始化 ---
window.onload = async () => {
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

    // 🌟 執行初次使用者條款檢查 (放置於初始化最後一步)
    checkFirstTimeUser();
};