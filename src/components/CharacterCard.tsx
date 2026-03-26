import { cn, getAvatarFallback } from '@/lib/utils'
import type { CharacterWithAuthor } from '@/types'

interface CharacterCardProps {
  character: CharacterWithAuthor
  variant?: 'horizontal' | 'vertical'
  onClick?: () => void
}

export function CharacterCard({ character, variant = 'horizontal', onClick }: CharacterCardProps) {
  const { name, description, avatar_url, author } = character

  if (variant === 'vertical') {
    return (
      <div
        onClick={onClick}
        className="group cursor-pointer rounded-3xl overflow-hidden glass-md border border-white/5 hover:border-primary/40 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-1 relative aspect-[4/5]"
      >
        {/* Main Character Image */}
        <div className="absolute inset-0 bg-muted z-0">
          {avatar_url ? (
            <img
              src={avatar_url}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-5xl font-black text-white/40"
              style={{ background: `linear-gradient(135deg, hsl(${stringToHue(name)}, 70%, 25%), hsl(${stringToHue(name) + 40}, 70%, 15%))` }}
            >
              {getAvatarFallback(name)}
            </div>
          )}
        </div>

        {/* Bottom Overlay Info (45% height) */}
        <div className="absolute inset-x-0 bottom-0 h-[45%] z-20 flex flex-col justify-end px-4 pb-5 pt-8 bg-gradient-to-t from-black/90 via-black/70 to-transparent">
          <div className="space-y-2">
            {/* 1. Name */}
            <h3 className="font-bold text-white text-[16px] leading-tight drop-shadow-xl group-hover:text-primary transition-colors duration-300">
              {name}
            </h3>
            
            {/* 2. Description (Clamped - increased lines since we have 45% height) */}
            <p className="text-[12px] text-white/60 leading-relaxed line-clamp-3 font-medium">
              {description || '暫無介紹'}
            </p>

            {/* 3. Author (Aligned Right) */}
            <div className="flex justify-end pt-1">
              <span className="text-[10px] font-black text-primary/80 tracking-widest uppercase">
                BY {author?.username ?? 'ANONYMOUS'}
              </span>
            </div>
          </div>
        </div>

        {/* Hover Glow Effect */}
        <div className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-b from-primary/10 via-transparent to-transparent pointer-events-none" />
      </div>
    )
  }

  // Horizontal layout (mobile)
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer flex rounded-[28px] glass-md border border-white/5 active:scale-[0.98] transition-all duration-300 relative overflow-hidden h-[120px]"
    >
      {/* Thumbnail (1/3 width-ish) - Full height, no padding */}
      <div className="w-[105px] shrink-0 h-full overflow-hidden bg-white/5 relative shadow-inner">
        {avatar_url ? (
          <img
            src={avatar_url}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-3xl font-black text-white/30"
            style={{ background: `linear-gradient(135deg, hsl(${stringToHue(name)}, 70%, 30%), hsl(${stringToHue(name) + 40}, 70%, 20%))` }}
          >
            {getAvatarFallback(name)}
          </div>
        )}
      </div>

      {/* Info (2/3 width) - Centered vertically with padding */}
      <div className="flex-1 min-w-0 flex flex-col justify-center px-4 py-2">
        {/* Name */}
        <h3 className="font-bold text-white text-[15px] leading-snug drop-shadow-sm mb-1">{name}</h3>
        {/* Description */}
        <p className="text-[12px] text-white/40 leading-relaxed flex-1 line-clamp-2 font-medium">
          {description || '暫無介紹'}
        </p>
        {/* Author */}
        <div className="flex justify-end mt-1">
          <span className="text-[9px] font-black text-primary/60 tracking-widest uppercase">
            BY {author?.username ?? 'ADMIN'}
          </span>
        </div>
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
