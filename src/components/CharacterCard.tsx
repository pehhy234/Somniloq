import { cn, getAvatarFallback } from '@/lib/utils'
import type { CharacterWithAuthor } from '@/types'

interface CharacterCardProps {
  character: CharacterWithAuthor
  variant?: 'horizontal' | 'vertical'
  onClick?: () => void
}

export function CharacterCard({ character, variant = 'horizontal', onClick }: CharacterCardProps) {
  const { name, description, tags, avatar_url, author } = character

  if (variant === 'vertical') {
    return (
      <div
        onClick={onClick}
        className="group cursor-pointer rounded-[24px] overflow-hidden border border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 hover:bg-card transition-all duration-400 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1 relative"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10" />
        {/* Image */}
        <div className="aspect-square overflow-hidden bg-muted relative">
          {avatar_url ? (
            <img
              src={avatar_url}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-4xl font-bold text-white/60"
              style={{ background: `linear-gradient(135deg, hsl(${stringToHue(name)}, 60%, 35%), hsl(${stringToHue(name) + 40}, 60%, 25%))` }}
            >
              {getAvatarFallback(name)}
            </div>
          )}
          {/* Tags overlay */}
          {tags.length > 0 && (
            <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
              {tags.slice(0, 2).map((tag) => (
                <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] font-medium glass-dark text-white/80">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        {/* Info */}
        <div className="p-3 space-y-1.5">
          <h3 className="font-bold text-foreground text-sm leading-tight">{name}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{description || '暫無介紹'}</p>
          <p className="text-[11px] text-muted-foreground/70">by {author?.username ?? '匿名'}</p>
        </div>
      </div>
    )
  }

  // Horizontal layout (mobile)
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer flex gap-3 p-3 rounded-[24px] border border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-all duration-400 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:bg-card hover:shadow-xl hover:shadow-primary/5 active:scale-[0.98] relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      {/* Thumbnail (1/3 width) */}
      <div className="w-24 shrink-0 aspect-[3/4] rounded-xl overflow-hidden bg-muted relative">
        {avatar_url ? (
          <img
            src={avatar_url}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-2xl font-black text-white/70"
            style={{ background: `linear-gradient(135deg, hsl(${stringToHue(name)}, 70%, 40%), hsl(${stringToHue(name) + 40}, 70%, 30%))` }}
          >
            {getAvatarFallback(name)}
          </div>
        )}
      </div>

      {/* Info (2/3 width) */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        {/* Name */}
        <h3 className="font-bold text-foreground text-sm leading-tight">{name}</h3>
        {/* Description */}
        <p className="text-xs text-muted-foreground leading-relaxed flex-1 my-1.5 line-clamp-3">
          {description || '暫無介紹'}
        </p>
        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 my-1">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/15 text-primary border border-primary/20"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        {/* Author */}
        <p className="text-[11px] text-muted-foreground/70">by {author?.username ?? '匿名'}</p>
      </div>
    </div>
  )
}

// Deterministic color from string
function stringToHue(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % 360
}

// ── Quick avatar (for lists etc) ──────────────────────────────
interface AvatarProps {
  src?: string | null
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function CharacterAvatar({ src, name, size = 'md', className }: AvatarProps) {
  const sizeClass = { sm: 'w-10 h-10 text-sm', md: 'w-12 h-12 text-base', lg: 'w-16 h-16 text-xl' }[size]

  return (
    <div
      className={cn('rounded-xl overflow-hidden shrink-0 flex items-center justify-center font-bold text-white/70', sizeClass, className)}
      style={!src ? { background: `linear-gradient(135deg, hsl(${stringToHue(name)}, 60%, 35%), hsl(${stringToHue(name) + 40}, 60%, 25%))` } : undefined}
    >
      {src ? (
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        getAvatarFallback(name)
      )}
    </div>
  )
}
