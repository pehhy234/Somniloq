import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Send, Loader2,
  Lightbulb,
  ChevronDown,
  Play, X, Menu,
  RotateCcw, PenLine, Copy,
  ChevronsUp, ChevronsDown, Square, ShieldAlert
} from 'lucide-react'
import { InviteActivationModal } from '@/components/InviteActivationModal'
import { useChat, ChatMessage } from '@/hooks/useChat'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { ModelSwitcher } from '@/components/ModelSwitcher'
import { ChatContextMenu } from '@/components/ChatContextMenu'
import { useModalStore } from '@/stores/modalStore'
import { logger } from '@/lib/logger'

// Modularized Dialog Components
import { BackgroundGalleryDialog } from '@/components/chat/BackgroundGalleryDialog'
import { CharacterInfoDialog } from '@/components/chat/CharacterInfoDialog'
import { MessageEditDialog } from '@/components/chat/MessageEditDialog'

interface ChatRoomContentProps {
  conversationId: string
  isMobilePage?: boolean
}

export function ChatRoomContent({ conversationId, isMobilePage = false }: ChatRoomContentProps) {
  const navigate = useNavigate()
  const modal = useModalStore()
  const { user, isActive, refreshProfile } = useAuth()
  const {
    messages, isMessagesLoading, isTyping,
    sendMessage, conversations, deleteMessage, updateMessage, regenerateMessage, getSuggestions,
    rollbackMessage, updateConversationModel, updateConversationBg, abortMessage
  } = useChat(conversationId)

  const currentConv = conversations.find(c => c.id === conversationId)
  const [showActivateModal, setShowActivateModal] = useState(false)
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isSuggesting, setIsSuggesting] = useState(false)
  const [infoMode, setInfoMode] = useState<'full' | 'simple' | null>(null)
  const [showBgGallery, setShowBgGallery] = useState(false)
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, msg: ChatMessage } | null>(null)

  const msgsEndRef = useRef<HTMLDivElement>(null)
  const msgsTopRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const touchTimer = useRef<any>(null)

  const [showScrollUp, setShowScrollUp] = useState(false)
  const [showScrollDown, setShowScrollDown] = useState(false)

  // 自動捲動
  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // 追蹤捲動位置，決定是否顯示上/下按鈕
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const { scrollTop, scrollHeight, clientHeight } = el
    setShowScrollUp(scrollTop > 120)
    setShowScrollDown(scrollHeight - scrollTop - clientHeight > 120)
  }, [])

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const scrollToBottom = () => {
    msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // 動態調整輸入框高度
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      const maxHeight = isMobilePage ? 84 : 160
      const nextHeight = Math.min(textarea.scrollHeight, maxHeight)
      textarea.style.height = `${nextHeight}px`
    }
  }, [input, isMobilePage])

  const handleSend = async () => {
    if (!input.trim() || isTyping || !currentConv || !isActive) return
    const text = input.trim()
    setInput('')
    setSuggestions([])
    await sendMessage(text, currentConv.character_id)
  }

  const handleContinue = async () => {
    if (isTyping || !currentConv || !isActive) return
    setActiveMenuId(null)
    await sendMessage('', currentConv.character_id, true)
  }

  const handleRegenerate = async (msgId: string) => {
    if (isTyping || !currentConv || !isActive) return
    setActiveMenuId(null)
    await regenerateMessage(msgId, currentConv.character_id)
  }

  const handleSuggest = async () => {
    if (!currentConv || isSuggesting || !isActive) return
    setIsSuggesting(true)
    try {
      const res = await getSuggestions(currentConv.character_id)
      setSuggestions(res)
    } finally {
      setIsSuggesting(false)
    }
  }

  const toggleMenu = (id: string, e?: any) => {
    if (e) e.preventDefault()
    setActiveMenuId(activeMenuId === id ? null : id)
  }

  const handleEditSave = async (contentToSave: string) => {
    if (!editingId || !isActive || !currentConv) return

    const targetId = editingId
    const msgToEdit = messages.find(m => m.id === targetId)
    const isUser = msgToEdit?.role === 'user'

    // 立即關閉修改框，提升使用者體驗
    setEditingId(null)
    setActiveMenuId(null)

    await updateMessage(targetId, contentToSave)

    // 如果是使用者訊息，存檔後自動觸發重新生成
    if (isUser) {
      const msgIndex = messages.findIndex(m => m.id === targetId)
      // 如果這則訊息後面有接續的訊息，執行回溯式重新生成
      if (msgIndex !== -1 && msgIndex < messages.length - 1) {
        const nextMsgId = messages[msgIndex + 1].id
        await handleRegenerate(nextMsgId)
      } else {
        // 如果是最後一則訊息，直接點擊繼續的概念發送空內容觸發 AI
        await sendMessage('', currentConv.character_id, true)
      }
    }
  }

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  const handleRollback = async (msgId: string) => {
    if (!isActive) return
    modal.confirm('確定要回溯至此訊息嗎？\n回溯後，該訊息之後的所有內容將會被刪除且無法恢復。', {
      title: '操作確認',
      confirmText: '確定回溯',
      destructive: true,
      onConfirm: async () => {
        try {
          await rollbackMessage(msgId)
          setContextMenu(null)
          setActiveMenuId(null)
        } catch (err) {
          logger.error('Rollback failed:', err)
          modal.alert('回溯失敗，請稍後再試', { title: '系統錯誤' })
        }
      }
    })
  }

  const handleRemember = (content: string) => {
    logger.log('Remembering:', content)
    modal.alert('AI 已記住此對話重點', { title: '記憶成功' })
  }

  const handleContextMenu = (e: React.MouseEvent | React.TouchEvent, msg: ChatMessage) => {
    e.preventDefault()
    let x, y
    if ('clientX' in e) {
      x = e.clientX
      y = e.clientY
    } else {
      const touch = (e as React.TouchEvent).touches[0]
      x = touch.clientX
      y = touch.clientY
    }
    setContextMenu({ x, y, msg })
    setActiveMenuId(msg.id)
  }

  if (!isActive) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden bg-black text-center space-y-6">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] rounded-full bg-primary/10 blur-[80px] pointer-events-none" />
        
        <div className="w-full max-w-[360px] bg-zinc-900/50 backdrop-blur-3xl rounded-[28px] border border-white/10 shadow-2xl p-6 relative z-10 space-y-5">
          <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center mx-auto text-primary">
            <ShieldAlert className="w-6 h-6" />
          </div>
          
          <div className="space-y-1.5">
            <h2 className="text-base font-black tracking-tight text-white">帳號尚未啟用</h2>
            <p className="text-white/40 text-xs leading-relaxed">
              聊天功能僅開放給已啟用的帳號。輸入邀請碼可直接解鎖，或等待管理員核准啟用。
            </p>
          </div>
          
          <div className="flex flex-col gap-2 pt-1">
            <button 
              onClick={() => setShowActivateModal(true)}
              className="w-full py-3 rounded-full text-xs font-bold text-white shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all bg-primary"
            >
              輸入邀請碼立即啟用
            </button>
            <button 
              onClick={() => navigate('/chat')}
              className="w-full py-2.5 rounded-full text-xs font-bold bg-white/5 border border-white/10 text-white/55 hover:bg-white/10 hover:text-white transition-all active:scale-[0.98]"
            >
              返回列表
            </button>
          </div>
        </div>

        <InviteActivationModal
          isOpen={showActivateModal}
          onClose={() => setShowActivateModal(false)}
          onSuccess={refreshProfile}
        />
      </div>
    )
  }

  if (!currentConv || isMessagesLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-3 opacity-50">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
          <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest">Loading</span>
        </div>
      </div>
    )
  }

  const editingMessage = messages.find(m => m.id === editingId)

  return (
    <div className="flex-1 flex flex-col relative h-full overflow-hidden bg-black selection:bg-primary/40">
      {/* ── 懸浮導覽列 (Floating Pill Header) ── */}
      <div
        className="absolute left-[2px] right-[2px] z-50 flex items-center justify-between pointer-events-none"
        style={{ top: 'calc(env(safe-area-inset-top) + 2px)' }}
      >
        <div className="flex items-center gap-2 pointer-events-auto">
          <div
            onClick={() => setInfoMode('full')}
            className="flex items-center gap-2 pl-1 pr-3 py-1.5 rounded-full glass-pill border border-border/40 dark:border-white/10 transition-all duration-300 hover:bg-card/85 dark:hover:bg-black/60 cursor-pointer active:scale-95 group"
          >
            {isMobilePage && (
              <button
                onClick={(e) => { e.stopPropagation(); navigate('/chat'); }}
                className="w-8 h-8 flex items-center justify-center rounded-full text-foreground/50 hover:text-foreground transition-all duration-300 hover:bg-foreground/5"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="w-8 h-8 rounded-full overflow-hidden ring-1 ring-border/40 dark:ring-white/10 shrink-0 shadow-sm flex items-center justify-center bg-foreground/[0.03]">
              {currentConv.character.avatar_url ? (
                <img
                  src={currentConv.character.avatar_url}
                  className="w-full h-full object-cover"
                  alt=""
                />
              ) : (
                <span className="text-[10px] font-bold text-foreground/40">{currentConv.character.name[0]}</span>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-[13px] font-bold text-foreground leading-tight tracking-tight">
                {currentConv.character.name}
              </span>
            </div>
          </div>
        </div>

        {/* 右側功能膠囊 (Merged Block) */}
        <div className="flex items-center gap-0.5 px-1 py-1.5 rounded-full glass-pill border border-border/40 dark:border-white/10 pointer-events-auto transition-all duration-300 hover:bg-card/85 dark:hover:bg-black/60">
          <ModelSwitcher
            minimalist={true}
            conversationId={conversationId}
            modelId={currentConv.model_id || undefined}
            onSelect={(id) => updateConversationModel(conversationId, id)}
          />
          <div className="w-[1px] h-3.5 bg-foreground/10 mx-0.5" />
          <button className="w-8 h-8 flex items-center justify-center rounded-full text-foreground/50 hover:text-foreground transition-all duration-300 hover:bg-foreground/5">
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        className="absolute inset-0 bg-cover bg-center pointer-events-none z-0"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.95)), url(${currentConv.bg_image_url || currentConv.character.avatar_url || ''})`,
          filter: 'brightness(0.7)',
        }}
      />

      {/* ── 對話內容區域 (Scrollable) ── */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 relative z-10 hide-scrollbar scroll-smooth flex flex-col"
      >
        {/* 頂部錨點 */}
        <div ref={msgsTopRef} />
        {/* 頂部增加墊片，確保在任何裝置都不會被遮擋 */}
        <div className="pt-16 pt-safe-top shrink-0" />

        {/* 免責聲明 */}
        <div className="flex justify-center mb-2 shrink-0">
          <span className="text-[11px] text-white/50 font-bold bg-zinc-900/40 px-4 py-1.5 rounded-full border border-white/10 tracking-wider backdrop-blur-sm">
            ⚡ 角色所說的話都由AI生成，請勿當真
          </span>
        </div>

        {/* 角色簡介卡 (簡短版) */}
        <div
          onClick={() => setInfoMode('simple')}
          className={cn(
            "mx-auto mb-4 w-full max-w-lg p-4 rounded-2xl relative transition-all duration-200",
            "bg-zinc-900/45 border border-white/15 cursor-pointer active:scale-[0.98]",
            "glass-md shadow-xl"
          )}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0 flex flex-col items-end">
              <p className="text-[13px] font-semibold text-white/80 leading-relaxed w-full text-left line-clamp-2">
                {currentConv.character.description}
              </p>
              <button className="mt-0.5 text-[11px] font-bold text-primary/70 hover:text-primary transition-all duration-150 flex items-center gap-1">
                更多 <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* 訊息清單 */}
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user'
          const isEditing = editingId === msg.id
          const isLast = index === messages.length - 1

          return (
            <div
              key={msg.id}
              className={cn("flex flex-col w-full mb-5 animate-in fade-in slide-in-from-bottom-1 duration-200", isUser ? "items-end" : "items-start")}
              onContextMenu={(e) => handleContextMenu(e, msg)}
              onTouchStart={(e) => {
                touchTimer.current = setTimeout(() => handleContextMenu(e, msg), 600)
              }}
              onTouchEnd={() => clearTimeout(touchTimer.current)}
              onTouchMove={() => clearTimeout(touchTimer.current)}
            >
              <div className={cn("flex items-end gap-2 w-full max-w-[96%] md:max-w-[75%]", isUser && "flex-row-reverse")}>
                <div className={cn("flex flex-col gap-1.5 relative group/bubble", isUser && "items-end")}>
                  {/* 主要訊息氣泡 */}
                  <div
                    onClick={() => toggleMenu(msg.id)}
                    onContextMenu={(e) => handleContextMenu(e, msg)}
                    className={cn(
                      "px-4.5 py-3 rounded-2xl text-[15px] leading-relaxed transition-all duration-300 relative cursor-pointer select-text focus:outline-none shadow-sm",
                      isUser
                        ? "bg-purple-600/85 border border-purple-400/30 text-white/90 font-semibold rounded-br-sm shadow-xl shadow-purple-500/20 backdrop-blur-md"
                        : "bg-zinc-900/50 border border-white/10 text-zinc-100/90 rounded-bl-sm backdrop-blur-md"
                    )}
                  >
                    <span className="break-words inline-block">
                      {msg.content}
                      {isLast && isTyping && !isUser && !msg.content && (
                        <span className={cn("inline-flex items-center gap-1 translate-y-[1px]", msg.content ? "ml-2" : "")}>
                          <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce [animation-delay:-0.32s]" />
                          <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce [animation-delay:-0.16s]" />
                          <span className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" />
                        </span>
                      )}
                    </span>
                  </div>

                  {/* 氣泡下方工具列 (生成中隱藏) */}
                  {isLast && !isEditing && !isTyping && (
                    <div className="flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                      {isUser ? (
                        <div className="flex items-center gap-0.5 px-2 py-1 bg-zinc-900/45 border border-white/15 rounded-full shadow-sm backdrop-blur-md">
                          <button
                            onClick={() => { navigator.clipboard.writeText(msg.content); }}
                            className="p-1.5 text-white/35 hover:text-white/90 transition-all"
                            title="複製"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <div className="w-px h-3 bg-white/10 mx-0.5" />
                          <button
                            onClick={() => { setEditingId(msg.id); }}
                            className="p-1.5 text-white/35 hover:text-white/90 transition-all"
                            title="改寫"
                          >
                            <PenLine className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-0.5 px-2.5 py-1 bg-zinc-900/45 border border-white/15 rounded-full shadow-sm backdrop-blur-md">
                          <button
                            onClick={() => { navigator.clipboard.writeText(msg.content); }}
                            className="p-1.5 text-white/35 hover:text-white/90 transition-all"
                            title="複製"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <div className="w-px h-3 bg-white/10 mx-0.5" />
                          <button
                            onClick={() => handleRegenerate(msg.id)}
                            className="p-1.5 text-white/35 hover:text-white/90 transition-all active:scale-90"
                            title="重新生成"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => { setEditingId(msg.id); }}
                            className="p-1.5 text-white/35 hover:text-white/90 transition-all active:scale-90"
                            title="改寫"
                          >
                            <PenLine className="w-3.5 h-3.5" />
                          </button>
                          <div className="w-px h-3 bg-white/10 mx-0.5" />
                          <button
                            onClick={handleContinue}
                            className="p-1.5 text-white/35 hover:text-white/90 transition-all active:scale-90"
                            title="繼續"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {isTyping && (!messages.length || messages[messages.length - 1].role === 'user') && (
          <div className="flex w-full justify-start items-end mb-5 animate-in fade-in duration-300">
            <div className="px-4.5 py-3 rounded-2xl rounded-bl-sm bg-zinc-900/50 border border-white/10 inline-flex items-center gap-1.5 shadow-sm h-[46px] backdrop-blur-md">
              <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce [animation-delay:-0.32s]" />
              <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce [animation-delay:-0.16s]" />
              <span className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" />
            </div>
          </div>
        )}
        {/* 預留空間，確保選單彈出時不會超出底部 */}
        <div ref={msgsEndRef} className="h-10 shrink-0" />
      </div>

      {/* ── 彈窗組件 (Modular Dialogs) ── */}
      <BackgroundGalleryDialog
        isOpen={showBgGallery}
        onClose={() => setShowBgGallery(false)}
        conversationId={conversationId}
        updateConversationBg={updateConversationBg}
      />

      {infoMode && (
        <CharacterInfoDialog
          infoMode={infoMode}
          onClose={() => setInfoMode(null)}
          character={currentConv.character}
          conversationId={conversationId}
          modelId={currentConv.model_id || undefined}
          userId={user?.id}
          updateConversationModel={updateConversationModel}
          onOpenBgGallery={() => setShowBgGallery(true)}
        />
      )}

      <MessageEditDialog
        isOpen={!!editingId}
        onClose={() => { setEditingId(null); setActiveMenuId(null); }}
        initialContent={editingMessage?.content || ''}
        onSave={handleEditSave}
      />

      {contextMenu && (
        <ChatContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => { setContextMenu(null); setActiveMenuId(null); }}
          onCopy={() => handleCopy(contextMenu.msg.content)}
          onDelete={() => {
            modal.confirm('確定刪除訊息？', {
              title: '刪除確認',
              confirmText: '確定刪除',
              destructive: true,
              onConfirm: () => deleteMessage(contextMenu.msg.id)
            })
          }}
          onRollback={() => handleRollback(contextMenu.msg.id)}
          onRemember={() => handleRemember(contextMenu.msg.content)}
          onRewrite={() => {
            setEditingId(contextMenu.msg.id)
          }}
          onRegenerate={contextMenu.msg.role === 'assistant' ? () => handleRegenerate(contextMenu.msg.id) : undefined}
        />
      )}

      {/* ── 捲動快捷按鈕 ── */}
      <div className="absolute right-3 bottom-[88px] z-50 flex flex-col gap-2 pointer-events-none">
        <button
          onClick={scrollToTop}
          className={cn(
            "pointer-events-auto w-9 h-9 flex items-center justify-center rounded-full",
            "bg-black/50 dark:bg-black/60 backdrop-blur-md border border-white/15",
            "text-white/60 hover:text-white hover:bg-black/70 hover:scale-110",
            "shadow-lg transition-all duration-300",
            showScrollUp ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
          )}
          title="移至最上方"
        >
          <ChevronsUp className="w-4 h-4" />
        </button>
        <button
          onClick={scrollToBottom}
          className={cn(
            "pointer-events-auto w-9 h-9 flex items-center justify-center rounded-full",
            "bg-black/50 dark:bg-black/60 backdrop-blur-md border border-white/15",
            "text-white/60 hover:text-white hover:bg-black/70 hover:scale-110",
            "shadow-lg transition-all duration-300",
            showScrollDown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
          )}
          title="移至最下方"
        >
          <ChevronsDown className="w-4 h-4" />
        </button>
      </div>

      {/* ── 懸浮底部輸入區 ── */}
      <div className="relative z-40 px-3 pb-2 sm:pb-4 pt-2 shrink-0 flex flex-col gap-2.5 pointer-events-none">
        {/* 建議區 */}
        <div className="flex w-full justify-center pointer-events-auto">
          <div className={cn(
            "w-full max-w-4xl overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]",
            suggestions.length > 0 ? "max-h-[380px] mb-2 opacity-100 translate-y-0" : "max-h-0 mb-0 opacity-0 translate-y-8"
          )}>
            <div className="mx-1.5 p-4 rounded-[28px] bg-zinc-900/80 border border-white/10 backdrop-blur-3xl shadow-2xl">
              <div className="flex items-center justify-between mb-3 px-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]" />
                  <span className="text-[10px] font-black text-white/35 uppercase tracking-[0.25em]">AI Inspiration</span>
                </div>
                <button 
                  onClick={() => setSuggestions([])}
                  className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/8 text-white/20 hover:text-white/50 transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex flex-col gap-1.5 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setInput(s); setSuggestions([]); }}
                    className="w-full text-left px-4 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.04] text-[13px] font-medium text-zinc-300 hover:text-white transition-all active:scale-[0.995] flex items-center gap-3 group"
                  >
                    <div className="w-1 h-3 rounded-full bg-yellow-500/20 group-hover:bg-yellow-500/60 transition-colors" />
                    <span className="truncate">{s}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 輸入膠囊 */}
        <div className="flex w-full justify-center pointer-events-auto">
          <div className={cn(
            "flex w-full max-w-4xl items-end gap-1.5 glass-pill rounded-[24px] p-1.5 border border-border/40 dark:border-white/10 focus-within:bg-card/90 dark:focus-within:bg-black/80 transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
            !isActive && "bg-muted/40 dark:bg-white/5 opacity-80 cursor-not-allowed"
          )}>
            {/* 左側：建議按鈕 */}
            <button
              onClick={handleSuggest} disabled={isSuggesting || !isActive}
              className={cn(
                "w-9 h-9 shrink-0 flex items-center justify-center rounded-full transition-all duration-300 active:scale-95 mb-0.5",
                isSuggesting ? "bg-muted dark:bg-white/5 text-primary animate-pulse" : "bg-transparent text-yellow-500/50 hover:text-yellow-500 hover:bg-foreground/5",
                !isActive && "opacity-50 grayscale cursor-not-allowed"
              )}
            >
              {isSuggesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />}
            </button>

            {/* 中間：文字輸入 */}
            <textarea
              ref={textareaRef}
              value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder={isActive ? "開始輸入對話..." : "帳號啟用中，功能暫時受限..."}
              className={cn(
                "flex-1 bg-transparent text-[15px] text-foreground px-1 py-1.5 outline-none resize-none hide-scrollbar placeholder:text-muted-foreground/30 leading-relaxed font-medium transition-all duration-200",
                isMobilePage ? "max-h-[84px]" : "max-h-[160px]",
                "overflow-y-auto"
              )}
              rows={1}
              disabled={!isActive}
              style={{ height: '36px' }}
            />

            {/* 右側：發送 / 中止 */}
            {isTyping ? (
              <button
                onClick={abortMessage}
                className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full bg-red-500 text-white shadow-lg shadow-red-500/30 active:scale-95 hover:bg-red-600 transition-all duration-200 mb-0.5 animate-in zoom-in-50 duration-200"
                title="中止生成"
              >
                <Square className="w-3.5 h-3.5 fill-white" />
              </button>
            ) : (
              <button
                onClick={handleSend} disabled={!input.trim() || !isActive}
                className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-20 hover:brightness-110 transition-all duration-200 mb-0.5 animate-in zoom-in-50 duration-200"
              >
                <Send className="w-4 h-4 ml-[2px]" />
              </button>
            )}
          </div>
        </div>
      </div>
      {/* ── Activation Modal ── */}
      <InviteActivationModal
        isOpen={showActivateModal}
        onClose={() => setShowActivateModal(false)}
        onSuccess={refreshProfile}
      />
    </div>
  )
}

export default function ChatRoomPage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const navigate = useNavigate()

  useEffect(() => {
    const checkRedirect = () => {
      if (conversationId && window.innerWidth >= 1024) {
        navigate(`/chat/${conversationId}`, { replace: true })
      }
    }
    checkRedirect()
    window.addEventListener('resize', checkRedirect)
    return () => window.removeEventListener('resize', checkRedirect)
  }, [conversationId, navigate])

  return (
    <div className="h-dvh bg-black flex flex-col relative overflow-hidden font-sans">
      {conversationId ? (
        <ChatRoomContent conversationId={conversationId} isMobilePage={true} />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-white/20">
          <Loader2 className="w-8 h-8 animate-spin mb-4" />
          SESSION NOT FOUND
        </div>
      )}
    </div>
  )
}
