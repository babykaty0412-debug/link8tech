# link8tech — 雲端點餐系統

![CI](https://github.com/babykaty0412-debug/link8tech/actions/workflows/ci.yml/badge.svg)

以 **Vue 3 + TypeScript + Vite** 打造的雲端點餐／餐飲營運系統作品：從顧客點餐、後台訂單、廚房出單到師傅排班的完整流程，並以「訂單永不遺失」為核心設計了離線佇列。

> 🔗 線上展示：_(部署後補上連結)_
> 📦 原始碼：https://github.com/babykaty0412-debug/link8tech

---

## 🗺 五大頁面

| 頁面 | 路由 | 說明 |
| --- | --- | --- |
| 📊 儀表板 | `/` | 統計卡（數字跳動）、狀態圓餅圖、來源長條圖 |
| 🛒 顧客點餐 | `/menu` | 菜單分類、購物車、送單即時進後台；**離線送單自動暫存** |
| 🧾 訂單管理 | `/orders` | 搜尋（去抖）／篩選／排序、**URL query 同步**（重新整理／分享網址不掉條件）、明細、改狀態（樂觀更新+回滾） |
| 🍳 廚房出單 | `/kitchen` | 待處理 FIFO 票卡、等待計時、逾時急單警示、一鍵出餐、顯示送餐人員 |
| 📅 師傅排班 | `/schedule` | 週曆網格指派、同日連班 ⚠ 警示、重複指派雙層擋下、**師傅管理 CRUD**（仍有排班者不可刪除） |

另有**送餐人員指派**：訂單明細可指派／更換送餐師傅（樂觀更新＋回滾），列表與廚房票卡同步顯示 🛵 誰送。

## 📴 離線不掉單（核心亮點）

餐飲現場網路不穩是常態，掉一張單就是賠一筆錢：

1. 斷網時送單 → 訂單存入 `localStorage` 佇列，畫面明確提示「已暫存」
2. 恢復連線 → **全域監聽**（掛在 Layout，不受換頁影響）自動補送
3. app 啟動時也補送一次（涵蓋「離線關閉、連線後重開」）
4. `flushQueue` 有防重入旗標，多觸發點併發也不會重複下單
5. 補送失敗的單留在佇列等下一次，**永不遺失**

## 🛠 技術棧

| 分類 | 技術 |
| --- | --- |
| 框架 | Vue 3（`<script setup>`）、TypeScript |
| 路由 | Vue Router（懶載入 code-splitting，每頁獨立 chunk） |
| 狀態 | Pinia（orders / cart / schedule 三個 store） |
| 假後端 | MSW（攔截真 fetch 的 REST mock：訂單、菜單、排班 CRUD） |
| 測試 | Vitest + happy-dom（23 項） |
| 建置 | Vite |

## 🚀 啟動

```bash
npm install
npm run dev       # 開發，http://localhost:5173
npm run test      # 單元測試（23 項）
npm run build     # 型別檢查 + production build
```

## 🧱 架構

```
src/
├─ router/        路由 + 懶載入
├─ stores/        orders（訂單）/ cart（點餐+離線佇列）/ schedule（排班）
├─ layouts/       AppLayout：側邊欄外殼 + 全域離線補送監聽
├─ views/         Dashboard / Menu / Orders / Kitchen / Schedule
├─ components/    FilterBar / StatsCard / StatusDonut / SourceBar /
│                 OrderList / OrderDetail / StatusBadge
├─ composables/   useDebounce / useTheme / useCountUp / useNow / useOnline
├─ api/           fetch client（GET/POST/PATCH/DELETE，換真後端只改 BASE_URL）
├─ mocks/         MSW handlers + 種子資料（mock 後端）
├─ types/         order / menu / schedule 型別
└─ utils/ constants/  格式化工具、繁中文案
```

**資料流：單向 + 單一資料來源**

- 訂單資料只在 orders store 一份；點餐送單（cart）、廚房出餐（kitchen）、後台改狀態（orders）都操作同一份，儀表板統計與各頁畫面自動同步。
- `filteredOrders`、`stats`、`selectedOrder` 皆為 `computed` 衍生狀態，不存副本。
- 寫入操作一律「樂觀更新 + 失敗回滾」：改狀態、移除排班皆同。
- 排班衝突「前端檢查 + 後端 409」雙層防護；同日連班以 derived `dayCount` 標示警示。

## ✅ 測試（Vitest，23 項）

- `stores/orders`：載入、統計、篩選、排序、搜尋、樂觀更新成功／失敗回滾
- `stores/cart`：購物車計算、線上送單、**離線入佇列不打 API、恢復補送清空、補送失敗不遺失**
- `stores/schedule`：載入、重複指派前端擋下、連班警示、移除失敗回滾
- `useDebounce`、`utils/format`

## 🍜 對應餐飲現場的設計考量

| 現場痛點 | 對應設計 |
| --- | --- |
| 網路不穩、訂單不能掉 | 離線佇列 + 全域補送 + 防重入 |
| 尖峰時廚房要快 | KDS 大字票卡、FIFO、逾 15 分急單脈動警示 |
| 排班不能撞班 | 重複指派雙層擋下、連班警示、週負載統計 |
| 多裝置狀態一致 | 單一資料來源，改一處全站同步 |
| 後端平行開發 | MSW 網路層 mock，前端打真 fetch，接真後端零改畫面 |

## 🧭 取捨與後續

- 出餐完成以 `paid` 表示（demo 簡化）；實務會擴充 `preparing/served` 狀態機。
- 排班為週視圖單週；可擴充月視圖、拖拉調班、班別範本。
- 後續：WebSocket 即時推播新單、URL query 同步、E2E（Playwright）、多分店切換。

---

作者：喵娃（[babykaty0412-debug](https://github.com/babykaty0412-debug)）
