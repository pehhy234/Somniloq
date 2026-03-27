import { useState, useRef, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { 
  ArrowLeft, Send, Loader2, 
  Lightbulb, Trash2,
  ChevronDown, ChevronUp,
  Play, X, Menu,
  RotateCcw, PenLine
} from 'lucide-react'
import { useChat, ChatMessage } from '@/hooks/useChat'
import { cn } from '@/lib/utils'
import { ModelSwitcher } from '@/components/ModelSwitcher'
import { ChatContextMenu } from '@/components/ChatContextMenu'

interface ChatRoomContentProps {
  conversationId: string
  isMobilePage?: boolean 
}

export function ChatRoomContent({ conversationId, isMobilePage = false }: ChatRoomContentProps) {
  const navigate = useNavigate()
  const { 
    messages, isMessagesLoading, isTyping, 
    sendMessage, conversations, deleteMessage, updateMessage, regenerateMessage, getSuggestions,
    rollbackMessage
  } = useChat(conversationId)
  
  const currentConv = conversations.find(c => c.id === conversationId)
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isSuggesting, setIsSuggesting] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, msg: ChatMessage } | null>(null)
  
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

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  const handleRollback = async (msgId: string) => {
    await rollbackMessage(msgId)
  }

  const handleRemember = (content: string) => {
    // Memory functionality mock
    console.log('Remembering:', content)
    alert('AI 已記住此對話重點')
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
      <div 
        className="absolute left-[2px] right-[2px] z-50 flex items-center justify-between pointer-events-none"
        style={{ top: 'calc(env(safe-area-inset-top) + 2px)' }}
      >
        {/* 左側角色膠囊 */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-2 pl-1 pr-3 py-1.5 rounded-full glass-pill transition-all duration-300 hover:bg-black/60 hover:border-white/20">
            {isMobilePage && (
              <button 
                onClick={() => navigate('/chat')} 
                className="w-8 h-8 flex items-center justify-center rounded-full text-white/50 hover:text-white transition-all duration-300 hover:bg-white/8"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <img 
              src={currentConv.character.avatar_url || ''} 
              className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10 shrink-0 shadow-sm" 
            />
            <div className="flex flex-col">
              <span className="text-[13px] font-bold text-white leading-tight tracking-tight">
                {currentConv.character.name}
              </span>
            </div>
          </div>
        </div>

        {/* 右側功能膠囊 (Merged Block) */}
        <div className="flex items-center gap-0.5 px-1 py-1.5 rounded-full glass-pill pointer-events-auto transition-all duration-300 hover:bg-black/60 hover:border-white/20">
          <ModelSwitcher minimalist={true} />
          <div className="w-[1px] h-3.5 bg-white/10 mx-0.5" />
          <button className="w-8 h-8 flex items-center justify-center rounded-full text-white/50 hover:text-white transition-all duration-300 hover:bg-white/8">
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div 
        className="absolute inset-0 bg-cover bg-center pointer-events-none z-0"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.95)), url(${currentConv.character.avatar_url || ''})`,
          filter: 'brightness(0.7)',
        }}
      />
      
      {/* ── 對話內容區域 (Scrollable) ── */}
      <div className="flex-1 overflow-y-auto px-4 relative z-10 hide-scrollbar scroll-smooth flex flex-col">
        {/* 頂部增加墊片，確保在任何裝置都不會被遮擋 */}
        <div className="pt-16 pt-safe-top shrink-0" />

        {/* 免責聲明 */}
        <div className="flex justify-center mb-2 shrink-0">
          <span className="text-[11px] text-white/30 font-bold bg-white/5 px-4 py-1.5 rounded-full border border-white/5 tracking-wider">
            ⚡ 角色所說的話都由AI生成，請勿當真
          </span>
        </div>

        {/* 角色簡介卡 (簡短版) */}
        <div 
          onClick={() => setShowInfo(true)}
          className={cn(
            "mx-auto mb-5 w-full max-w-lg p-5 rounded-3xl glass-md shadow-2xl relative transition-all duration-300",
            "opacity-90 hover:opacity-100 cursor-pointer"
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

        {/* 角色詳細資訊 (懸浮式) */}
        {showInfo && createPortal(
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            {/* 背景點擊收起 */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowInfo(false)} />
            
            {/* 彈窗主體 */}
            <div className="relative w-full max-w-md p-6 rounded-[32px] glass-md border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <img src={currentConv.character.avatar_url || ''} className="w-12 h-12 rounded-2xl object-cover border border-white/10" />
                  <h3 className="text-lg font-bold text-white">{currentConv.character.name}</h3>
                </div>
                <button 
                  onClick={() => setShowInfo(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                <div>
                  <h4 className="text-[11px] font-bold text-white/30 uppercase tracking-widest mb-3">角色簡介</h4>
                  <p className="text-[15px] text-white/80 leading-relaxed font-medium">
                    {currentConv.character.description}
                  </p>
                </div>

                {(currentConv.character.prompt && currentConv.character.prompt.trim() !== '') && (
                  <div>
                    <h4 className="text-[11px] font-bold text-white/30 uppercase tracking-widest mb-3">設定秘辛</h4>
                    <p className="text-[13px] text-white/40 italic leading-relaxed">
                      {currentConv.character.prompt}
                    </p>
                  </div>
                )}
              </div>

              <button 
                onClick={() => setShowInfo(false)}
                className="w-full mt-8 py-4 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm transition-all active:scale-[0.98]"
              >
                我知道了
              </button>
            </div>
          </div>,
          document.body
        )}

        {/* 訊息清單 */}
        {messages.map((msg) => {
          const isUser = msg.role === 'user'
          const isEditing = editingId === msg.id
          
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
              <div className={cn("flex items-end gap-2 max-w-[88%]", isUser && "flex-row-reverse")}>
                <div className={cn("flex flex-col gap-1.5 relative group/bubble", isUser && "items-end")}>
                  {/* 主要訊息氣泡 */}
                    <div 
                      onClick={() => toggleMenu(msg.id)}
                      onContextMenu={(e) => handleContextMenu(e, msg)}
                      className={cn(
                        "px-5 py-3.5 rounded-3xl text-[15px] leading-relaxed transition-all duration-300 relative cursor-pointer select-text focus:outline-none",
                        isUser 
                          ? "bg-gradient-to-br from-primary to-primary/80 text-white font-medium rounded-br-lg shadow-xl shadow-primary/20" 
                          : "glass-sm text-white/90 rounded-bl-lg shadow-lg"
                      )}
                    >
                      {isEditing ? (
                        <div className="flex flex-col gap-3 min-w-[240px]">
                          <textarea 
                            className="bg-black/40 border border-white/10 rounded-2xl p-4 text-[14px] text-white focus:outline-none focus:border-primary/50 min-h-[100px] resize-none transition-all duration-150" 
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

      {contextMenu && (
        <ChatContextMenu 
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => { setContextMenu(null); setActiveMenuId(null); }}
          onCopy={() => handleCopy(contextMenu.msg.content)}
          onDelete={() => { if(confirm('確定刪除訊息？')) deleteMessage(contextMenu.msg.id); }}
          onRollback={() => handleRollback(contextMenu.msg.id)}
          onRemember={() => handleRemember(contextMenu.msg.content)}
          onRewrite={() => {
            if (contextMenu.msg.role === 'assistant') {
              handleRegenerate(contextMenu.msg.id)
            } else {
              setEditingId(contextMenu.msg.id); 
              setEditContent(contextMenu.msg.content);
            }
          }}
        />
      )}

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
          
          <div className="flex-1 flex items-end gap-1.5 glass-pill rounded-full p-1.5 focus-within:bg-black/70 transition-all duration-300">
            <textarea
              value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder="Start typing..."
              className="flex-1 max-h-32 min-h-[44px] bg-transparent text-[15px] text-white/90 px-5 py-3 outline-none resize-none hide-scrollbar placeholder:text-white/20 leading-relaxed font-medium"
              rows={1}
            />
            <button
              onClick={handleSend} disabled={!input.trim() || isTyping}
              className="w-11 h-11 mb-0.5 shrink-0 flex items-center justify-center rounded-full bg-primary text-white shadow-xl shadow-primary/20 active:scale-95 disabled:opacity-30 hover:brightness-110 transition-all duration-200"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
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
