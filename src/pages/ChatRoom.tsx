import { useState, useRef, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { 
  ArrowLeft, Send, Loader2, 
  Lightbulb, Trash2,
  ChevronDown, ChevronUp, ChevronRight,
  Play, X, Menu, Quote,
  RotateCcw, PenLine, Copy
} from 'lucide-react'
import { useChat, ChatMessage } from '@/hooks/useChat'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { ModelSwitcher } from '@/components/ModelSwitcher'
import { ChatContextMenu } from '@/components/ChatContextMenu'
import { useModalStore } from '@/stores/modalStore'
import { Upload } from 'lucide-react'

interface ChatRoomContentProps {
  conversationId: string
  isMobilePage?: boolean 
}

export function ChatRoomContent({ conversationId, isMobilePage = false }: ChatRoomContentProps) {
  const navigate = useNavigate()
  const modal = useModalStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingBg, setIsUploadingBg] = useState(false)
  const [showBgGallery, setShowBgGallery] = useState(false)
  const [bgHistory, setBgHistory] = useState<string[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const { user, isActive } = useAuth()
  const { 
    messages, isMessagesLoading, isTyping, 
    sendMessage, conversations, deleteMessage, updateMessage, regenerateMessage, getSuggestions,
    rollbackMessage, updateConversationModel, updateConversationBg
  } = useChat(conversationId)
  
  const currentConv = conversations.find(c => c.id === conversationId)
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isSuggesting, setIsSuggesting] = useState(false)
  const [infoMode, setInfoMode] = useState<'full' | 'simple' | null>(null)
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

  const handleEditSave = async () => {
    if (!editingId || !isActive || !currentConv) return
    
    // 找出目前編輯的訊息
    const msgToEdit = messages.find(m => m.id === editingId)
    const isUser = msgToEdit?.role === 'user'

    await updateMessage(editingId, editContent)
    
    // 如果是使用者訊息，存檔後自動觸發重新生成
    if (isUser) {
      const msgIndex = messages.findIndex(m => m.id === editingId)
      // 如果這則訊息後面有接續的訊息，執行回溯式重新生成
      if (msgIndex !== -1 && msgIndex < messages.length - 1) {
        const nextMsgId = messages[msgIndex + 1].id
        await handleRegenerate(nextMsgId)
      } else {
        // 如果是最後一則訊息，直接點擊繼續的概念發送空內容觸發 AI
        await sendMessage('', currentConv.character_id, true)
      }
    }

    setEditingId(null)
    setActiveMenuId(null)
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
          console.error('Rollback failed:', err)
          modal.alert('回溯失敗，請稍後再試', { title: '系統錯誤' })
        }
      }
    })
  }

  const handleRemember = (content: string) => {
    // Memory functionality mock
    console.log('Remembering:', content)
    modal.alert('AI 已記住此對話重點', { title: '記憶成功' })
  }

  const fetchBgHistory = async () => {
    if (!user) return
    setIsLoadingHistory(true)
    try {
      const { data, error } = await supabase.storage
        .from('backgrounds')
        .list(`${user.id}/`, {
          limit: 50,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' }
        })

      if (error) throw error
      
      const urls = (data || []).map(file => {
        const { data: { publicUrl } } = supabase.storage
          .from('backgrounds')
          .getPublicUrl(`${user.id}/${file.name}`)
        return publicUrl
      })
      setBgHistory(urls)
    } catch (err) {
      console.error('Fetch history error:', err)
    } finally {
      setIsLoadingHistory(false)
    }
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
        <div className="flex items-center gap-2 pointer-events-auto">
          <div 
            onClick={() => setInfoMode('full')}
            className="flex items-center gap-2 pl-1 pr-3 py-1.5 rounded-full glass-pill transition-all duration-300 hover:bg-black/60 hover:border-white/20 cursor-pointer active:scale-95 group"
          >
            {isMobilePage && (
              <button 
                onClick={(e) => { e.stopPropagation(); navigate('/chat'); }} 
                className="w-8 h-8 flex items-center justify-center rounded-full text-white/50 hover:text-white transition-all duration-300 hover:bg-white/8"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="w-8 h-8 rounded-full overflow-hidden ring-1 ring-white/10 shrink-0 shadow-sm flex items-center justify-center bg-white/[0.03]">
              {currentConv.character.avatar_url ? (
                <img 
                  src={currentConv.character.avatar_url} 
                  className="w-full h-full object-cover" 
                  alt=""
                />
              ) : (
                <span className="text-[10px] font-bold text-white/40">{currentConv.character.name[0]}</span>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-[13px] font-bold text-white leading-tight tracking-tight">
                {currentConv.character.name}
              </span>
            </div>
          </div>
        </div>

        {/* 右側功能膠囊 (Merged Block) */}
        <div className="flex items-center gap-0.5 px-1 py-1.5 rounded-full glass-pill pointer-events-auto transition-all duration-300 hover:bg-black/60 hover:border-white/20">
          <ModelSwitcher 
            minimalist={true} 
            conversationId={conversationId} 
            modelId={currentConv.model_id || undefined}
            onSelect={(id) => updateConversationModel(conversationId, id)}
          />
          <div className="w-[1px] h-3.5 bg-white/10 mx-0.5" />
          <button className="w-8 h-8 flex items-center justify-center rounded-full text-white/50 hover:text-white transition-all duration-300 hover:bg-white/8">
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
          onClick={() => setInfoMode('simple')}
          className={cn(
            "mx-auto mb-4 w-full max-w-lg p-4 rounded-2xl relative transition-all duration-200",
            "bg-white/[0.04] border border-white/5 cursor-pointer active:scale-[0.98]",
            "md:glass-md md:shadow-xl" // 僅在電腦版保留模糊效果
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

        {/* 隱藏的檔案選擇器用於背景上傳 */}
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file || !user) return
            
            try {
              setIsUploadingBg(true)
              const ext = file.name.split('.').pop()
              const path = `${user.id}/${Date.now()}.${ext}`
              
              const { error: uploadError } = await supabase.storage
                .from('backgrounds')
                .upload(path, file)
                
              if (uploadError) throw uploadError
              
              const { data: { publicUrl } } = supabase.storage
                .from('backgrounds')
                .getPublicUrl(path)
                
              await updateConversationBg(conversationId, publicUrl)
              // 上傳成功後重新獲取清單
              fetchBgHistory()
              modal.alert('背景圖上傳成功！', { title: '上傳完成' })
            } catch (err: any) {
              console.error('Upload error:', err)
              modal.alert('圖片上傳失敗：' + (err.message || '未知錯誤'), { title: '錯誤' })
            } finally {
              setIsUploadingBg(false)
              if (fileInputRef.current) fileInputRef.current.value = ''
            }
          }}
        />

        {/* 背景藝廊彈窗 */}
        {showBgGallery && createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setShowBgGallery(false)} />
            <div className="relative w-full max-w-lg bg-[#0C0C0C] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
              <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between shrink-0">
                <h3 className="text-[17px] font-black text-white tracking-tight">選擇背景圖</h3>
                <button onClick={() => setShowBgGallery(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-white/40 hover:text-white transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {/* 清除背景 */}
                  <button 
                    onClick={async () => {
                      await updateConversationBg(conversationId, '');
                      setShowBgGallery(false);
                    }}
                    className="aspect-[3/4] rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/20 group-hover:text-white/40">
                      <Trash2 className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold text-white/30">無 (預設)</span>
                  </button>

                  {/* 新增上傳 */}
                    <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingBg}
                    className="aspect-[3/4] rounded-2xl border border-dashed border-primary/20 bg-primary/5 flex flex-col items-center justify-center gap-2 hover:bg-primary/10 transition-all group overflow-hidden relative"
                  >
                    {isUploadingBg ? (
                      <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                          <Upload className="w-4 h-4" />
                        </div>
                        <span className="text-[11px] font-bold text-primary/80">上傳圖片</span>
                      </>
                    )}
                  </button>

                  {bgHistory.map((url, i) => (
                    <div key={i} className="relative group aspect-[3/4] rounded-2xl overflow-hidden border border-white/5 hover:border-primary/50 transition-all">
                      <button 
                        onClick={async () => {
                          await updateConversationBg(conversationId, url);
                          setShowBgGallery(false);
                        }}
                        className="w-full h-full"
                      >
                        <img src={url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                      </button>
                      
                      {/* 刪除按鈕 */}
                      <button 
                        onClick={async (e) => {
                          e.stopPropagation();
                          const segments = url.split('/');
                          const fileName = segments[segments.length - 1];
                          if (!fileName || !user) return;
                          
                          const { error } = await supabase.storage
                            .from('backgrounds')
                            .remove([`${user.id}/${fileName}`]);
                          
                          if (!error) fetchBgHistory();
                        }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/40 hover:text-red-500 hover:bg-black/80 opacity-0 group-hover:opacity-100 transition-all duration-200"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* 角色資訊彈窗 (雙模態：全功能 / 極簡簡介) */}
        {infoMode && createPortal(
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setInfoMode(null)} />
            
            <div className={cn(
              "relative w-full max-w-lg glass-md border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col rounded-[32px] max-h-[85vh]",
              infoMode === 'simple' ? "transition-all duration-300" : ""
            )}>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/5 shrink-0 px-6 py-4">
                <div className="flex items-center gap-3.5">
                  <div className={cn(
                    "rounded-xl overflow-hidden border border-white/10 bg-white/[0.03] shrink-0 transition-all duration-300",
                    infoMode === 'simple' ? "w-12 h-12 shadow-lg ring-1 ring-white/10" : "w-10 h-10"
                  )}>
                    {currentConv.character.avatar_url ? (
                      <img src={currentConv.character.avatar_url} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/40 font-bold">{currentConv.character.name[0]}</div>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <h3 className={cn("font-bold text-white truncate transition-all duration-300", infoMode === 'simple' ? "text-[19px]" : "text-[17px]")}>
                      {currentConv.character.name}
                    </h3>
                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-tighter">
                      {infoMode === 'full' ? 'Management Dashboard' : 'Character Story'}
                    </span>
                  </div>
                </div>
                <button onClick={() => setInfoMode(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-white/40 hover:text-white transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 僅在 Full 模式下顯示的功能按鈕列 */}
              {infoMode === 'full' && (
                <div className="px-5 py-3 border-b border-white/5 shrink-0 bg-white/[0.01] animate-in slide-in-from-top-2 duration-300">
                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      onClick={() => {
                        if (currentConv.character.author_id === user?.id) {
                          setInfoMode(null);
                          navigate(`/create/${currentConv.character_id}`);
                        } else {
                          modal.alert('您不是此角色的創作者，無法進行修改。', { title: '權限不足' });
                        }
                      }}
                      className="flex flex-col items-center justify-center py-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-primary/10 transition-all active:scale-95 group"
                    >
                      <PenLine className="w-4 h-4 text-primary mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-[11px] font-bold text-white/80">修改詳情</span>
                    </button>
                    
                    <button 
                      onClick={() => {
                        setShowBgGallery(true)
                        fetchBgHistory()
                      }}
                      className="flex flex-col items-center justify-center py-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-yellow-400/10 transition-all active:scale-95 group"
                    >
                      <Upload className="w-4 h-4 text-yellow-500 mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-[11px] font-bold text-white/80">更換背景</span>
                    </button>

                    <div className="flex flex-col items-center justify-center py-2 rounded-xl bg-white/[0.03] border border-white/5">
                      <span className="text-[8px] font-black text-white/30 uppercase mb-0.5 tracking-tighter">對話模型</span>
                      <div className="scale-90 origin-center">
                        <ModelSwitcher 
                          minimalist={true} 
                          conversationId={conversationId} 
                          modelId={currentConv.model_id || undefined}
                          onSelect={(id) => updateConversationModel(conversationId, id)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 內容滑動區 */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <h4 className="text-[10px] font-black text-primary/60 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1 h-1 bg-primary rounded-full" /> 角色描述
                  </h4>
                  <p className={cn(
                    "text-white/70 leading-relaxed transition-all",
                    infoMode === 'simple' ? "text-[15px] font-medium text-white/85" : "text-[13px]"
                  )}>
                    {currentConv.character.description}
                  </p>
                </div>

                {/* 僅在 Full 模式下顯示問候語 */}
                {infoMode === 'full' && currentConv.character.greeting && (
                  <div className="space-y-1 animate-in fade-in duration-500">
                    <h4 className="text-[9px] font-black text-primary/60 uppercase tracking-widest flex items-center gap-2">
                      <div className="w-1 h-1 bg-primary rounded-full" /> 角色問候語
                    </h4>
                    <p className="text-[13px] text-white/50 italic leading-relaxed bg-white/[0.03] p-3.5 rounded-xl border border-white/5">
                      「{currentConv.character.greeting}」
                    </p>
                  </div>
                )}
              </div>

              {/* 僅在 Full 模式下顯示底部確定按鈕 */}
              {infoMode === 'full' && (
                <div className="px-5 py-3.5 border-t border-white/5 shrink-0 flex justify-center animate-in slide-in-from-bottom-2 duration-300">
                  <button 
                    onClick={() => setInfoMode(null)}
                    className="w-full max-w-xs py-3 rounded-xl bg-primary text-white font-bold text-sm transition-all active:scale-[0.98] shadow-lg shadow-primary/20"
                  >
                    確定並返回
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

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
              <div className={cn("flex items-end gap-2 max-w-[88%]", isUser && "flex-row-reverse")}>
                <div className={cn("flex flex-col gap-1.5 relative group/bubble", isUser && "items-end")}>
                  {/* 主要訊息氣泡 */}
                  <div 
                    onClick={() => toggleMenu(msg.id)}
                    onContextMenu={(e) => handleContextMenu(e, msg)}
                    className={cn(
                      "px-4.5 py-3 rounded-2xl text-[15px] leading-relaxed transition-all duration-300 relative cursor-pointer select-text focus:outline-none shadow-sm",
                      isUser 
                        ? "bg-primary/30 border border-primary/35 text-white font-medium rounded-br-sm shadow-primary/5" 
                        : "bg-white/[0.12] border border-white/10 text-white/95 rounded-bl-sm"
                    )}
                  >
                    {isEditing ? (
                      <div className="flex flex-col gap-3 min-w-[240px]">
                        <textarea 
                          className="bg-black/40 border border-white/10 rounded-2xl p-4 text-[14px] text-white focus:outline-none focus:border-primary/50 min-h-[100px] resize-none" 
                          value={editContent} 
                          onChange={(e) => setEditContent(e.target.value)} 
                          autoFocus 
                        />
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-[11px] text-white/40">取消</button>
                          <button onClick={() => handleEditSave()} className="px-3.5 py-1.5 text-[11px] bg-primary text-white rounded-full font-bold">儲存</button>
                        </div>
                      </div>
                    ) : (
                      <span className="break-words">{msg.content}</span>
                    )}
                  </div>

                  {/* 氣泡下方工具列 (僅最後一個顯示) */}
                  {isLast && !isEditing && (
                    <div className="flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                      {isUser ? (
                        <div className="flex items-center gap-0.5 px-2 py-1 bg-white/[0.12] border border-white/10 rounded-full shadow-sm">
                          <button 
                            onClick={() => { navigator.clipboard.writeText(msg.content); }} 
                            className="p-1.5 text-white/35 hover:text-white/90 transition-all" 
                            title="複製"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <div className="w-px h-3 bg-white/10 mx-0.5" />
                          <button 
                            onClick={() => { setEditingId(msg.id); setEditContent(msg.content); }} 
                            className="p-1.5 text-white/35 hover:text-white/90 transition-all" 
                            title="改寫"
                          >
                            <PenLine className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-0.5 px-2.5 py-1 bg-white/[0.12] border border-white/10 rounded-full shadow-sm">
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
                            onClick={() => { setEditingId(msg.id); setEditContent(msg.content); }} 
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

        {isTyping && (
           <div className="flex w-full justify-start items-end mt-2 mb-2 animate-in fade-in duration-300">
             <div className="px-5 py-3.5 rounded-[18px] rounded-bl-[5px] bg-white/[0.15] border border-white/12 inline-flex items-center gap-2 shadow-sm">
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
            setEditingId(contextMenu.msg.id); 
            setEditContent(contextMenu.msg.content);
          }}
          onRegenerate={contextMenu.msg.role === 'assistant' ? () => handleRegenerate(contextMenu.msg.id) : undefined}
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
            onClick={handleSuggest} disabled={isSuggesting || !isActive}
            className={cn(
              "w-12 h-12 shrink-0 flex items-center justify-center rounded-[20px] shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-300 active:scale-95 border border-white/10 backdrop-blur-3xl",
              isSuggesting ? "bg-primary/20 animate-pulse" : "bg-black/50 text-yellow-400/80 hover:text-yellow-400 hover:bg-black/60 hover:border-white/20",
              !isActive && "opacity-50 grayscale cursor-not-allowed"
            )}
          >
            {isSuggesting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lightbulb className="w-5.5 h-5.5" />}
          </button>
          
          <div className={cn(
            "flex-1 flex items-end gap-1.5 glass-pill rounded-full p-1.5 focus-within:bg-black/70 transition-all duration-300",
            !isActive && "bg-white/5 opacity-80 cursor-not-allowed"
          )}>
            <textarea
              value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder={isActive ? "Start typing..." : "帳號啟用中，功能暫時受限..."}
              className="flex-1 max-h-32 min-h-[44px] bg-transparent text-[15px] text-white/90 px-5 py-3 outline-none resize-none hide-scrollbar placeholder:text-white/20 leading-relaxed font-medium"
              rows={1}
              disabled={!isActive}
            />
            <button
              onClick={handleSend} disabled={!input.trim() || isTyping || !isActive}
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
