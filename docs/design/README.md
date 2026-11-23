# 花漾生活 — UI Redesign 設計稿

> 方向：**Editorial Botanical**（編輯感植物誌）— 紙質暖白、墨綠文字、玫瑰陶土色點綴；以「拱窗 Arch」為品牌主視覺語彙。

## Figma

| 項目                                  | 連結                                                                                                                                                        |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 設計檔                                | https://www.figma.com/design/8pv3tBt3HH1gemmGMNiofz/%E8%8A%B1%E6%BC%BE%E7%94%9F%E6%B4%BB-Flower-Life-%E2%80%94-UI-Redesign?node-id=0-1&t=YvueWoMmrshRarCk-1 |
| 00 Foundations（色票 / 字體 / 元件）  | https://www.figma.com/design/8pv3tBt3HH1gemmGMNiofz?node-id=2-93                                                                                            |
| 00 Components（Header / Footer）      | https://www.figma.com/design/8pv3tBt3HH1gemmGMNiofz?node-id=2-95                                                                                            |
| 01 商品頁 Shop / Desktop              | https://www.figma.com/design/8pv3tBt3HH1gemmGMNiofz?node-id=3-2                                                                                             |
| 02 商品詳情 Product / Desktop         | https://www.figma.com/design/8pv3tBt3HH1gemmGMNiofz?node-id=4-56                                                                                            |
| 03 結帳 Checkout / Desktop            | https://www.figma.com/design/8pv3tBt3HH1gemmGMNiofz?node-id=5-110                                                                                           |
| 04 訂單確認 Order Confirmed / Desktop | https://www.figma.com/design/8pv3tBt3HH1gemmGMNiofz?node-id=5-281                                                                                           |
| 05 付款完成 Payment Success / Desktop | https://www.figma.com/design/8pv3tBt3HH1gemmGMNiofz?node-id=5-456                                                                                           |
| M1–M5 Mobile (390)                    | node `6-272` / `6-378` / `6-436` / `6-531` / `6-628`                                                                                                        |

> ⚠️ 檔案預設位於 Drafts（僅擁有者可見）。若要作為「公開網址」，請在 Figma 右上角 **Share → Anyone with the link → can view**。

## 截圖

| 檔案                                                                  | 說明                                              |
| --------------------------------------------------------------------- | ------------------------------------------------- |
| `screenshots/00-foundations.png`                                      | 設計基礎：色票、字體、按鈕、狀態標籤、拱窗        |
| `screenshots/01-shop-desktop.png` ～ `05-payment-success-desktop.png` | 桌機設計稿（1440）                                |
| `screenshots/m1-…` ～ `m5-…`                                          | 手機設計稿（390）                                 |
| `implementation/*.png`                                                | 切版後實際畫面（Playwright 截圖，供與設計稿比對） |

> 備註：Figma Starter 方案 MCP 呼叫額度用罄，`m1 / m2 / m4 / m5` 設計稿截圖為修正「區塊寬度撐滿」前所擷取（內容區略窄），Figma 檔內為修正後版本；`m3` 與桌機截圖皆為最終版。切版依修正後版本實作，可參考 `implementation/m*-mobile.png`。

## Design Tokens（同步於 `public/css/input.css` `@theme`）

| Token                    | 值                    | 用途                           |
| ------------------------ | --------------------- | ------------------------------ |
| `paper`                  | `#F5F0E8`             | 頁面底色                       |
| `linen`                  | `#EDE5D8`             | 次要底色、摘要卡               |
| `card`                   | `#FBF8F3`             | 卡片                           |
| `ink`                    | `#1E2620`             | 主要文字、主要按鈕             |
| `ink-soft` / `ink-muted` | `#5B6158` / `#8E8A80` | 次要 / 輔助文字                |
| `line`                   | `#D9D0C1`             | 分隔線                         |
| `clay` / `clay-dark`     | `#A8443A` / `#8C3730` | 強調色（加入購物車、前往付款） |
| `blush`                  | `#EBD3C7`             | 待付款狀態                     |
| `moss` / `mint`          | `#3E4A33` / `#DCE2D2` | 品牌故事、已付款狀態           |
| `gold`                   | `#B8975A`             | 星等、裝飾                     |

字體：`Noto Serif TC`（標題）、`Noto Sans TC`（內文）、`Instrument Serif Italic`（英文 / 數字點綴）、`Manrope`（標籤、金額）。

## 動效（frontend-motion-design）

| 效果            | 實作                                                                                                       |
| --------------- | ---------------------------------------------------------------------------------------------------------- |
| 頁面載入編排    | GSAP timeline，`[data-intro]` 依 DOM 順序 stagger + clip-path 揭露                                         |
| 捲動揭露 / 視差 | ScrollTrigger.batch（`[data-reveal]`）、`[data-parallax]` scrub                                            |
| 加入購物車      | 花瓣形圓點沿貝茲曲線飛向購物車，徽章彈跳                                                                   |
| 磁吸按鈕        | `[data-magnetic]`，gsap.quickTo + elastic 回彈                                                             |
| 付款完成        | SVG 花圈逐葉綻放＋打勾描繪；Canvas 花瓣物理（固定 60Hz 模擬 / rAF 繪製、重力、空氣阻力、擺動、游標斥力場） |
| 其他            | 無限跑馬燈、旋轉季節徽章、按鈕墨色填充、手風琴、免運進度條                                                 |

所有動效皆尊重 `prefers-reduced-motion`；GSAP 載入失敗時內容直接顯示。
