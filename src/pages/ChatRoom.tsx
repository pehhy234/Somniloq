import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, Send, Loader2, 
  Lightbulb, RefreshCw, Trash2, Edit2, 
  ChevronDown, Copy, ChevronUp,
  Play, X, MoreHorizontal, Settings,
  AudioLines, RotateCcw, PenLine, Image as ImageIcon, Share2, Flag
} from 'lucide-react'
import { useChat } from '@/hooks/useChat'
import { cn } from '@/lib/utils'
import { ModelSwitcher } from '@/components/ModelSwitcher'

interface ChatRoomContentProps {
  conversationId: string
  isMobilePage?: boolean 
}

export function ChatRoomContent({ conversationId, isMobilePage = false }: ChatRoomContentProps) {
  const navigate = useNavigate()
  const { 
    messages, isMessagesLoading, isTyping, 
    sendMessage, conversations, deleteMessage, updateMessage, regenerateMessage, getSuggestions 
  } = useChat(conversationId)
  
  const currentConv = conversations.find(c => c.id === conversationId)
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isSuggesting, setIsSuggesting] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  
  const msgsEndRef = useRef<HTMLDivElement>(null)
  const touchTimer = useRef<any>(null)

  // 自動捲動
  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const handleSend = async () => {
    if (!input.trim() || isTyping || !currentConv) return
    const text = input.trim()
    setInput('')
    setSuggestions([])
    await sendMessage(text, currentConv.character_id)
  }

  const handleContinue = async () => {
    if (isTyping || !currentConv) return
    setActiveMenuId(null)
    await sendMessage('', currentConv.character_id, true)
  }

  const handleRegenerate = async (msgId: string) => {
    if (isTyping || !currentConv) return
    setActiveMenuId(null)
    await regenerateMessage(msgId, currentConv.character_id)
  }

  const handleSuggest = async () => {
    if (!currentConv || isSuggesting) return
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

  const handleEditSave = async () => {
    if (!editingId) return
    await updateMessage(editingId, editContent)
    setEditingId(null)
    setActiveMenuId(null)
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

  return (
    <div className="flex-1 flex flex-col relative h-full overflow-hidden bg-black selection:bg-primary/40">
      {/* ── 懸浮導覽列 (Floating Pill Header) ── */}
      <div className="absolute top-0 left-0 right-0 z-50 p-3 pt-safe-top flex items-center justify-between pointer-events-none">
        {/* 左側頭像膠囊 */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-[24px] bg-black/40 backdrop-blur-3xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-300 hover:bg-black/60 hover:border-white/20">
            {isMobilePage && (
              <button 
                onClick={() => navigate(-1)} 
                className="w-8 h-8 flex items-center justify-center text-white/50 hover:text-white/90 transition-all duration-150 active:scale-90 rounded-xl"
              >
                <ArrowLeft className="w-4.5 h-4.5" />
              </button>
            )}
            <img 
              src={currentConv.character.avatar_url || ''} 
              className="w-8 h-8 rounded-[10px] object-cover ring-1 ring-white/15 shrink-0" 
            />
            <div className="flex flex-col pr-1">
              <span className="text-[13px] font-black text-white leading-none tracking-tight">
                {currentConv.character.name}
              </span>
              <span className="text-[9px] text-white/35 mt-0.5 font-semibold tracking-widest uppercase">AI 角色</span>
            </div>
          </div>
        </div>

        {/* 右側膠囊 */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <ModelSwitcher />
          <button className="w-10 h-10 flex items-center justify-center rounded-[20px] bg-black/40 backdrop-blur-3xl border border-white/10 text-white/60 hover:text-white transition-all duration-300 hover:bg-black/60 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <Settings className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* ── 沉浸式背景 ── */}
      <div 
        className="absolute inset-0 bg-cover bg-center pointer-events-none z-0 scale-105"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.7) 70%, rgba(0,0,0,0.9)), url(${currentConv.character.avatar_url || ''})`,
          filter: 'brightness(0.55) contrast(1.1)',
        }}
      />
      
      {/* ── 對話內容區域 (Scrollable) ── */}
      <div className="flex-1 overflow-y-auto px-4 relative z-10 hide-scrollbar scroll-smooth flex flex-col">
        {/* 頂部留空 (給 Header) */}
        <div className="h-28 shrink-0" />

        {/* 免責聲明 */}
        <div className="flex justify-center mb-6 shrink-0">
          <span className="text-[9.5px] text-white/25 font-semibold bg-black/15 px-3 py-1 rounded-full backdrop-blur-sm border border-white/5 tracking-wide">
            ⚡ 角色由 AI 生成，請勿當真
          </span>
        </div>

        {/* 角色簡介卡 */}
        <div className={cn(
          "mx-auto mb-8 w-full max-w-lg p-4 rounded-[20px] bg-white/[0.06] border border-white/8 shadow-lg relative backdrop-blur-sm transition-all duration-300",
          showInfo ? "opacity-100" : "opacity-85 hover:opacity-100"
        )}>
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className={cn("text-[13px] font-semibold text-white/80 leading-relaxed", (!showInfo && currentConv.character.prompt) && "line-clamp-2")}>
                {currentConv.character.description}
              </p>
              {(currentConv.character.prompt && currentConv.character.prompt.trim() !== '') && (
                !showInfo ? (
                  <button onClick={() => setShowInfo(true)} className="mt-2 text-[11px] font-bold text-primary/70 hover:text-primary transition-all duration-150 flex items-center gap-1">
                    更多 <ChevronDown className="w-3 h-3" />
                  </button>
                ) : (
                  <div className="mt-3 pt-3 border-t border-white/8 animate-in fade-in slide-in-from-top-1 duration-200">
                    <p className="text-[11px] text-white/35 leading-relaxed italic font-medium">
                      {currentConv.character.prompt}
                    </p>
                    <button onClick={() => setShowInfo(false)} className="mt-2 text-[11px] font-bold text-primary/70 hover:text-primary transition-colors duration-150">
                      收起 <ChevronUp className="w-3 h-3 inline" />
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* 訊息清單 */}
        {messages.map((msg) => {
          const isUser = msg.role === 'user'
          const menuOpen = activeMenuId === msg.id
          const isEditing = editingId === msg.id
          
          return (
            <div 
              key={msg.id} 
              className={cn("flex flex-col w-full mb-5 animate-in fade-in slide-in-from-bottom-1 duration-200", isUser ? "items-end" : "items-start")}
              onContextMenu={(e) => toggleMenu(msg.id, e)}
              onTouchStart={() => { touchTimer.current = setTimeout(() => toggleMenu(msg.id), 600) }}
              onTouchEnd={() => clearTimeout(touchTimer.current)}
            >
              <div className={cn("flex items-end gap-2 max-w-[88%]", isUser && "flex-row-reverse")}>
                <div className={cn("flex flex-col gap-1.5 relative group/bubble", isUser && "items-end")}>
                  {/* 主要訊息氣泡 */}
                  <div 
                    onClick={() => toggleMenu(msg.id)}
                    className={cn(
                      "px-5 py-3.5 rounded-[24px] text-[15px] leading-[1.65] transition-all duration-300 relative cursor-pointer select-text",
                      isUser 
                        ? "bg-gradient-to-br from-primary to-primary/80 text-white font-medium rounded-br-[8px] shadow-[0_8px_24px_-4px_rgba(168,85,247,0.3)]" 
                        : "bg-white/[0.05] text-white/90 rounded-bl-[8px] border border-white/10 backdrop-blur-2xl shadow-[0_4px_24px_-8px_rgba(0,0,0,0.5)]",
                      menuOpen && "ring-2 ring-primary/40 scale-[1.01] brightness-110"
                    )}
                  >
                    {isEditing ? (
                      <div className="flex flex-col gap-2 min-w-[200px]">
                        <textarea 
                          className="bg-black/25 border border-white/10 rounded-[14px] p-3 text-[14px] text-white focus:outline-none focus:border-primary/40 min-h-[90px] resize-none transition-colors duration-150" 
                          value={editContent} 
                          onChange={(e) => setEditContent(e.target.value)} 
                          autoFocus 
                        />
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingId(null)} className="px-3.5 py-1.5 text-[12px] bg-white/8 border border-white/10 rounded-full font-semibold hover:bg-white/15 transition-colors duration-150">取消</button>
                          <button onClick={handleEditSave} className="px-3.5 py-1.5 text-[12px] bg-primary text-white rounded-full font-semibold hover:brightness-110 transition-all duration-150">保存</button>
                        </div>
                      </div>
                    ) : (
                      <span className="break-words">{msg.content}</span>
                    )}
                  </div>

                  {/* 操作工具列 */}
                  <div className="flex items-center gap-1 mt-0.5">
                    {isUser ? (
                       <div className="flex items-center gap-0.5 px-2 py-1 bg-white/[0.06] border border-white/8 rounded-full shadow-sm backdrop-blur-sm">
                         <button 
                           onClick={() => { setEditingId(msg.id); setEditContent(msg.content); }} 
                           className="p-1.5 text-white/30 hover:text-white/90 transition-all duration-150 rounded-lg hover:bg-white/8" 
                           title="編輯"
                         >
                           <PenLine className="w-3.5 h-3.5" strokeWidth={2} />
                         </button>
                         <div className="w-px h-3 bg-white/10 mx-0.5" />
                         <button 
                           onClick={() => { if(confirm('確定刪除訊息？')) deleteMessage(msg.id); }} 
                           className="p-1.5 text-white/30 hover:text-red-400/90 transition-all duration-150 rounded-lg hover:bg-red-500/8" 
                           title="刪除"
                         >
                           <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                         </button>
                       </div>
                    ) : (
                       <div className="flex items-center gap-0.5 px-2.5 py-1 bg-white/[0.06] border border-white/8 rounded-full shadow-sm backdrop-blur-sm">
                         <button 
                           onClick={() => handleRegenerate(msg.id)} 
                           className="p-1.5 text-white/35 hover:text-white/90 transition-all duration-150 active:scale-90 rounded-lg hover:bg-white/8" 
                           title="重新生成"
                         >
                           <RotateCcw className="w-3.5 h-3.5" strokeWidth={2} />
                         </button>
                         <button 
                           onClick={() => { setEditingId(msg.id); setEditContent(msg.content); }} 
                           className="p-1.5 text-white/35 hover:text-white/90 transition-all duration-150 active:scale-90 rounded-lg hover:bg-white/8" 
                           title="編輯"
                         >
                           <PenLine className="w-3.5 h-3.5" strokeWidth={2} />
                         </button>
                         <div className="w-px h-3 bg-white/10 mx-0.5" />
                         <button 
                           onClick={handleContinue} 
                           className="p-1.5 text-white/35 hover:text-white/90 transition-all duration-150 active:scale-90 rounded-lg hover:bg-white/8" 
                           title="繼續"
                         >
                           <Play className="w-3.5 h-3.5" strokeWidth={2} />
                         </button>
                         <div className="w-px h-3 bg-white/10 mx-0.5" />
                         <button 
                           onClick={() => { if(confirm('確定刪除訊息？')) deleteMessage(msg.id); }} 
                           className="p-1.5 text-white/35 hover:text-red-400/80 transition-all duration-150 active:scale-90 rounded-lg hover:bg-red-500/8" 
                           title="刪除"
                         >
                           <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                         </button>
                       </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {isTyping && (
           <div className="flex w-full justify-start items-end mt-2 mb-2 animate-in fade-in duration-300">
             <div className="px-5 py-3.5 rounded-[18px] rounded-bl-[5px] bg-white/[0.07] backdrop-blur-sm border border-white/8 inline-flex items-center gap-2 shadow-sm">
                <span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce [animation-delay:-0.28s]" />
                <span className="w-1.5 h-1.5 bg-white/45 rounded-full animate-bounce [animation-delay:-0.14s]" />
                <span className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" />
             </div>
           </div>
        )}
        {/* 預留空間，確保選單彈出時不會超出底部 */}
        <div ref={msgsEndRef} className="h-10 shrink-0" />
      </div>

      {/* ── 懸浮底部輸入區 ── */}
      <div className="relative z-40 px-3 pb-5 pt-2 shrink-0 flex flex-col gap-2.5 pointer-events-none">
        {/* 建議區 */}
        {suggestions.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto p-1 pointer-events-auto hide-scrollbar snap-x">
             {suggestions.map((s, idx) => (
                <button 
                  key={idx} 
                  onClick={() => { setInput(s); setSuggestions([]); }} 
                  className="snap-start shrink-0 h-8 px-3.5 rounded-full bg-black/50 backdrop-blur-3xl border border-white/10 text-[11px] font-semibold text-white/75 hover:text-white hover:bg-black/65 active:scale-95 transition-all duration-150"
                >{s}</button>
             ))}
             <button 
               onClick={() => setSuggestions([])} 
               className="shrink-0 w-8 h-8 rounded-full bg-black/40 backdrop-blur-3xl border border-white/8 flex items-center justify-center text-white/25 hover:text-white/60 transition-colors duration-150"
             >
               <X className="w-3.5 h-3.5" />
             </button>
          </div>
        )}

        {/* 輸入膠囊 */}
        <div className="flex items-end gap-2.5 w-full pointer-events-auto">
          <button 
            onClick={handleSuggest} disabled={isSuggesting}
            className={cn(
              "w-12 h-12 shrink-0 flex items-center justify-center rounded-[20px] shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-300 active:scale-95 border border-white/10 backdrop-blur-3xl",
              isSuggesting ? "bg-primary/20 animate-pulse" : "bg-black/50 text-yellow-400/80 hover:text-yellow-400 hover:bg-black/60 hover:border-white/20"
            )}
          >
            {isSuggesting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lightbulb className="w-5.5 h-5.5" />}
          </button>
          
          <div className="flex-1 flex items-end gap-1.5 bg-black/50 backdrop-blur-3xl rounded-[28px] p-1.5 border border-white/10 focus-within:border-white/20 focus-within:bg-black/70 shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-300">
            <textarea
              value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder="傳送訊息或由 AI 生成回覆"
              className="flex-1 max-h-32 min-h-[44px] bg-transparent text-[15px] text-white/90 px-4 py-3 outline-none resize-none hide-scrollbar placeholder:text-white/30 leading-relaxed font-medium"
              rows={1}
            />
            <button
              onClick={handleSend} disabled={!input.trim() || isTyping}
              className="w-11 h-11 mb-0.5 shrink-0 flex items-center justify-center rounded-[20px] bg-primary text-white shadow-[0_4px_20px_rgba(168,85,247,0.4)] active:scale-90 disabled:opacity-30 hover:brightness-110 transition-all duration-200"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ToolbarButton({ onClick, icon, label, danger = false }: { onClick: () => void, icon: React.ReactNode, label: string, danger?: boolean }) {
  return (
    <button 
      onClick={onClick} 
      className={cn(
        "h-8 px-3 rounded-full bg-black/30 backdrop-blur-2xl border border-white/10 flex items-center gap-1.5 text-[10px] font-black transition-all active:scale-95",
        danger ? "text-red-400 hover:bg-red-500/20" : "text-white/60 hover:text-white hover:bg-white/10"
      )}
    >
      {icon} {label}
    </button>
  )
}

export default function ChatRoomPage() {
  const { conversationId } = useParams<{ conversationId: string }>()

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
