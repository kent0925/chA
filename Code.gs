// ============================================================
//  蒙眼租賃履約紀錄系統 - GAS 後端
//  版本：1.1.0
//  注意：部署為 Web App 時，請選擇「以我的身分執行」+「任何人都能存取」
//
//  所有敏感設定值請透過「指令碼屬性」管理：
//    GAS 編輯器 → 專案設定 → 指令碼屬性
//    必要屬性：SPREADSHEET_ID, LIFF_ID
//    或執行 setupScriptProperties() 一次性寫入預設值
// ============================================================

// --- 從指令碼屬性讀取設定值 ---
function getScriptProp(key) {
    return PropertiesService.getScriptProperties().getProperty(key) || '';
}

/**
 * 🛡️ 雙重加鹽安全架構：第二層雜湊處理
 * 接收前端已加鹽的雜湊值，結合後端絕對機密 Pepper 再次雜湊
 */
function getFinalHash(clientHash) {
    if (!clientHash) return "";
    const pepper = getScriptProp('SECRET_PEPPER');
    if (!pepper) return clientHash; // 若未配置 Pepper 則退回第一層（不建議）

    const rawHash = Utilities.computeDigest(
        Utilities.DigestAlgorithm.SHA_256,
        clientHash + pepper,
        Utilities.Charset.UTF_8
    );

    return rawHash.map(function(byte) {
        let b = byte < 0 ? byte + 256 : byte;
        return ('0' + b.toString(16)).slice(-2);
    }).join('');
}

// --- 每日查詢額度設定 ---
const QUOTA = {
    LINE:     3,  // LINE 用戶每日 3 次
    TELEGRAM: 1   // Telegram 用戶每日 1 次
};

// --- 標籤權重映射表（與前端 TAG_LIBRARY 文字完全一致）---
// 正值 = 風險加分（負面），負值 = 風險抵銷（正面）
const TAG_WEIGHT_MAP = {
    // ══ 房客篇：行為與環境風險（房東建立）══
    "🛠️ 擅自更動裝修":  25,   // 毀損：格局魔改等級
    "🏚️ 設備毀損紀錄":  30,   // 毀損：拆房專家等級
    "📦 堆置雜物爭議":  20,   // 環境：雜物領主等級
    "🚬 菸寵異味殘留":  10,   // 環境：嗅覺入侵等級
    "🔊 鄰里噪音投訴":  15,   // 鄰里：公關大師等級
    "💸 租金給付遲延":  15,   // 財務：租金拖延
    "✨ 屋況維持極佳": -15,   // 天使：退租如新
    "🛡️ 設備妥善維護": -15,   // 天使：設備守護
    "🤫 維持鄰里安寧": -10,   // 天使：社區隱形
    "🧹 空間整潔清空": -10,   // 天使：環境維護
    "📱 溝通聯繫順暢":  -5,   // 天使：溝通良好
    "💰 準時給付租金": -10,   // 天使：財務信用
    // ══ 學生篇：房東建立（與房客共用風險邏輯）══
    "🎉 帶人開趴喧嘩":  15,   // 鄰里：噪音擾鄰
    "🛵 機車違規停放":  10,   // 環境：違規停放
    "🛡️ 家長過度介入":  10,   // 管理：溝通困難
    "💸 寒暑假欠繳/空窗": 15,  // 財務：空窗斷租
    "🎓 專注學業單純": -10,   // 天使：單純穩定
    "🧹 宿舍維持整潔": -10,   // 天使：環境維護
    "🤝 家長理性溝通":  -5,   // 天使：溝通良好
    "💰 租金按時繳納": -10,   // 天使：財務信用
    // ══ 房東篇：經營與誠信風險（房客建立）══
    "🔍 押金扣留爭議":  35,   // 財務：押金收割
    "⚖️ 契約條款嚴苛":  30,   // 合約：合約霸凌
    "👣 未經授權入內":  25,   // 隱私：突擊檢查
    "🚫 拒絕租金補貼":  20,   // 稅務：稅務黑戶
    "⏳ 修繕推託延遲":  15,   // 管理：修繕拖延
    "📈 超收水電費用":  10,   // 管理：超收費用
    "💢 情緒勒索施壓":  15,   // 管理：溝通施壓
    "💸 押金如期返還": -20,   // 天使：押金速還
    "⚡ 修繕處理迅速": -25,   // 天使：修繕秒讀
    "🏠 尊重房客隱私": -15,   // 天使：邊界模範
    "💧 台水台電計費":  -5,   // 天使：合理計費
    "📜 契約條款透明": -10,   // 天使：合約透明
    "👼 配合申報稅補": -10,   // 天使：稅務配合
    "🤝 溝通明理友善":  -5    // 天使：溝通良好
};

