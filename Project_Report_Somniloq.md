# 技術專案報告：Somniloq - AI 角色對話平台整合實作

### 1. 專案概述 (Project Overview)
**Somniloq** 是一個基於 React 19 與 Supabase 構建的 AI 對話平台。本專案核心在於整合大型語言模型（LLM）API，提供使用者流暢、具備角色人格特性的互動體驗，並透過現代化的 Web 技術解決長文本生成時的負載與安全性問題。

### 2. 技術棧 (Tech Stack)
*   **前端**: React 19, TypeScript, Vite.
*   **樣式與 UI**: Tailwind CSS 4, Radix UI (Avatar, Dialog, Tabs 等組件庫).
*   **狀態管理**: Zustand (持久化存儲使用者偏好), TanStack Query (管理非同步訊息流).
*   **後端集成**: Supabase (包含 Auth 驗證、PostgreSQL 資料儲存、Edge Functions 邏輯轉發).

### 3. 已實作之核心技術 (Core Technical Implementations)

#### A. 非同步串流渲染 (LLM Streaming)
針對 LLM 回應較慢的問題，本專案實作了串流處理邏輯：
*   **實作方式**: 在 `useChat` Hook 中透過 `fetch` 呼叫 Edge Function，並利用 `ReadableStream` 配合 `TextDecoder` 即時解析回傳數據塊（Chunks）。
*   **使用者體驗**: 訊息以「打字機效果」呈現，避免使用者因長時間等待全文生成而產生的焦慮，顯著提升了感知的回應速度。

#### B. 樂觀 UI 與狀態同步 (Optimistic UI)
*   為了達成零延遲的操作感，發送訊息時會先透過 `randomUUID` 產生臨時 ID 並立即渲染於畫面，隨後才與數據庫進行異步同步。
*   利用 **TanStack Query** 維護訊息快取，確保在切換頻道或重整頁面時能快速復原對話狀態。

#### C. 安全性與資料隔離 (Security & RLS)
*   **驗證機制**: 整合 Supabase Auth，確保對話功能僅限登入使用者存取。
*   **資料安全**: 專案架構設計為配合 Supabase 的 **Row Level Security (RLS)**，確保使用者僅能讀取/寫入屬於自己的對話紀錄（`user_id` 匹配），從資料庫層級保護隱私。

#### D. 靈活的對話控制機制
*   **重新生成 (Regenerate)**: 實作了訊息鏈的倒退機制，允許刪除特定訊息後的紀錄並重新觸發 AI 生成，以獲取不同的回覆結果。
*   **AI 建議回覆 (Suggestions)**: 透過 API 調用另一組 LLM 邏輯，根據當前對話歷史生成三組建議選項，輔助使用者延續對話。

### 4. 解決的痛點 (Problem Solving)
*   **解決互動冷啟動**: 透過「AI 建議回覆」功能，降低使用者初次面對 AI 時「不知道要聊什麼」的心裡門檻。
*   **提升對話連貫性**: 實作「訊息回溯（Rollback）」與「編輯」功能，讓使用者能修正輸入或引導 AI 產出更符合預期的內容，解決了對話單向不可逆的問題。
*   **安全性實踐**: 解除了前端檢查權限的風險，轉而利用後端與資料庫 Policy（RLS）來確保數據的物理隔離。

### 5. 關鍵學習 (Key Learnings)
*   **前端流式數據處理**: 深入掌握了如何在 React 組件中穩定地處理持續性的串流數據更新，並維持 60 FPS 的渲染效能。
*   **複雜狀態同步**: 學習到如何在使用 Zustand 與 TanStack Query 之間取得平衡，分別處理「本地偏好」與「伺服器狀態」。
*   **AI 產品思維**: 理解到 AI 應用程式的價值不在於 LLM 本身，而是在於如何透過有效的介面設計（如 Suggestions、Streaming）來彌補模型生成的不確定性。

### 6. 總結
本專案成功的將多項 AI 能力整合進一個完整的 Web 產品中，展示了我對於現代前端架構、安全性設計以及 AI 交互體驗的實作能力。
