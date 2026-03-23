import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, X, Loader2, RefreshCw, Sparkles, ImagePlus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

interface CharacterForm {
  name: string
  description: string
  greeting: string
  prompt: string
  tags: string[]
  is_public: boolean
}

const INITIAL_FORM: CharacterForm = {
  name: '',
  description: '',
  greeting: '',
  prompt: '',
  tags: [],
  is_public: false,
}

export default function CreatePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<CharacterForm>(INITIAL_FORM)
  const [tagInput, setTagInput] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const set = <K extends keyof CharacterForm>(key: K, value: CharacterForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  // ── Tag helpers ────────────────────────────────────────────
  const addTag = () => {
    const input = tagInput.trim()
    if (!input) return

    // 支援以半型逗號、全型逗號或空格分隔批量新增
    const newTags = input
      .split(/[,，\s]+/)
      .map(t => t.trim())
      .filter(t => t && !form.tags.includes(t))

    if (newTags.length > 0) {
      set('tags', [...form.tags, ...newTags])
    }
    setTagInput('')
  }

  const removeTag = (tag: string) => set('tags', form.tags.filter((t) => t !== tag))

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); addTag() }
    if (e.key === 'Backspace' && !tagInput && form.tags.length > 0) {
      set('tags', form.tags.slice(0, -1))
    }
  }

  // ── Avatar upload ──────────────────────────────────────────
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const removeAvatar = () => {
    setAvatarFile(null)
    setAvatarPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Submit ─────────────────────────────────────────────────
  const { mutate: createCharacter, isPending, error: mutationError } = useMutation({
    mutationFn: async () => {
      // 加上 8 秒的網路或死鎖超時，防止 UI 無限卡在「建立中...」
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(new Error('伺服器回應逾時，請再此點擊建立')), 8000)

      try {
        if (!user) throw new Error('請先登入')
        if (!form.name.trim()) throw new Error('請輸入角色名稱')

        let avatar_url: string | null = null

        // Upload avatar to Supabase Storage
        if (avatarFile) {
          const ext = avatarFile.name.split('.').pop()
          const path = `${user.id}/${Date.now()}.${ext}`
          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(path, avatarFile, { upsert: true })

          if (uploadError) throw new Error(`圖片上傳失敗: ${uploadError.message}`)

          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
          avatar_url = urlData.publicUrl
        }

        const { data, error } = await supabase
          .from('characters')
          .insert({
            author_id: user.id,
            name: form.name.trim(),
            description: form.description.trim(),
            greeting: form.greeting.trim(),
            prompt: form.prompt.trim(),
            tags: form.tags,
            is_public: form.is_public,
            avatar_url,
          } as any)
          .select('id')
          .abortSignal(controller.signal)
          .single()

        if (error) {
          throw new Error(`資料庫錯誤: ${error.message} (${error.code || '未知代碼'})`)
        }
        
        return data
      } finally {
        clearTimeout(timeoutId)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['characters'] })
      navigate('/')
    },
  })

  const handleReset = () => {
    setForm(INITIAL_FORM)
    setTagInput('')
    removeAvatar()
  }

  const inputClass = cn(
    'w-full px-4 py-3.5 rounded-[20px] text-[15px] font-medium transition-all duration-300',
    'bg-muted/40 border border-white/5 shadow-inner text-foreground placeholder:text-muted-foreground/50',
    'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 focus:bg-muted/60'
  )

  const labelClass = 'block text-xs font-bold text-muted-foreground/70 uppercase tracking-widest mb-2'

  return (
    <div className="min-h-dvh bg-background" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, hsl(267 100% 72% / 0.06) 0%, transparent 70%), hsl(var(--background))' }}>
      {/* ── Header ── */}
      <div className="sticky top-0 z-40 bg-background/85 backdrop-blur-2xl border-b border-border/60 px-6 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[10px] bg-primary/15 flex items-center justify-center border border-primary/20">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground leading-none">創造角色</h1>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5 font-medium uppercase tracking-wider">Character Creator</p>
            </div>
          </div>
          {/* 進度指示 */}
          <div className="flex items-center gap-2">
            {[
              { key: 'name', label: '名稱', filled: !!form.name },
              { key: 'desc', label: '介紹', filled: !!form.description },
              { key: 'prompt', label: 'Prompt', filled: !!form.prompt },
              { key: 'avatar', label: '圖片', filled: !!avatarPreview },
            ].map(({ key, label, filled }) => (
              <div key={key} className="flex items-center gap-1" title={label}>
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all duration-300",
                  filled ? "bg-primary scale-110" : "bg-border"
                )} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {mutationError && (
          <div className="mb-6 p-4 rounded-2xl bg-destructive/10 border border-destructive/25 text-sm text-destructive-foreground/80 flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-destructive/20 flex items-center justify-center shrink-0 mt-0.5">
              <X className="w-3 h-3 text-destructive-foreground" />
            </div>
            <span>{mutationError instanceof Error ? mutationError.message : '發生錯誤'}</span>
          </div>
        )}

        {/* ── Layout: single col on mobile, two col on desktop ── */}
        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-10 items-start">

          {/* ── LEFT COLUMN: image + public toggle ── */}
          <div className="space-y-5">

            {/* Avatar upload */}
            <div className="flex flex-col items-center md:items-start">
              <label className={labelClass}>角色圖片</label>
              {avatarPreview ? (
                <div className="relative w-48 aspect-square md:w-full group">
                  <img
                    src={avatarPreview}
                    alt="preview"
                    className="w-full h-full object-cover rounded-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                  />
                  {/* 懸停遮罩 */}
                  <div className="absolute inset-0 rounded-[20px] bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center">
                    <button
                      onClick={removeAvatar}
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-9 h-9 rounded-full bg-black/70 flex items-center justify-center hover:bg-black/90"
                      aria-label="移除圖片"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                  {/* 角標 */}
                  <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[9px] font-bold text-white/70 uppercase tracking-wider">
                    已上傳
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  className={cn(
                    'w-48 aspect-square md:w-full rounded-[32px] border-2 border-dashed transition-all duration-400 ease-[cubic-bezier(0.2,0.8,0.2,1)] cursor-pointer',
                    'flex flex-col items-center justify-center gap-3 relative overflow-hidden',
                    isDragging
                      ? 'border-primary bg-primary/20 scale-[1.02] shadow-[0_0_40px_rgba(168,85,247,0.2)]'
                      : 'border-white/10 bg-muted/20 backdrop-blur-sm hover:border-primary/40 hover:bg-primary/5 hover:shadow-2xl'
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors duration-200",
                    isDragging ? "bg-primary/20" : "bg-muted"
                  )}>
                    <ImagePlus className={cn("w-6 h-6 transition-colors duration-200", isDragging ? "text-primary" : "text-muted-foreground/50")} />
                  </div>
                  <div className="text-center px-3">
                    <p className="text-[12px] font-semibold text-foreground/70 leading-tight">
                      {isDragging ? '放開即可上傳' : '點擊或拖放圖片'}
                    </p>
                    <p className="text-[10px] text-muted-foreground/50 mt-1">JPG, PNG, WebP, GIF</p>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            {/* Is public toggle */}
            <div className="rounded-2xl p-4 border border-border bg-muted/50">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">公開角色</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-0.5 leading-snug">讓其他使用者在大廳發現此角色</p>
                </div>
                <button
                  id="create-public-toggle"
                  type="button"
                  onClick={() => set('is_public', !form.is_public)}
                  className={cn(
                    "relative w-12 h-6.5 rounded-full transition-all duration-300 shrink-0 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 focus:ring-offset-background",
                    form.is_public ? 'bg-primary' : 'bg-muted-foreground/25'
                  )}
                  aria-label="切換公開狀態"
                >
                  <span
                    className={cn(
                      "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300",
                      form.is_public ? 'translate-x-[22px]' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>
            </div>

          </div>

          {/* ── RIGHT COLUMN: text fields ── */}
          <div className="space-y-5">

            {/* Row 1: Name + Tags (1-line fields) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              {/* Name */}
              <div className="flex flex-col">
                <label className={labelClass}>
                  角色名稱 <span className="text-primary normal-case tracking-normal">*</span>
                </label>
                <input
                  id="create-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="例：艾拉"
                  className={inputClass}
                />
              </div>

              {/* Tags */}
              <div className="flex flex-col">
                <label className={labelClass}>
                  標籤
                  <span className="ml-1.5 text-[10px] normal-case tracking-normal font-normal text-muted-foreground/40">逗號或空格分隔</span>
                </label>
                <div className={cn(
                  'w-full min-h-[52px] px-3 py-[9px] rounded-[20px] border border-white/5 bg-muted/40 shadow-inner',
                  'flex flex-wrap gap-1.5 items-center',
                  'focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/50 focus-within:bg-muted/60 transition-all duration-300'
                )}>
                  {form.tags.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary/15 text-primary border border-primary/25 shrink-0"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="hover:text-destructive transition-colors duration-150 ml-0.5"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                  <input
                    id="create-tags"
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    onBlur={addTag}
                    placeholder={form.tags.length === 0 ? '輸入標籤...' : ''}
                    className="min-w-[80px] flex-1 bg-transparent text-[15px] font-medium text-foreground placeholder:text-muted-foreground/50 outline-none h-6 px-1"
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Description + Greeting (multi-line fields) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              {/* Description */}
              <div className="flex flex-col">
                <label className={labelClass}>角色介紹</label>
                <textarea
                  id="create-description"
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="在大廳卡片顯示的簡短介紹"
                  rows={4}
                  className={cn(inputClass, 'resize-none leading-relaxed')}
                />
              </div>

              {/* Greeting */}
              <div className="flex flex-col">
                <label className={labelClass}>角色問候語</label>
                <textarea
                  id="create-greeting"
                  value={form.greeting}
                  onChange={(e) => set('greeting', e.target.value)}
                  placeholder="第一次對話時角色說的第一句話"
                  rows={4}
                  className={cn(inputClass, 'resize-none leading-relaxed')}
                />
              </div>
            </div>

            {/* Row 3: Prompt (full width) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={labelClass}>角色設定 (Prompt)</label>
                <span className={cn(
                  "text-[10px] font-bold tabular-nums transition-all duration-200 px-2 py-0.5 rounded-full",
                  form.prompt.length > 1000
                    ? "text-primary bg-primary/10 border border-primary/20"
                    : "text-muted-foreground/40"
                )}>
                  {form.prompt.length.toLocaleString()} 字元
                </span>
              </div>
              <textarea
                id="create-prompt"
                value={form.prompt}
                onChange={(e) => set('prompt', e.target.value)}
                placeholder={`描述角色的個性、背景、說話方式…\n\n例：你是艾拉，一位25歲的溫柔醫生。你說話輕柔，總是關心對方的感受。你擅長傾聽，會在對話中給予溫暖的鼓勵。`}
                rows={12}
                className={cn(inputClass, 'resize-y leading-relaxed min-h-[200px]')}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-border/40">
              <button
                id="create-reset"
                onClick={handleReset}
                type="button"
                className="flex items-center gap-1.5 px-4 py-3 rounded-2xl text-sm font-semibold text-muted-foreground border border-border hover:bg-muted hover:text-foreground transition-all duration-200 shrink-0 active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                重置
              </button>

              <button
                id="create-draft"
                onClick={() => alert('已成功暫存草稿 (模擬)')}
                type="button"
                className="flex-1 px-4 py-3 rounded-2xl text-sm font-semibold text-foreground/70 bg-muted/80 border border-border hover:bg-muted hover:text-foreground transition-all duration-200 active:scale-[0.98]"
              >
                暫存草稿
              </button>

              <button
                id="create-submit"
                onClick={() => createCharacter()}
                disabled={isPending || !form.name.trim()}
                className={cn(
                  'flex-[2] flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-white transition-all duration-200',
                  'shadow-lg shadow-primary/25 active:scale-[0.98]',
                  'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none',
                  !isPending && form.name.trim() && 'hover:brightness-110 hover:shadow-xl hover:shadow-primary/30'
                )}
                style={{ background: 'linear-gradient(135deg, hsl(267, 100%, 72%), hsl(240, 100%, 65%))' }}
              >
                {isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />建立中...</>
                ) : (
                  <><Sparkles className="w-4 h-4" />創造角色</>
                )}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
