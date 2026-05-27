import { useParams, useNavigate, Link } from 'react-router-dom'
import { MessageCircle, Trash2, ChevronRight } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useChat } from '@/hooks/useChat'
import { useCharacters } from '@/hooks/useCharacters'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { ChatRoomContent } from '@/pages/ChatRoom'
import { useModalStore } from '@/stores/modalStore'
import { logger } from '@/lib/logger'
import { ShieldAlert } from 'lucide-react'
import { InviteActivationModal } from '@/components/InviteActivationModal'

type TabType = 'chat' | 'character'

export default function ChatPage() {
  const { conversationId } = useParams<{ conversationId?: string }>()
  const navigate = useNavigate()
  const { user, isActive, refreshProfile } = useAuth()
  const { 
    conversations, 
    isConversationsLoading, 
    deleteConversation,
    startConversation
  } = useChat()

  const [showActivateModal, setShowActivateModal] = useState(false)

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

  if (!isActive) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-4 relative overflow-hidden" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, hsl(267 100% 72% / 0.08) 0%, transparent 70%), hsl(var(--background))' }}>
        {/* Background decoration */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />
        
        <div className="w-full max-w-[420px] bg-card/60 backdrop-blur-3xl rounded-[28px] border border-white/10 shadow-[0_32px_80px_rgba(0,0,0,0.35)] p-8 text-center space-y-6 relative z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-transparent pointer-events-none rounded-[28px]" />
          
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto shadow-lg">
            <ShieldAlert className="w-8 h-8 text-primary" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-black tracking-tight">帳號尚未啟用</h2>
            <p className="text-muted-foreground text-xs leading-relaxed">
              很抱歉，創造 AI 角色與聊天功能僅開放給已啟用的帳號。<br/>
              您可以立刻輸入邀請碼解鎖全站功能，或靜候管理員審核。
            </p>
          </div>
          
          <div className="flex flex-col gap-2 pt-2">
            <button 
              onClick={() => setShowActivateModal(true)}
              className="w-full py-3.5 rounded-full text-xs font-black text-white shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all"
              style={{ background: 'linear-gradient(135deg, hsl(267, 70%, 42%), hsl(244, 60%, 38%))' }}
            >
              輸入邀請碼立即啟用
            </button>
            <button 
              onClick={() => navigate('/')}
              className="w-full py-3 rounded-full text-xs font-bold bg-white/5 border border-white/10 text-muted-foreground hover:bg-white/10 hover:text-foreground transition-all active:scale-[0.98]"
            >
              返回大廳
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

  return (
    <div className="flex h-dvh bg-background overflow-hidden">
      {/* ── 左欄/手機全屏：列表區域 ── */}
      <div 
        className={cn(
          "w-full lg:w-80 lg:min-w-[320px] flex flex-col border-r border-border bg-background relative",
          conversationId ? 'hidden lg:flex' : 'flex'
        )}
      >
        {/* 頂部頁籤切換 */}
        <div className="pt-6 px-4 bg-background/80 backdrop-blur-xl sticky top-0 z-20 pb-4">
          <div className="flex glass-pill p-1 rounded-2xl mb-2">
            <button
              onClick={() => setActiveTab('chat')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 text-[14px] font-bold rounded-xl transition-all duration-300",
                activeTab === 'chat' 
                  ? "bg-muted text-foreground shadow-sm ring-1 ring-border" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              我的對話
            </button>
            <button
              onClick={() => setActiveTab('character')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 text-[14px] font-bold rounded-xl transition-all duration-300",
                activeTab === 'character' 
                  ? "bg-muted text-foreground shadow-sm ring-1 ring-border" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              我的角色
            </button>
          </div>
        </div>

        {/* 列表內容 */}
        <div className="flex-1 overflow-y-auto px-4 pb-28 lg:pb-6 relative hide-scrollbar space-y-4 pt-2">
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
                  className="relative group overflow-hidden rounded-3xl mb-3"
                  onTouchStart={handleTouchStart}
                  onTouchMove={(e) => handleTouchMove(e, conv.id)}
                  onTouchEnd={handleTouchEnd}
                >
                  {/* ── 手機版：左滑出現的刪除塊 ── */}
                  <div 
                    className={cn(
                      "absolute inset-y-0 right-0 w-20 flex items-center justify-center bg-red-500 text-white transition-transform duration-300 z-0",
                      swipedId === conv.id ? "translate-x-0" : "translate-x-full"
                    )}
                    onClick={(e) => handleDelete(e, conv.id)}
                  >
                    <Trash2 className="w-5 h-5" />
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
                      "w-full flex items-center gap-4 p-4 transition-all duration-300 text-left relative z-10 cursor-pointer overflow-hidden rounded-3xl border border-border/50",
                      swipedId === conv.id ? "-translate-x-20" : "translate-x-0",
                      conv.id === conversationId 
                        ? "bg-muted border-primary/20" 
                        : "hover:bg-muted/60 active:scale-[0.98]"
                    )}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={conv.character.avatar_url || 'https://via.placeholder.com/150'}
                        className="w-[56px] h-[56px] rounded-2xl object-cover border border-border shadow-sm bg-muted group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="flex-1 min-w-0 pr-8">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-[16px] text-foreground truncate drop-shadow-sm">
                          {conv.character.name}
                        </h3>
                        <span className="text-[12px] text-muted-foreground font-medium">
                          {formatDate(conv.updated_at)}
                        </span>
                      </div>
                      <p className="text-[14px] text-muted-foreground truncate leading-snug font-medium">
                        {conv.last_message?.content || conv.character.description || '點擊開始對話'}
                      </p>
                    </div>

                    {/* ── 電腦版：懸浮刪除鈕 ── */}
                    <div className="hidden lg:flex absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(e, conv.id)
                        }}
                        className="p-2 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors shadow-sm"
                        title="刪除對話"
                      >
                        <Trash2 className="w-4 h-4" />
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
                  className="w-full flex items-center gap-4 p-4 mb-3 rounded-3xl border border-border hover:bg-muted/60 active:scale-[0.98] transition-all text-left shadow-sm group"
                >
                  <div className="shrink-0 relative">
                    <img
                      src={char.avatar_url || 'https://via.placeholder.com/150'}
                      className="w-[56px] h-[56px] rounded-2xl object-cover border border-border shadow-sm bg-muted group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-[16px] text-foreground truncate drop-shadow-sm">{char.name}</h3>
                      <ChevronRight className="w-5 h-5 text-muted-foreground/50" />
                    </div>
                    <p className="text-[14px] text-muted-foreground truncate leading-snug font-medium">
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
      {/* ── Activation Modal ── */}
      <InviteActivationModal
        isOpen={showActivateModal}
        onClose={() => setShowActivateModal(false)}
        onSuccess={refreshProfile}
      />
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
        className="inline-flex items-center justify-center h-10 px-6 rounded-full text-xs font-bold text-white transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:brightness-110 active:scale-95"
        style={{ background: 'linear-gradient(135deg, hsl(267, 46%, 35%), hsl(244, 52%, 31%))' }}
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
