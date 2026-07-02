# 雲端訂單管理 Dashboard

以 **Vue 3 + TypeScript + Vite** 打造的雲端點餐／訂單管理前端作品。從資料流、狀態管理到測試與 mock 後端，皆以「可維護、可擴充、貼近生產環境」為目標設計。

> 🔗 線上展示：_(部署後補上連結)_
> 📦 原始碼：_(GitHub 連結)_

---

## ✨ 功能

- 訂單列表：編號、客戶、來源、狀態、金額、時間，客戶頭像與來源標籤
- 關鍵字搜尋（去抖）、狀態／來源篩選、時間／金額排序
- 點選訂單看明細、修改狀態（樂觀更新 + 失敗回滾）
- 儀表板：統計卡（數字跳動）+ 狀態圓餅圖 + 來源長條圖
- 深色／淺色模式（記憶偏好）、骨架屏載入、空／錯誤狀態
- 桌機列表明細左右並排、手機上下排列並自動捲動定位

## 🛠 技術棧

| 分類 | 技術 |
| --- | --- |
| 框架 | Vue 3（`<script setup>`）、TypeScript |
| 路由 | Vue Router（懶載入 code-splitting） |
| 狀態 | Pinia |
| 假後端 | MSW（Mock Service Worker，攔截真 fetch） |
| 測試 | Vitest + happy-dom |
| 建置 | Vite |

## 🚀 啟動

```bash
npm install
npm run dev       # 開發，http://localhost:5173
npm run test      # 執行單元測試
npm run build     # 型別檢查 + production build
```

## 🧱 架構

```
src/
├─ router/        路由定義 + 懶載入
├─ stores/        Pinia store（訂單狀態，跨頁共享）
├─ layouts/       AppLayout 側邊欄外殼
├─ views/         DashboardView / OrdersView
├─ components/    可複用 UI 元件 × 7
├─ composables/   useDebounce / useTheme / useCountUp
├─ api/           資料存取層（真 fetch client）
├─ mocks/         MSW handlers + 假資料（mock 後端）
├─ types/         Order / OrderItem / OrderStatus 等型別
├─ utils/         格式化工具
└─ constants/     繁中文案對照
```

**資料流：單向 + 單一資料來源**

- 狀態集中在 Pinia store；元件只讀 state、呼叫 action，不持有商業邏輯。
- `orders` 為唯一原始資料；`filteredOrders`、`stats`、`selectedOrder` 皆為 `computed` 衍生狀態。
- 明細只記 `selectedOrderId`，物件即時查出 → 改狀態後列表／明細／統計三處自動同步。
- **API 層以真 `fetch` 呼叫 REST**，開發／展示由 MSW 攔截；接真後端只改 `BASE_URL`，畫面零改動。

## ✅ 測試（Vitest，14 項）

- `format`：金額千分位、日期格式化
- `useDebounce`：延遲更新、連續輸入只觸發一次
- `stores/orders`：載入、統計、狀態／來源篩選、排序、搜尋、樂觀更新成功、**失敗回滾**

## 🍜 對應雲端點餐系統的設計考量

此作品刻意處理了餐飲 POS 的核心痛點：

| 現場痛點 | 本專案對應設計 |
| --- | --- |
| 訂單不能掉單 | 樂觀更新 + 失敗自動回滾，畫面與後端一致 |
| 多裝置即時同步 | 單一資料來源，改狀態多處連動 |
| 後端可獨立開發 | API 層解耦 + MSW mock，後端未就緒也能平行開發 |
| 系統穩定 | Loading／Empty／Error 狀態 + 單元測試 |

## 🧭 取捨與後續

- **未過度設計**：規模適中，Pinia + composable 已足夠；未上多餘的抽象層。
- **資料觀察**：初始資料 `amount` 與品項小計不一致，以 `amount` 為權威值並於明細標示。
- **後續可擴充**：離線佇列（斷網不掉單）、廚房出單視圖（KDS）、WebSocket 即時推播、URL query 同步、E2E 測試。

---

作者：喵娃（[babykaty0412-debug](https://github.com/babykaty0412-debug)）
