import { useParams, useNavigate, Link } from 'react-router-dom'
import { MessageCircle, User as UserIcon, Trash2, ChevronRight } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useChat } from '@/hooks/useChat'
import { useCharacters } from '@/hooks/useCharacters'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { ChatRoomContent } from '@/pages/ChatRoom'
import { useModalStore } from '@/stores/modalStore'
import { logger } from '@/lib/logger'

type TabType = 'chat' | 'character'

export default function ChatPage() {
  const { conversationId } = useParams<{ conversationId?: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { 
    conversations, 
    isConversationsLoading, 
    deleteConversation,
    startConversation
  } = useChat()

  useEffect(() => {
    const checkRedirect = () => {
      if (conversationId && window.innerWidth < 1024) {
        navigate(`/room/${conversationId}`, { replace: true })
      }
    }
    checkRedirect()
    window.addEventListener('resize', checkRedirect)
    return () => window.removeEventListener('resize', checkRedirect)
  }, [conversationId, navigate])
  const { 
    data: myCharacters = [], 
    isLoading: isCharactersLoading 
  } = useCharacters({ authorId: user?.id })

  const [activeTab, setActiveTab] = useState<TabType>('chat')
  const [swipedId, setSwipedId] = useState<string | null>(null)

  const [touchStartX, setTouchStartX] = useState<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent, id: string) => {
    if (touchStartX === null) return
    const currentX = e.touches[0].clientX
    const diff = touchStartX - currentX

    // Swipe left to delete
    if (diff > 50) {
      setSwipedId(id)
      setTouchStartX(null)
    } 
    // Swipe right to close
    else if (diff < -50) {
      setSwipedId(null)
      setTouchStartX(null)
    }
  }

  const handleTouchEnd = () => {
    setTouchStartX(null)
  }

  const modal = useModalStore()
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    modal.confirm('確定要刪除此對話嗎？', {
      title: '刪除確認',
      confirmText: '確定刪除',
      destructive: true,
      onConfirm: async () => {
        await deleteConversation(id)
        setSwipedId(null)
      }
    })
  }

  return (
    <div className="flex h-dvh bg-background overflow-hidden">
      {/* ── 左欄/手機全屏：列表區域 ── */}
      <div 
        className={cn(
          "w-full lg:w-80 lg:min-w-[320px] flex flex-col border-r border-border bg-muted/20 relative",
          conversationId ? 'hidden lg:flex' : 'flex'
        )}
      >
        {/* 頂部頁籤切換 */}
        <div className="pt-4 px-4 bg-background/80 backdrop-blur-xl sticky top-0 z-20">
          
          <div className="flex bg-muted/50 p-1.5 rounded-[16px] mb-3 backdrop-blur-md border border-white/5">
            <button
              onClick={() => setActiveTab('chat')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 text-[13px] font-bold rounded-[12px] transition-all duration-300",
                activeTab === 'chat' 
                  ? "bg-background text-foreground shadow-[0_4px_16px_rgba(0,0,0,0.1)] ring-1 ring-white/10" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <MessageCircle className="w-4 h-4" />
              我的對話
            </button>
            <button
              onClick={() => setActiveTab('character')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 text-[13px] font-bold rounded-[12px] transition-all duration-300",
                activeTab === 'character' 
                  ? "bg-background text-foreground shadow-[0_4px_16px_rgba(0,0,0,0.1)] ring-1 ring-white/10" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <UserIcon className="w-4 h-4" />
              我的角色
            </button>
          </div>
        </div>

        {/* 列表內容 */}
        <div className="flex-1 overflow-y-auto px-3 pb-24 lg:pb-6 space-y-1.5 relative hide-scrollbar">
          {activeTab === 'chat' ? (
            /* 1. 對話列表區 */
            isConversationsLoading ? (
              <div className="text-center py-20 text-muted-foreground animate-pulse text-sm">載入中...</div>
            ) : conversations.length === 0 ? (
              <EmptyState title="目前沒有對話" sub="去大廳找個角色聊天吧！" />
            ) : (
              conversations.map((conv) => (
                <div 
                  key={conv.id} 
                  className="relative group/card overflow-hidden"
                  onTouchStart={handleTouchStart}
                  onTouchMove={(e) => handleTouchMove(e, conv.id)}
                  onTouchEnd={handleTouchEnd}
                >
                  {/* ── 手機版：左滑出現的刪除塊 ── */}
                  <div 
                    className={cn(
                      "absolute inset-y-0 right-0 w-24 flex items-center justify-center bg-destructive text-destructive-foreground rounded-2xl transition-transform duration-300 z-0",
                      swipedId === conv.id ? "translate-x-0" : "translate-x-full"
                    )}
                    onClick={(e) => handleDelete(e, conv.id)}
                  >
                    <Trash2 className="w-6 h-6" />
                  </div>

                  {/* ── 主體內容卡片 ── */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (swipedId === conv.id) {
                        setSwipedId(null)
                        return
                      }
                      const isMobile = window.innerWidth < 1024
                      navigate(isMobile ? `/room/${conv.id}` : `/chat/${conv.id}`)
                    }}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-[20px] transition-all duration-400 ease-[cubic-bezier(0.2,0.8,0.2,1)] text-left relative z-10 cursor-pointer overflow-hidden group/item",
                      swipedId === conv.id ? "-translate-x-24" : "translate-x-0",
                      conv.id === conversationId 
                        ? "bg-primary/10 border border-primary/30 shadow-[0_4px_24px_-4px_rgba(168,85,247,0.2)] ring-1 ring-primary/20" 
                        : "bg-background border border-transparent hover:bg-muted/60 hover:shadow-md hover:border-white/5 active:scale-[0.98]"
                    )}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={conv.character.avatar_url || 'https://via.placeholder.com/150'}
                        className="w-14 h-14 rounded-2xl object-cover border border-border/50 shadow-sm bg-muted group-hover/item:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="flex-1 min-w-0 pr-8">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-sm text-foreground truncate">
                          {conv.character.name}
                        </h3>
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {formatDate(conv.updated_at)}
                        </span>
                      </div>
                      <p className="text-[13px] text-muted-foreground truncate leading-snug">
                        {conv.last_message?.content || conv.character.description || '點擊開始對話'}
                      </p>
                    </div>

                    {/* ── 電腦版：懸浮刪除鈕 ── */}
                    <div className="hidden lg:flex absolute right-4 opacity-0 group-hover/card:opacity-100 transition-all">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(e, conv.id)
                        }}
                        className="p-2.5 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all shadow-sm"
                        title="刪除對話"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )
          ) : (
            /* 2. 角色列表區 */
            isCharactersLoading ? (
              <div className="text-center py-20 text-muted-foreground animate-pulse text-sm">載入中...</div>
            ) : myCharacters.length === 0 ? (
              <EmptyState title="尚未創造角色" sub="現在就去創造一個屬於你的角色吧！" />
            ) : (
              myCharacters.map((char) => (
                <button
                  key={char.id}
                  onClick={async () => {
                    try {
                      const convId = await startConversation(char.id)
                      const isMobile = window.innerWidth < 1024
                      navigate(isMobile ? `/room/${convId}` : `/chat/${convId}`)
                    } catch (e) {
                      logger.error('Chat start error:', e)
                    }
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-background border border-transparent hover:border-border hover:bg-muted/50 transition-all text-left"
                >
                  <div className="shrink-0">
                    <img
                      src={char.avatar_url || 'https://via.placeholder.com/150'}
                      className="w-14 h-14 rounded-2xl object-cover border border-border shadow-sm bg-muted"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-sm text-foreground truncate">{char.name}</h3>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <p className="text-[13px] text-muted-foreground truncate leading-snug">
                      {char.description}
                    </p>
                  </div>
                </button>
              ))
            )
          )}
        </div>
      </div>

      {/* ── 右欄：聊天室內容 (電腦版) ── */}
      <div className="hidden lg:flex flex-1 flex-col relative bg-background border-l border-border/50">
        {conversationId ? (
          <ChatRoomContent conversationId={conversationId} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-muted/5">
            <div className="w-24 h-24 rounded-[32px] bg-primary/10 flex items-center justify-center mb-6 text-primary shadow-[inset_0_-8px_16px_rgba(0,0,0,0.1),_0_16px_32px_rgba(168,85,247,0.15)] ring-1 ring-primary/20 relative">
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full pointer-events-none" />
              <MessageCircle className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground mb-4 drop-shadow-sm">沉浸式 AI 對話</h2>
            <p className="text-[15px] font-medium text-muted-foreground text-center max-w-md px-8 leading-relaxed opacity-80">
              選擇左側的對話，開始探索與 AI 角色的無限可能。
              每一次對話都是一段新的冒險。
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({ title, sub }: { title: string, sub: string }) {
  return (
    <div className="text-center py-12 px-6 bg-muted/20 rounded-3xl mt-8 mx-2 border border-dashed border-border">
      <p className="text-sm font-bold text-foreground">{title}</p>
      <p className="text-[11px] text-muted-foreground mt-2 mb-6 leading-relaxed">{sub}</p>
      <Link
        to="/"
        className="inline-flex items-center justify-center h-10 px-6 rounded-full text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md active:scale-95 transition-all"
      >
        前往大廳
      </Link>
    </div>
  )
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 24 * 60 * 60 * 1000) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
