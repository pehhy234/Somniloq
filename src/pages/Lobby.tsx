import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronDown, ChevronUp, Loader2, Sparkles } from 'lucide-react'
import { useCharacters, useAllPublicTags } from '@/hooks/useCharacters'
import { useChat } from '@/hooks/useChat'
import { CharacterCard } from '@/components/CharacterCard'
import { cn } from '@/lib/utils'
import type { CharacterWithAuthor } from '@/types'
import { useAuth } from '@/hooks/useAuth'
import { logger } from '@/lib/logger'

export default function LobbyPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { startConversation } = useChat()

  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [tagsExpanded, setTagsExpanded] = useState(false)

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

    // Navigate helper
    const navigateToChat = (id: string) => {
      const isMobile = window.innerWidth < 768;
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
      {/* ── Top search area ── */}
      <div className="sticky top-0 z-40 bg-background/60 backdrop-blur-2xl border-b border-border/40 shadow-sm px-4 md:px-8 pt-4 md:pt-6 pb-3 md:pb-5 space-y-3">
        {/* Logo (visible only when not logged in / no desktop nav) */}
        <div className="flex items-center gap-2 md:hidden">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, hsl(267, 100%, 72%), hsl(220, 100%, 65%))' }}
          >
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-foreground">Somniloq</span>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              id="lobby-search"
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="搜尋角色..."
              className={cn(
                'w-full pl-10 pr-4 py-3 rounded-2xl text-[15px] font-medium transition-all duration-300',
                'bg-muted/40 border border-border/60 text-foreground placeholder:text-muted-foreground/70 shadow-inner',
                'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 focus:bg-muted/60'
              )}
            />
          </div>
          <button
            type="submit"
            className="px-5 py-3 rounded-2xl text-[15px] font-bold text-white transition-all duration-300 hover:brightness-110 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] active:scale-95 shrink-0"
            style={{ background: 'linear-gradient(135deg, hsl(267, 100%, 72%), hsl(240, 100%, 65%))' }}
          >
            搜尋
          </button>
        </form>

        {/* Tags row */}
        {availableTags.length > 0 && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {visibleTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    'px-3.5 py-1.5 rounded-full text-[13px] font-bold transition-all duration-300 border active:scale-95',
                    selectedTags.includes(tag)
                      ? 'bg-primary/10 text-primary border-primary/30 shadow-[0_0_12px_rgba(168,85,247,0.15)] ring-1 ring-primary/20'
                      : 'bg-muted/40 text-muted-foreground border-border/30 shadow-sm hover:bg-muted/60 hover:text-foreground hover:border-border/60'
                  )}
                >
                  {tag}
                </button>
              ))}
              {availableTags.length > initialTagLimit && (
                <button
                  onClick={() => setTagsExpanded(!tagsExpanded)}
                  className="px-3 py-1.5 rounded-full text-[13px] font-bold text-primary border border-primary/30 shadow-sm hover:bg-primary/10 transition-all flex items-center gap-1 active:scale-95"
                >
                  {tagsExpanded ? (
                    <><ChevronUp className="w-3.5 h-3.5" />收合</>
                  ) : (
                    <><ChevronDown className="w-3.5 h-3.5" />更多</>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
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
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
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