// ============================================================
//  主入口：doPost
// ============================================================
function doPost(e) {
    try {
        const data = JSON.parse(e.postData.contents);
        const action = data.action;

        let result;
        if (action === "config") {
            result = handleGetConfig();
        } else if (action === "search") {
            result = handleSearch(data);
        } else if (action === "report") {
            result = handleReport(data);
        } else if (action === "stats") {
            result = handleStats(data);
        } else if (action === "get_admin_code") {
            result = { status: "ok", adminCode: getFinalHash(data.uid) };
        } else if (action === "log_admin_apply") {
            logAdminApply(data.name, data.hUid);
            result = { status: "ok" };
        } else if (action === "admin_search") {
            result = handleAdminSearch(data);
        } else if (action === "admin_takedown") {
            result = handleAdminTakedown(data);
        } else {
            result = { status: "error", message: "未知的操作類型" };
        }

        return ContentService
            .createTextOutput(JSON.stringify(result))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
        logAdmin("ERROR", "SYSTEM", { error: err.message });
        return ContentService
            .createTextOutput(JSON.stringify({ status: "error", message: "伺服器內部錯誤" }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

// ============================================================
//  【設定】回傳前端所需的設定值
// ============================================================
function handleGetConfig() {
    return {
        status: "ok",
        liffId: getScriptProp('LIFF_ID')
    };
}

// ============================================================
//  【搜尋】處理函式
// ============================================================
function handleSearch(data) {
    const { uid: clientUid, platform, hName: clientHName, hPhone: clientHPhone, ageRange, gender } = data;

    // 🛡️ 第二層加鹽處理
    const uid = getFinalHash(clientUid);
    const hName = getFinalHash(clientHName);
    const hPhone = getFinalHash(clientHPhone);

    // --- 安全驗證：不接受訪客查詢 ---
    if (!uid || uid === 'TRIAL_USER' || uid === 'GUEST_DEFAULT') {
        return { status: "denied", message: "請使用 LINE 或 Telegram 登入後查詢" };
    }

    // --- 額度驗證 ---
    const quotaResult = checkAndConsumeQuota(uid, platform);
    if (!quotaResult.allowed) {
        return {
            status: "quota_exceeded",
            message: `今日查詢次數已達上限（${QUOTA[platform] || 1} 次），請明日再試`
        };
    }

    // --- 查詢民間回報 ---
    const userInfo = searchReports(hName, hPhone);

    // --- 計算風險等級（純標籤計分）---
    const riskLevel = calcRiskLevel(userInfo);

    // --- 計算關聯度（比對資訊點數量）---
    const correlation = calcCorrelation(hPhone, ageRange, userInfo);

    // --- 產生查詢序號 ---
    const queryRef = generateQueryRef();

    // --- 記錄管理日誌 ---
    logAdmin("search", uid, { platform, riskLevel, correlation, queryRef });

    // --- 計算個人已回報筆數 ---
    const personalStats = handleStats({ uid });

    return {
        status: "ok",
        riskLevel,
        correlation,
        queryRef,
        isAdmin: checkIsAdmin(uid), // 🔒 回傳權限狀態
        userInfo: userInfo || { found: false, reportCount: 0, tags: [] },
        personalCount: personalStats.personalCount
    };
}

/**
 * 🔒 權限校驗：檢查雜湊後的 UID 是否在管理員名單中
 */
function checkIsAdmin(uid) {
    if (!uid) return false;
    const adminUids = getScriptProp('ADMIN_UIDS').split(',');
    return adminUids.includes(uid);
}

// ============================================================
//  【核心】關聯度計算
//  LOW：僅姓名相符（資訊點不足）
//  MEDIUM：姓名 + 部分特徵（回報紀錄 + 年齡範圍）
//  HIGH：多項強特徵吻合（電話末四碼 + 其他特徵）
// ============================================================
function calcCorrelation(hPhone, ageRange, userInfo) {
    let points = 1; // 姓名必定有（基礎 1 分）

    // 有提供電話末四碼且有比對到回報紀錄
    if (hPhone && userInfo && userInfo.found && userInfo.phoneMatched) {
        points += 2; // 電話命中是強特徵
    }

    // 有提供年齡範圍
    if (ageRange && ageRange !== 'ALL') {
        points += 1;
    }

    // 有多筆民間回報
    if (userInfo && userInfo.reportCount >= 2) {
        points += 1;
    }

    // 判定等級
    if (points >= 4) return 'HIGH';
    if (points >= 2) return 'MEDIUM';
    return 'LOW';
}

// ============================================================
//  【輔助】產生查詢序號（格式：MY-YYMMDD-XXXX）
// ============================================================
function generateQueryRef() {
    const now = new Date();
    const tw = Utilities.formatDate(now, "Asia/Taipei", "yyMMdd");
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `MY-${tw}-${rand}`;
}

// ============================================================
//  【回報】處理函式
// ============================================================
function handleReport(data) {
    const { 
        uid: clientUid, platform, type, area, ageRange, gender, year, specificData, tags, timestamp,
        hName: clientHName, 
        hPhone: clientHPhone 
    } = data;

    // 🛡️ 第二層加鹽處理
    const uid = getFinalHash(clientUid);
    const hName = getFinalHash(clientHName);
    const hPhone = getFinalHash(clientHPhone);

    // --- 安全驗證：只允許 LINE 用戶回報 ---
    if (!uid || !uid.startsWith('LINE_')) {
        return { status: "denied", message: "回報功能僅限 LINE 用戶使用" };
    }

    // --- 基本欄位驗證 ---
    if (!hName || !hPhone || !area || !type || !year || !tags || tags.length === 0) {
        return { status: "error", message: "回報資料不完整" };
    }

    // --- 評價冷卻期（同一 uid + hName 於 12 小時內不可重複回報）---
    const COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 小時（毫秒）
    const now = new Date();
    const ss = SpreadsheetApp.openById(getScriptProp('SPREADSHEET_ID'));
    const sheet = ss.getSheetByName(SHEET_REPORTS);
    const allData = sheet.getDataRange().getValues();

    for (let i = 1; i < allData.length; i++) {
        const row = allData[i];
        // col index: 0=id, 1=hName, 2=hPhone, 3=ageRange, 4=area, 5=type,
        //            6=year, 7=specificData, 8=tags, 9=reporterUid, 10=platform, 11=timestamp, 12=status, 13=reportDate
        if (row[9] === uid && row[1] === hName) {
            const reportTime = new Date(row[11]);
            if ((now - reportTime) < COOLDOWN_MS) {
                return { status: "error", message: "評價冷卻期為 12 小時，請稍後再試，避免情緒化連續建檔" };
            }
        }
    }

    // --- 寫入 Reports Sheet ---
    const newId = allData.length; // 流水號
    sheet.appendRow([
        newId,                          // 0: id
        hName,                          // 1: hName
        hPhone,                         // 2: hPhone
        ageRange,                       // 3: ageRange
        gender,                         // 4: gender (新加入)
        area,                           // 5: area
        type,                           // 6: type
        year,                           // 7: year
        JSON.stringify(specificData),   // 8: specificData
        JSON.stringify(tags),           // 9: tags
        uid,                            // 10: reporterUid
        platform,                       // 11: platform
        timestamp,                      // 12: timestamp
        "active",                       // 13: status
        getTaiwanDate()                 // 14: reportDate (台灣日期)
    ]);

    logAdmin("report", uid, { type, area, tagCount: tags.length });

    return { status: "ok", message: "紀錄已完成單向加密建檔" };
}

// ============================================================
//  【儀表板統計】處理函式
// ============================================================
function handleStats(input) {
    const uidRaw = (input && input.uid) ? input.uid : null;
    const uid = getFinalHash(uidRaw);
    const ss = SpreadsheetApp.openById(getScriptProp('SPREADSHEET_ID'));

    // 民間回報總筆數（只計 active 狀態）
    const reportSheet = ss.getSheetByName(SHEET_REPORTS);
    let userCount = 0;
    let personalCount = 0;

    if (reportSheet && reportSheet.getLastRow() > 1) {
        // 讀取包含 reporterUid(10) 與 status(13) 的範圍
        const data = reportSheet.getRange(2, 11, reportSheet.getLastRow() - 1, 4).getValues(); 
        // col 0: reporterUid, col 3: status
        data.forEach(row => {
            const rUid = row[0];
            const rStatus = row[3];
            if (rStatus === "active") {
                userCount++;
                if (uid && rUid === uid) {
                    personalCount++;
                }
            }
        });
    }

    return {
        status: "ok",
        userCount,
        personalCount
    };
}

// （已移除法院資料查詢函式 searchCourtData）

// ============================================================
//  【核心】查詢民間回報
// ============================================================
function searchReports(hName, hPhone) {
    const ss = SpreadsheetApp.openById(getScriptProp('SPREADSHEET_ID'));
    const sheet = ss.getSheetByName(SHEET_REPORTS);
    if (!sheet || sheet.getLastRow() < 2) return { found: false, reportCount: 0, tags: [], phoneMatched: false };

    const data = sheet.getDataRange().getValues();
    // Reports 欄位：id | hName | hPhone | ageRange | gender | area | type | year | specificData | tags | reporterUid | platform | timestamp | status | reportDate
    //              0     1       2        3          4        5      6      7       8              9      10            11         12          13       14

    const matchedRows = [];
    let phoneMatched = false; // 追蹤電話是否有實際命中

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[13] !== "active") continue; // 略過已隱藏的紀錄 (status 移至 13)

        const nameMatch  = row[1] === hName;
        const phoneMatch = hPhone ? row[2] === hPhone : true; // 若未提供電話，只比對姓名

        if (nameMatch && phoneMatch) {
            matchedRows.push(row);
            // 電話有提供且確實命中
            if (hPhone && row[2] === hPhone) phoneMatched = true;
        }
    }

    if (matchedRows.length === 0) {
        return { found: false, reportCount: 0, tags: [], allTagsList: [], phoneMatched: false };
    }

    // 彙整所有標籤（去重 + 計次 + 權重累加）
    const tagMap = {}; 
    const allTagsList = []; // 完整標籤清單（含重複，供計分使用）
    matchedRows.forEach(row => {
        let tags = [];
        try { tags = JSON.parse(row[9]); } catch (e) {}
        const timestamp = row[12]; // timestamp 移至 12
        const weight = getDecayFactor(timestamp);

        tags.forEach(t => {
            if (!tagMap[t]) {
                tagMap[t] = { text: t, count: 0, weight: 0 };
            }
            tagMap[t].count += 1;
            // 權重取最高的那次（或取平均，此處採最高以保留最大預警）
            tagMap[t].weight = Math.max(tagMap[t].weight, weight);
            
            allTagsList.push({ text: t, timestamp: timestamp });
        });
    });

    // 轉換為陣列並依重要性（次數*權重）排序
    const sortedTags = Object.values(tagMap)
        .sort((a, b) => (b.count * b.weight) - (a.count * a.weight))
        .slice(0, 8); // 最多回傳 8 個特徵

    return {
        found: true,
        reportCount: matchedRows.length,
        tags: sortedTags,
        allTagsList, // 傳給 calcRiskLevel 計分
        phoneMatched // 傳給 calcCorrelation
    };
}

// ============================================================
//  【核心】風險等級計算（含歷史衰退機制）
//
//  計分規則：依 TAG_WEIGHT_MAP 標籤權重加總，並套用衰退係數
//
//  四級燈號閾值（R = 加權總分）：
//    🟢 綠標 R ≤ 20  → 建議依一般流程作業，視需要優化條件
//    🟡 黃標 21-50   → 建議依標準程序查核，並落實約定事項
//    🟠 橘標 51-80   → 建議補強第三方擔保或查驗佐證資料
//    🔴 紅標 R > 80  → 建議強化風險控管或評估承租必要性
// ============================================================
function calcRiskLevel(userInfo) {
    const allTagsList = (userInfo && userInfo.allTagsList) ? userInfo.allTagsList : [];

    // ── 標籤加權加總 ──
    let tagScore = 0;
    allTagsList.forEach(item => {
        // 取得標籤文字與回報時間（支援舊版字串格式與新版物件格式）
        const tagText = (typeof item === 'string') ? item : item.text;
        const timestamp = (typeof item === 'object') ? item.timestamp : null;

        const weight = TAG_WEIGHT_MAP[tagText];
        if (typeof weight === 'number') {
            const decayFactor = getDecayFactor(timestamp);
            const weightedScore = weight * decayFactor;
            tagScore += weightedScore;
            
            // Logger.log(`🏷️ 標籤: ${tagText}, 原始權重: ${weight}, 衰退係數: ${decayFactor}, 最終計分: ${weightedScore.toFixed(2)}`);
        }
    });

    Logger.log(`📊 風險計分：衰退後總分=${tagScore.toFixed(2)}`);

    // ── 四級燈號判定 ──
    if (tagScore > 80)  return "HIGH";    // 🔴 數據高度關聯
    if (tagScore >= 51) return "MEDIUM";  // 🟠 數據中度關聯
    if (tagScore >= 21) return "LOW";     // 🟡 數據低度關聯
    return "NONE";                        // 🟢 未偵測異常關聯
}

// ============================================================
//  【輔助】計算分數衰退係數
//  依據時間差距 (天數) 給予不同的加權：
//  - 365天內 (1年): 1.0
//  - 365~730天 (2年): 0.7
//  - 730~1095天 (3年): 0.4
//  - 1095~1825天 (3-5年): 0.1
//  - 1825天以上 (5年+): 0.0 (不計分)
// ============================================================
function getDecayFactor(timestampStr) {
    if (!timestampStr) return 1.0; // 無時間資料則不衰退

    try {
        const reportDate = new Date(timestampStr);
        if (isNaN(reportDate.getTime())) return 1.0; // 無效日期則不衰退

        const now = new Date();
        const diffMs = now - reportDate;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (diffDays < 365) return 1.0;
        if (diffDays < 730) return 0.7;
        if (diffDays < 1095) return 0.4;
        if (diffDays < 1825) return 0.1;
        return 0.0; // 5 年以上不計分
    } catch (e) {
        return 1.0;
    }
}

// ============================================================
//  【額度】查詢並消耗每日查詢次數
// ============================================================
function checkAndConsumeQuota(uid, platform) {
    // ── 管理員豁免邏輯 (採用原始 LINE UID/TG ID，不含前綴) ──
    const adminUids = getScriptProp('ADMIN_UIDS').split(',').map(id => id.trim());
    const rawUid = uid.replace(/^(LINE_|TG_)/, ''); // 移除 LINE_ 或 TG_ 前綴

    if (rawUid && adminUids.includes(rawUid)) {
        Logger.log(`👑 管理員 [${rawUid}] 豁免查詢限額`);
        return { allowed: true };
    }

    const maxQuota = QUOTA[platform] || 1;
    const today    = getTaiwanDate();

    const ss    = SpreadsheetApp.openById(getScriptProp('SPREADSHEET_ID'));
    const sheet = ss.getSheetByName(SHEET_USAGE);

    if (!sheet) {
        // 若工作表不存在，建立並允許本次查詢
        return { allowed: true };
    }

    const data = sheet.getDataRange().getValues();
    // UsageLogs 欄位：uid | platform | date | searchCount
    //                 0     1          2      3

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[0] === uid && row[2] === today) {
            const currentCount = Number(row[3]);
            if (currentCount >= maxQuota) {
                return { allowed: false };
            }
            // 更新計數
            sheet.getRange(i + 1, 4).setValue(currentCount + 1);
            return { allowed: true };
        }
    }

    // 今日首次查詢，新增一筆記錄
    sheet.appendRow([uid, platform, today, 1]);
    return { allowed: true };
}

