import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp, Sparkles, ArrowRight } from 'lucide-react'
import { useCharacters, useAllPublicTags } from '@/hooks/useCharacters'
import { useChat } from '@/hooks/useChat'
import { CharacterCard, CharacterCardSkeleton } from '@/components/CharacterCard'
import { cn } from '@/lib/utils'
import type { CharacterWithAuthor } from '@/types'
import { useAuth } from '@/hooks/useAuth'
import { logger } from '@/lib/logger'
import { InviteActivationModal } from '@/components/InviteActivationModal'
import { AlertCircle } from 'lucide-react'

export default function LobbyPage() {
  const navigate = useNavigate()
  const { isAuthenticated, isActive, refreshProfile } = useAuth()
  const { startConversation } = useChat()

  const [showActivateModal, setShowActivateModal] = useState(false)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [tagsExpanded, setTagsExpanded] = useState(false)

  // Auto-reset search when input is completely cleared
  useEffect(() => {
    if (searchInput.trim() === '') {
      setSearch('')
    }
  }, [searchInput])

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const { data: characters = [], isLoading } = useCharacters({
    search,
    tags: selectedTags,
    publicOnly: true,
  })
  const { data: availableTags = [] } = useAllPublicTags()

  const initialTagLimit = isMobile ? 4 : 8
  const visibleTags = tagsExpanded ? availableTags : availableTags.slice(0, initialTagLimit)

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
  }

  const handleCardClick = async (character: CharacterWithAuthor) => {
    if (!isAuthenticated) {
      navigate('/auth')
      return
    }

    if (!isActive) {
      setShowActivateModal(true)
      return
    }

    // Navigate helper
    const navigateToChat = (id: string) => {
      const isMobile = window.innerWidth < 1024;
      navigate(isMobile ? `/room/${id}` : `/chat/${id}`);
    }

    // Find or create conversation with the proper greeting setup
    try {
      const convId = await startConversation(character.id);
      navigateToChat(convId);
    } catch (e) {
      logger.error('handleCardClick Error:', e)
    }
  }

  return (
    <div className="min-h-dvh bg-background">
      {/* ── Pending Activation Alert Banner ── */}
      {isAuthenticated === true && isActive === false && (
        <div 
          onClick={() => setShowActivateModal(true)}
          className={cn(
            "bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-purple-500/10",
            "border-b border-purple-500/20 text-purple-300 text-xs md:text-sm font-semibold",
            "px-4 py-3 flex items-center justify-center gap-2 cursor-pointer hover:bg-white/5 transition-all text-center",
            "relative overflow-hidden group"
          )}
        >
          <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent animate-pulse" />
          <AlertCircle className="w-4 h-4 text-purple-400 shrink-0 group-hover:scale-110 transition-transform" />
          <span>您的帳號尚未啟用，無法使用聊天室。<span className="underline text-purple-400 group-hover:text-purple-300 font-bold ml-1">點此輸入邀請碼立即解鎖</span> 或靜候管理員審核。</span>
        </div>
      )}

      {/* ── Top search area ── */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-3xl border-b border-border shadow-sm px-4 md:px-8 pt-3 md:pt-5 pb-3 md:pb-5">
        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
          {/* 搜尋區塊 - 固定寬度 */}
          <div className="flex items-center gap-3 shrink-0 md:w-[420px]">
            {/* Minimal Logo (Mobile Only) */}
            <div className="flex items-center md:hidden shrink-0">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ background: 'linear-gradient(135deg, hsl(267, 100%, 72%), hsl(220, 100%, 65%))' }}
              >
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            </div>

            <form onSubmit={handleSearch} className="flex-1 relative group/search">
              {/* Search Icon */}
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/search:text-primary transition-colors duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              </div>
              <input
                id="lobby-search"
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="搜尋角色..."
                className={cn(
                  'w-full pl-12 pr-12 py-3 rounded-full text-[15px] font-bold transition-all duration-300',
                  'bg-muted/80 border border-border text-foreground placeholder:text-muted-foreground/60 shadow-sm backdrop-blur-2xl',
                  'group-hover/search:bg-muted group-hover/search:border-border/80',
                  'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary focus:shadow-[0_0_35px_rgba(168,85,247,0.15)]'
                )}
              />
              <button
                type="submit"
                disabled={!searchInput.trim()}
                className={cn(
                  'absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full transition-all duration-300 active:scale-90',
                  searchInput.trim() 
                    ? 'bg-primary text-white shadow-[0_0_20px_rgba(139,92,246,0.6)] scale-100 opacity-100' 
                    : 'bg-white/5 text-white/10 opacity-0 scale-75 pointer-events-none'
                )}
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* 標籤導航區塊 - 次要導覽風格 */}
          {availableTags.length > 0 && (
            <div className="flex-1 flex items-center overflow-x-auto hide-scrollbar">
              <div className="flex items-center gap-2 pr-4 min-w-max">
                {/* 垂直分割線 (僅電腦版) */}
                <div className="hidden md:block w-px h-4 bg-border mx-2" />
                
                {visibleTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      'px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all duration-200 border whitespace-nowrap active:scale-95',
                      selectedTags.includes(tag)
                        ? 'bg-primary/20 text-primary border-primary/40'
                        : 'bg-transparent text-muted-foreground border-border hover:text-foreground hover:bg-muted hover:border-border'
                    )}
                  >
                    {tag}
                  </button>
                ))}
                
                {availableTags.length > initialTagLimit && (
                  <button
                    onClick={() => setTagsExpanded(!tagsExpanded)}
                    className="px-3 py-1.5 rounded-full text-[12px] font-bold text-muted-foreground hover:text-primary transition-all flex items-center gap-1 active:scale-95"
                  >
                    {tagsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {tagsExpanded ? '收合' : '更多'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-4 md:px-8 py-4 md:py-8">
        {/* Filter info */}
        {(search || selectedTags.length > 0) && (
          <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
            <span>找到 {characters.length} 個結果</span>
            <button
              onClick={() => { setSearch(''); setSearchInput(''); setSelectedTags([]) }}
              className="text-primary hover:underline text-xs"
            >
              清除篩選
            </button>
          </div>
        )}

        {isLoading ? (
          <>
            {/* Mobile skeleton */}
            <div className="flex flex-col gap-3 md:hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <CharacterCardSkeleton key={i} variant="horizontal" />
              ))}
            </div>

            {/* Desktop skeleton */}
            <div className="hidden md:grid md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
              {Array.from({ length: 12 }).map((_, i) => (
                <CharacterCardSkeleton key={i} variant="vertical" />
              ))}
            </div>
          </>
        ) : characters.length === 0 ? (
          <EmptyState search={search} />
        ) : (
          <>
            {/* Mobile: vertical list */}
            <div className="flex flex-col gap-3 md:hidden">
              {characters.map((c) => (
                <CharacterCard
                  key={c.id}
                  character={c}
                  variant="horizontal"
                  onClick={() => handleCardClick(c)}
                />
              ))}
            </div>

            {/* Desktop: More dense grid to shrink card sizes */}
            <div className="hidden md:grid md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
              {characters.map((c) => (
                <CharacterCard
                  key={c.id}
                  character={c}
                  variant="vertical"
                  onClick={() => handleCardClick(c)}
                />
              ))}
            </div>
          </>
        )}
      </div>
      {/* ── Activation Modal ── */}
      <InviteActivationModal
        isOpen={showActivateModal}
        onClose={() => setShowActivateModal(false)}
        onSuccess={() => {
          refreshProfile()
        }}
      />
    </div>
  )
}

function EmptyState({ search }: { search: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center space-y-3">
      <div
        className="w-20 h-20 rounded-[24px] flex items-center justify-center mb-4 shadow-2xl shadow-primary/20 ring-1 ring-white/10 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, hsl(267, 70%, 25%), hsl(220, 70%, 20%))' }}
      >
        <div className="absolute inset-0 bg-white/5 opacity-0 hover:opacity-100 transition-opacity" />
        <Sparkles className="w-10 h-10 text-primary/90" />
      </div>
      <h3 className="font-semibold text-foreground">
        {search ? `找不到「${search}」的角色` : '還沒有公開角色'}
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        {search ? '試試其他關鍵字，或清除篩選條件' : '成為第一個創造角色的人吧！'}
      </p>
    </div>
  )
}
