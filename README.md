# Somniloq - AI 角色對話與創作平台

Somniloq 是一個現代化、具備沉浸感的 AI 角色對話平台，基於 **React**、**Vite** 和 **Supabase** 構建。它允許使用者創建、自定義並與 AI 驅動的角色進行實時互動，具備高性能的串流回應與流暢的響應式介面。

## 功能特點

- **角色創作**：自定義 AI 角色的人格、名稱、描述以及核心系統提示詞（System Prompts）。
- **實時串流回應 (Streaming)**：享受低延遲的對話體驗，AI 回覆以「打字機」效果實時渲染。
- **AI 智能建議**：根據當前對話脈絡自動生成回覆建議，讓對話不再冷場。
- **進階對話控制**：支援重新生成 AI 回覆、回溯對話進度或直接編輯訊息以引導劇情發展。
- **模型切換**：可針對不同對話需求，彈性切換底層的大型語言模型（如 Google Gemini 1.5 Pro）。
- **現代化 UI/UX**：採用 Tailwind CSS 4 與 Radix UI 打造，支援深色模式、磨砂玻璃效果（Glassmorphism）與流暢動畫。
- **安全與隱私**：整合 Supabase Auth 與資料列級安全性（RLS），確保對話數據的隔離與安全。

## 技術棧

- **前端 (Frontend)**：React 19, TypeScript, Vite
- **樣式 (Styling)**：Tailwind CSS 4, Lucide Icons, Framer Motion
- **狀態管理**：Zustand, TanStack Query (React Query)
- **後端服務 (BaaS)**：Supabase (Auth, PostgreSQL, Storage, Edge Functions)
- **AI 整合**：透過 Edge Functions 介接 LLM API（如 Google Gemini）

## 📂 專案結構

- `src/components`：可重複使用的 UI 組件。
- `src/pages`：主要的頁面（大廳、聊天室、創建頁面、驗證頁面等）。
- `src/hooks`：自定義 React Hooks（如處理對話邏輯的 `useChat`）。
- `src/stores`：使用 Zustand 進行的狀態管理。
- `src/lib`：核心工具函式與 Supabase 客戶端初始化。
- `src/types`：TypeScript 介面與類型定義。

## 🛡️ 資料安全

本專案利用 **Supabase 資料列級安全性 (RLS)** 確保：
- 使用者僅能存取屬於自己的對話紀錄與訊息。
- 角色創建與編輯權限受到嚴格控管。
- 匿名與公開存取均通過 PostgreSQL Policy 進行精確過濾。