// ============================================================
//  【輔助】GAS 版 SHA-256 加鹽雜湊（與前端邏輯一致）
// ============================================================
function hashDataGAS(text) {
    if (!text) return "";
    const saltedText = text + SYSTEM_SALT;
    const rawHash = Utilities.computeDigest(
        Utilities.DigestAlgorithm.SHA_256,
        saltedText,
        Utilities.Charset.UTF_8
    );
    return rawHash.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

// （已移除 buildCourtUrl 函式）

// ============================================================
//  【輔助】取得台灣時區的今日日期字串 (YYYY-MM-DD)
// ============================================================
function getTaiwanDate() {
    // 使用 GAS 內建的時區格式化，避免手動偏移造成日期錯誤
    return Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd");
}

// ============================================================
//  【輔助】寫入管理日誌
// ============================================================
function logAdmin(action, uid, detail) {
    try {
        const ss    = SpreadsheetApp.openById(getScriptProp('SPREADSHEET_ID'));
        const sheet = ss.getSheetByName(SHEET_ADMIN);
        if (!sheet) return;
        sheet.appendRow([action, uid, new Date().toISOString(), JSON.stringify(detail)]);
    } catch (e) {
        // 日誌失敗不影響主流程
    }
}

// ============================================================
//  【一次性工具】預建 Google Sheets 工作表結構
//  在 GAS 編輯器中手動執行一次即可
// ============================================================
function setupSheets() {
    const ssId = getScriptProp('SPREADSHEET_ID');
    if (!ssId) {
        Logger.log('❌ 請先執行 setupScriptProperties() 或在「指令碼屬性」中設定 SPREADSHEET_ID');
        return;
    }
    const ss = SpreadsheetApp.openById(ssId);

    // Reports
    let s = ss.getSheetByName(SHEET_REPORTS);
    if (!s) s = ss.insertSheet(SHEET_REPORTS);
    if (s.getLastRow() === 0) {
        s.appendRow(["id","hName","hPhone","ageRange","area","type","year","specificData","tags","reporterUid","platform","timestamp","status","reportDate"]);
    }

    // UsageLogs
    let u = ss.getSheetByName(SHEET_USAGE);
    if (!u) u = ss.insertSheet(SHEET_USAGE);
    if (u.getLastRow() === 0) {
        u.appendRow(["uid","platform","date","searchCount"]);
    }

    // AdminLog
    let a = ss.getSheetByName(SHEET_ADMIN);
    if (!a) a = ss.insertSheet(SHEET_ADMIN);
    if (a.getLastRow() === 0) {
        a.appendRow(["action","uid","timestamp","detail"]);
    }

    Logger.log("✅ 工作表結構建立完成。");
}

// ============================================================
//  ⚙️ 管理員專用：搜尋與下架邏輯
// ============================================================

/**
 * 管理員搜尋匹配紀錄
 */
function handleAdminSearch(data) {
    const { uid: clientUid, hName: clientHName, hPhone: clientHPhone } = data;
    const uid = getFinalHash(clientUid);
    
    // 🔒 權限校驗
    if (!checkIsAdmin(uid)) return { status: "denied", message: "無管理員權限" };

    const hName = getFinalHash(clientHName);
    const hPhone = getFinalHash(clientHPhone);

    const ss = SpreadsheetApp.openById(getScriptProp('SPREADSHEET_ID'));
    const sheet = ss.getSheetByName(SHEET_REPORTS);
    if (!sheet) return { status: "error", message: "資料表不存在" };

    const rows = sheet.getDataRange().getValues();
    const records = [];

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        // 索引 1: hName, 2: hPhone, 13: status
        const nameMatch = row[1] === hName;
        const phoneMatch = hPhone ? (row[2] === hPhone) : true;

        if (nameMatch && phoneMatch) {
            records.push({
                id: row[0],
                tags: row[9],
                date: row[14],
                area: row[5],
                status: row[13]
            });
        }
    }

    return { status: "ok", records };
}

