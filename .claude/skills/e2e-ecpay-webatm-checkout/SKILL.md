---
name: e2e-ecpay-webatm-checkout
description: Use when asked to run an end-to-end (E2E) test of the 花漾生活 flower shop checkout through Claude in Chrome — logging in, adding a product to the cart, checking out, and paying via 綠界 ECPay 網路ATM (e.g. 臺灣土地銀行) on the stage sandbox until the order shows 已付款. Triggers: "E2E 測試", "結帳流程測試", "綠界金流測試", "網路ATM", "土地銀行", port 3001.
---

# E2E：登入 → 購物車 → 結帳 → 綠界網路 ATM（土銀）→ 已付款

## Overview

以 Claude in Chrome 實際操作本專案前台，走完一筆以綠界**測試環境**（`payment-stage.ecpay.com.tw`）網路 ATM 付款之訂單，最後於本站訂單詳情頁確認「已付款」，並**存檔截圖附給使用者**。

全程僅於 `localhost:3001` 與綠界 stage 沙箱操作；帳密為專案測試帳號，金額為沙箱模擬，不涉真實款項。

## 前置

1. 先讀 `anthropic-skills:chrome-browser` skill，並以**一次** ToolSearch 載入：
   `tabs_context_mcp, tabs_create_mcp, tabs_close_mcp, navigate, computer, find, read_page, form_input, javascript_tool`
2. 檢查伺服器（PowerShell）：
   ```powershell
   try { (Invoke-WebRequest http://localhost:3001 -UseBasicParsing -TimeoutSec 3).StatusCode } catch { "DOWN" }
   ```
   若 DOWN，以 `run_in_background` 執行 `npm run start`，待輸出出現 `Server running on port 3001` 再續。
3. `tabs_context_mcp({createIfEmpty:true})` 取得分頁 ID，於本次 session 之分頁操作。

## 步驟

| # | 動作 | 要點 / 已知陷阱 |
|---|------|----------------|
| 1 | `navigate` → `http://localhost:3001/login` | 瀏覽器可能已以他人身分登入；直接以表單重新登入即可覆蓋 |
| 2 | 填 Email `admin@hexschool.com`、密碼 `12345678`，按「登入」 | 成功後導至 `/`，頁首顯示 `Admin` 與「後台管理」 |
| 3 | 首頁商品區加入一項商品 | **「加入購物車」按鈕（aria-label `將 <商品名> 加入購物車`）在桌面版 `md:opacity-0`，須 hover 商品圖才顯現。** 直接以 ref 點擊會靜默失敗、購物車仍空。做法：`scroll_to` 商品標題 → `hover` 商品圖 → `zoom` 找圖片右下角圓形「+」→ 以座標點擊 → 截圖確認右上出現「已將…加入購物車」toast |
| 4 | 等 toast 出現後才 `navigate` → `/cart` | 太快換頁會中斷加入請求。確認購物車有品項後按「前往結帳」 |
| 5 | `/checkout` 填收件資訊 | 收件人、Email、地址一律用**測試假資料**（如「測試收件人」「台北市中正區測試路1號」），勿填使用者真實個資。按「確認送出訂單」 |
| 6 | 轉至綠界 `payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5` | 先 `tabs_context_mcp` 確認 URL 為 **stage**；若非 stage（正式環境）立即停止並回報。**綠界網域 `get_page_text` 會 Permission denied**，改用 `screenshot` / `find` |
| 7 | 點「網路ATM」分頁 | 勿誤點「ATM虛擬帳號」（另一流程，頁面上有兩個「請選擇銀行」下拉，網路ATM 者為可見那個） |
| 8 | 選擇銀行 → 土地銀行 | 選單文字是 **「台灣土地銀行」**（非「臺」），`form_input` 以文字比對會失敗；直接用 value **`10001@2010@WebATM_LAND`** |
| 9 | 按「前往付款」→ 彈窗按「確認」 | 綠界跳出 WebATM 提醒視窗（HTML modal，非 JS alert），按中間藍色「確認」；之後出現「交易資料傳輸中」loading，`wait` 3–5 秒 |
| 10 | 進入 `pay-stage.ecpay.com.tw/MockMPPost/LandWebAtm` | 沙箱模擬銀行頁，欄位 `RC=0`（成功）、`CurAmt`=訂單金額。**勿改欄位**，按左上角 `Save` 送出 |
| 11 | 綠界顯示「付款成功」 | 核對訂單編號、付款方式「網路ATM」、金額。按「返回商店」 |
| 12 | 回到 `localhost:3001/orders/<id>?payment=pending` | 驗證：進度四步皆勾、標題「付款成功」、收據徽章 **「已付款」**、付款方式「綠界 ECPay」、金額相符 |

## 收尾：截圖（必做）

測試結束時，於最終訂單詳情頁：

1. `computer({action:"screenshot", save_to_disk:true})` 存檔，取得路徑。
2. 若收據區在首屏之下，`scroll_to` 收據後再存一張。
3. 截圖預設存於系統暫存目錄，須以 `Move-Item` 移入專案 `docs/e2e/`，命名 `YYYY-MM-DD-<頁面>.jpg`（如 `2026-11-24-ecpay-payment-success.jpg`、`2026-11-24-order-paid.jpg`）。建議綠界「付款成功」頁與本站訂單詳情頁各存一張。
4. 回報中**附上 `docs/e2e/` 內之截圖路徑**，並以 `Read` 該圖使使用者可見。

## 回報格式

- 結果：通過 / 失敗（失敗則註明卡在第幾步、畫面所見）
- 訂單編號、品項、金額、付款狀態
- 截圖路徑
- 觀察到之異常（例：訂單日期與今日差一日 → 疑時區問題）

## 常見錯誤

| 症狀 | 原因 | 解法 |
|------|------|------|
| 點了加入購物車但 `/cart` 顯示「購物車還是空的」 | 按鈕 hover 才顯現 / 換頁太快 | 依步驟 3–4，hover 後座標點擊、見 toast 再換頁 |
| `Option "臺灣土地銀行" not found` | 選單用「台」字 | 用 value `10001@2010@WebATM_LAND` |
| `Permission denied for reading page content` | 綠界網域未授權讀取 | 改用 screenshot / find / form_input |
| 停在 loading 畫面 | 綠界轉址中 | `wait` 數秒後再 `tabs_context_mcp` 看 URL |
| 伺服器 port 3001 timeout | 未啟動 | 背景執行 `npm run start` |
| 轉至 `pay-stage.ecpay.com.tw` 後 screenshot `Permission denied`（batch 中止） | 新網域首次需授權 | 單獨再呼叫一次 screenshot；仍拒則請使用者於擴充功能允許該網域 |
| hover 後截圖仍見他卡之「+」 | 截圖與 hover 狀態不同步 | 以 `zoom` 確認目標卡右下角圓鈕位置再點；點後以 toast 為準 |
