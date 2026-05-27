import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { X, Loader2, RefreshCw, Sparkles, ImagePlus, ShieldAlert } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { useModalStore } from '@/stores/modalStore'
import { compressImage } from '@/lib/image'
import { InviteActivationModal } from '@/components/InviteActivationModal'

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
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const modal = useModalStore()
  const queryClient = useQueryClient()
  const { user, isActive, refreshProfile } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [showActivateModal, setShowActivateModal] = useState(false)
  const [form, setForm] = useState<CharacterForm>(INITIAL_FORM)
  const [tagInput, setTagInput] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // 1. Fetch character if editing
  const { data: existingData } = useQuery({
    queryKey: ['character', id],
    queryFn: async () => {
      if (!id) return null
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as any
    },
    enabled: !!id,
  })

  // 同步表單資料
  useEffect(() => {
    if (id && existingData) {
      setForm({
        name: existingData.name,
        description: existingData.description || '',
        greeting: existingData.greeting || '',
        prompt: existingData.prompt || '',
        tags: existingData.tags || [],
        is_public: existingData.is_public ?? false,
      })
      if (existingData.avatar_url) setAvatarPreview(existingData.avatar_url)
    } else if (!id) {
      // 確保回到新建模式時清空表單
      setForm(INITIAL_FORM)
      setAvatarPreview(null)
      setAvatarFile(null)
    }
  }, [id, existingData])

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
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  const MAX_AVATAR_SIZE = 5 * 1024 * 1024  // 5MB

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // [Security L-03] Validate MIME type and size before upload
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      modal.alert('只支援 JPEG、PNG、WebP、GIF 格式', { title: '格式不支援' })
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    if (file.size > MAX_AVATAR_SIZE) {
      modal.alert('圖片大小不可超過 5MB', { title: '檔案過大' })
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    try {
      const compressed = await compressImage(file, { maxWidth: 512, maxHeight: 512, quality: 0.8 })
      setAvatarFile(compressed)
      setAvatarPreview(URL.createObjectURL(compressed))
    } catch (err: any) {
      console.error('Image compression failed, using original file:', err)
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    // [Security L-03] Strict whitelist check instead of startsWith('image/')
    if (file && ALLOWED_IMAGE_TYPES.includes(file.type) && file.size <= MAX_AVATAR_SIZE) {
      try {
        const compressed = await compressImage(file, { maxWidth: 512, maxHeight: 512, quality: 0.8 })
        setAvatarFile(compressed)
        setAvatarPreview(URL.createObjectURL(compressed))
      } catch (err: any) {
        console.error('Image compression failed, using original file:', err)
        setAvatarFile(file)
        setAvatarPreview(URL.createObjectURL(file))
      }
    } else if (file) {
      modal.alert('只支援 JPEG、PNG、WebP、GIF（最大 5MB）', { title: '格式或大小不符' })
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
        if (!form.prompt.trim()) throw new Error('請填寫核心設定 (Prompt)')

        // If editing and NOT the author, prevent saving
        if (id && existingData && existingData.author_id !== user.id) {
          throw new Error('您不是此角色的作者，無法儲存變更')
        }

        let avatar_url = avatarPreview

        // Upload avatar to Supabase Storage only if a new file is selected
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

        // [Security] Explicit payload — max lengths enforced at DB layer too
        const safePayload = {
          author_id:   user.id,
          name:        form.name.trim().slice(0, 100),
          description: form.description.trim().slice(0, 500),
          greeting:    form.greeting.trim().slice(0, 2000),
          prompt:      form.prompt.trim().slice(0, 20000),
          tags:        form.tags.slice(0, 20),  // max 20 tags
          is_public:   form.is_public,
          avatar_url,
        }

        const { data, error } = id
          ? await (supabase
              .from('characters') as any)
              .update(safePayload)
              .eq('id', id)
              .select('id')
              .single()
          : await (supabase
              .from('characters') as any)
              .insert(safePayload)
              .select('id')
              .single()

        if (error) {
          throw new Error(`資料庫錯誤: ${error.message} (${error.code || '未知代碼'})`)
        }

        // ── 5. Clean up old image if updating and a new one was uploaded ──
        if (id && avatarFile && existingData?.avatar_url) {
          try {
            const oldUrl = existingData.avatar_url;
            // 從 URL 中提取檔案路徑 (例如: user_id/timestamp.png)
            const oldPath = oldUrl.split('/avatars/').pop();
            
            if (oldPath) {
              console.log('Cleaning up old avatar:', oldPath);
              await supabase.storage.from('avatars').remove([oldPath]);
            }
          } catch (cleanupError) {
            console.error('Failed to cleanup old avatar:', cleanupError);
            // 不拋出錯誤，讓主流程完成 (使用者體驗優先)
          }
        }
        
        return data
      } finally {
        clearTimeout(timeoutId)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['characters'] })
      queryClient.invalidateQueries({ queryKey: ['character', id] })
      navigate('/')
    },
  })

  const handleReset = () => {
    setForm(INITIAL_FORM)
    setTagInput('')
    removeAvatar()
  }

  const inputClass = cn(
    'w-full px-4 py-3.5 rounded-xl text-[15px] font-medium transition-all duration-300',
    'bg-muted/60 border border-border shadow-inner text-foreground placeholder:text-muted-foreground/40',
    'focus:outline-none focus:border-primary/40 focus:bg-muted/80'
  )

  // Required fields get stronger label color; optional fields stay muted
  const labelClass = 'block text-xs font-bold text-muted-foreground/60 uppercase tracking-widest mb-2'
  const labelRequiredClass = 'block text-xs font-bold text-foreground/80 uppercase tracking-widest mb-2'

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
    <div className="min-h-dvh bg-background" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, hsl(267 100% 72% / 0.06) 0%, transparent 70%), hsl(var(--background))' }}>
      {/* ── Header ── */}
      <div className="sticky top-0 z-40 bg-background/85 backdrop-blur-2xl border-b border-border/60 px-6 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[12px] bg-primary/15 flex items-center justify-center border border-primary/20 shadow-inner">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-black text-foreground leading-none tracking-tight">{id ? '編輯角色' : '創造角色'}</h1>
              <p className="text-[10px] text-muted-foreground/50 mt-0.5 font-medium uppercase tracking-widest">{id ? 'Character Editor' : 'Character Creator'}</p>
            </div>
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
        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6 md:gap-8 items-start p-6 md:p-8 rounded-[32px] border border-border bg-muted/20 backdrop-blur-sm shadow-sm">

          {/* ── LEFT COLUMN: image + public toggle ── */}
          <div className="space-y-5">

            {/* Avatar upload */}
            <div className="flex flex-col items-center md:items-start">
              <label className={labelClass}>角色圖片</label>
              {avatarPreview ? (
                <div className="relative w-48 aspect-square md:w-full group overflow-hidden rounded-[32px]">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-full cursor-pointer relative transition-transform duration-300 active:scale-95"
                  >
                    <img
                      src={avatarPreview}
                      alt="preview"
                      className="w-full h-full object-cover rounded-[32px] border border-border"
                    />
                    {/* 點擊更換的遮罩提示：取中間平衡點（手機常駐，桌機懸停） */}
                    <div className="absolute inset-0 bg-black/20 lg:bg-black/0 lg:group-hover:bg-black/40 transition-all duration-300 flex flex-col items-center justify-center">
                      <ImagePlus className="w-6 h-6 text-white/80 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-300" />
                      <span className="text-white/70 text-[10px] font-bold tracking-wide mt-2 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-300">
                        點擊更換圖片
                      </span>
                    </div>
                  </div>

                  {/* 角標：僅提示狀態 */}
                  <div className="absolute bottom-3 right-3 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[9px] font-black text-white/80 uppercase tracking-widest border border-white/10 pointer-events-none">
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
                      : 'border-border bg-muted/20 backdrop-blur-sm hover:border-primary/40 hover:bg-primary/5 hover:shadow-2xl'
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
                    "relative w-11 h-6 rounded-full transition-all duration-300 shrink-0 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 focus:ring-offset-background",
                    form.is_public ? 'bg-primary' : 'bg-zinc-300 dark:bg-zinc-700'
                  )}
                  aria-label="切換公開狀態"
                >
                  <span
                    className={cn(
                      "absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-300",
                      form.is_public ? 'translate-x-5 scale-110' : 'translate-x-0'
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
              {/* Name — Required, stronger label */}
              <div className="flex flex-col">
                <label className={labelRequiredClass}>
                  角色名稱 <span className="text-primary normal-case tracking-normal font-black">*</span>
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
                 'w-full min-h-[52px] px-3 py-[9px] rounded-xl border border-border bg-muted/60 shadow-inner',
                  'flex flex-wrap gap-1.5 items-center',
                  'focus-within:border-primary/40 focus-within:bg-muted/80 transition-all duration-300'
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


            {/* Prompt (full width) — Consistent with other form fields */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <label className={cn(labelRequiredClass, 'mb-0')}>
                    角色設定 (Prompt) <span className="text-primary normal-case tracking-normal font-black">*</span>
                  </label>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                    <Sparkles className="w-3 h-3 text-primary" />
                    <span className="text-[9px] font-black uppercase tracking-wider text-primary">核心設定</span>
                  </div>
                </div>
                <div className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tabular-nums transition-all duration-300",
                  form.prompt.length > 2000
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "bg-muted text-muted-foreground border border-border"
                )}>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  {form.prompt.length.toLocaleString()} / 20,000
                </div>
              </div>
              <textarea
                id="create-prompt"
                value={form.prompt}
                onChange={(e) => set('prompt', e.target.value)}
                placeholder={`描述角色的個性、背景、說話方式…\n\n例：你是艾拉，一位25歲的輕柔醫生。`}
                rows={12}
                className={cn(inputClass, 'resize-y min-h-[320px] leading-relaxed')}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-6 border-t border-border/40 mt-4">
              {id ? (
                <>
                  <button
                    onClick={() => {
                      if (window.history.length > 1) {
                        navigate(-1)
                      } else {
                        navigate('/')
                      }
                    }}
                    type="button"
                    className="flex-1 py-4 rounded-[24px] font-black text-sm text-foreground/70 bg-muted/80 border border-border hover:bg-muted hover:text-foreground transition-all duration-300 active:scale-[0.95] cursor-pointer"
                  >
                    取消並返回
                  </button>

                  <button
                    id="edit-submit"
                    onClick={() => createCharacter()}
                    disabled={isPending || !form.name.trim() || !form.prompt.trim()}
                    className={cn(
                      'flex-[2] flex items-center justify-center gap-2 py-4 rounded-full font-black text-sm transition-all duration-300',
                      'bg-primary text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] hover:scale-[1.02] active:scale-[0.98] disabled:bg-muted disabled:text-muted-foreground/50 disabled:border disabled:border-border disabled:shadow-none disabled:cursor-not-allowed'
                    )}
                    style={(!isPending && form.name.trim() && form.prompt.trim()) ? { background: 'linear-gradient(135deg, hsl(267, 46%, 35%), hsl(244, 52%, 31%))' } : undefined}
                  >
                    {isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" />儲存中...</>
                    ) : (
                      <><Sparkles className="w-4 h-4" />確認儲存所有變更</>
                    )}
                  </button>
                </>
              ) : (
                <>
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
                    onClick={() => modal.alert('已成功暫存草稿 (模擬)', { title: '草稿儲存' })}
                    type="button"
                    className="flex-1 px-4 py-3 rounded-full text-sm font-semibold text-foreground/70 bg-muted/60 border border-border hover:bg-muted/80 hover:text-foreground transition-all duration-200 active:scale-[0.98]"
                  >
                    暫存草稿
                  </button>

                  <button
                    id="create-submit"
                    onClick={() => createCharacter()}
                    disabled={isPending || !form.name.trim() || !form.prompt.trim()}
                    className={cn(
                      'flex-[2] flex items-center justify-center gap-2 py-3 rounded-full text-sm font-bold text-white transition-all duration-300',
                      'shadow-[0_0_20px_rgba(79,70,229,0.3)] active:scale-[0.98]',
                      'disabled:bg-muted disabled:text-muted-foreground/50 disabled:border disabled:border-border disabled:shadow-none disabled:cursor-not-allowed',
                      !isPending && form.name.trim() && form.prompt.trim() && 'hover:brightness-110 hover:shadow-[0_0_30px_rgba(79,70,229,0.5)]'
                    )}
                    style={(!isPending && form.name.trim() && form.prompt.trim()) ? { background: 'linear-gradient(135deg, hsl(267, 46%, 35%), hsl(244, 52%, 31%))' } : undefined}
                  >
                    {isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" />建立中...</>
                    ) : (
                      <><Sparkles className="w-4 h-4" />創造角色</>
                    )}
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
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