/**
 * 管理員下架紀錄
 */
function handleAdminTakedown(data) {
    const { uid: clientUid, recordId } = data;
    const uid = getFinalHash(clientUid);

    // 🔒 權限校驗
    if (!checkIsAdmin(uid)) return { status: "denied", message: "無管理員權限" };

    const ss = SpreadsheetApp.openById(getScriptProp('SPREADSHEET_ID'));
    const sheet = ss.getSheetByName(SHEET_REPORTS);
    const rows = sheet.getDataRange().getValues();

    for (let i = 1; i < rows.length; i++) {
        if (rows[i][0].toString() === recordId.toString()) {
            // 索引 13 是 status，對應試算表第 14 欄
            sheet.getRange(i + 1, 14).setValue("hidden"); 
            logAdmin("takedown", uid, { recordId });
            return { status: "ok" };
        }
    }

    return { status: "error", message: "找不到該筆紀錄" };
}

// ============================================================
//  【一次性工具】初始化指令碼屬性
// ============================================================
function setupScriptProperties() {
    const props = PropertiesService.getScriptProperties();
    const requiredKeys = ['SPREADSHEET_ID', 'LIFF_ID', 'ADMIN_UIDS', 'SECRET_PEPPER'];

    const existing = props.getProperties();
    requiredKeys.forEach(key => {
        if (!existing[key]) {
            const defaultValue = (key === 'ADMIN_UIDS') ? 'UID_1,UID_2' : '';
            props.setProperty(key, defaultValue);
            Logger.log(`📝 已建立預設屬性：${key}（請至指令碼屬性填入正式值）`);
        } else {
            Logger.log(`✅ 屬性已存在：${key}`);
        }
    });

    Logger.log('\n🔧 請至「專案設定 → 指令碼屬性」填入正式值');
}

/**
 * 📝 紀錄管理員申請
 */
function logAdminApply(name, hUid) {
    const ss = SpreadsheetApp.openById(getScriptProp('SPREADSHEET_ID'));
    let logSheet = ss.getSheetByName('AdminApply');
    if (!logSheet) {
        logSheet = ss.insertSheet('AdminApply');
        logSheet.appendRow(['申請時間', 'LINE名稱', '加密ID (第一層)', '備註']);
        logSheet.getRange('A1:D1').setBackground('#dfe6e9').setFontWeight('bold');
    }
    logSheet.appendRow([new Date(), name, hUid, '點擊獲取代碼']);
}
