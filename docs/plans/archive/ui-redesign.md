# UI Redesign — Editorial Botanical（已完成）

## 目標
全站前台 UI 重新設計：以 Figma 產出設計稿（docs/design/），並依稿切版商品頁、結帳頁、訂單確認頁、付款完成頁，具備響應式設計與動效。

## 範圍
- 設計稿：Foundations、Header/Footer 元件、5 個桌機頁面 + 5 個手機頁面
- 切版：首頁（商品列表）、商品詳情、購物車、結帳、訂單確認（pending / failed）、付款完成（paid）、我的訂單、登入、404
- 動效：public/js/motion.js（GSAP + ScrollTrigger + Canvas 花瓣物理）
- 新 partial：`stepper.ejs`（結帳四步驟）、`receipt.ejs`（訂單收據卡）
- 後台頁面沿用原版型，透過 legacy token 對映自動套用新色盤

## 不變
- 所有 API 與資料流程不變；頁面 JS 僅調整呈現邏輯
- 訂單詳情頁依 `order.status` 切換「訂單確認」與「付款完成」兩種版型

## 驗證
- `npm test` 32/32 通過
- Playwright 於 1440 / 390 寬度實測全部流程（加入購物車 → 結帳 → 建立訂單 → 待付款 → 已付款），截圖存於 docs/design/implementation/
