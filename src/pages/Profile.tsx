import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useUIStore } from '@/stores/uiStore'
import { 
  Moon, Sun, LogOut, User, Edit2, Check, X, 
  Loader2, ImagePlus, Sparkles, MessageSquare, 
  ShieldCheck, Shield, Settings, Globe
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'

export default function ProfilePage() {
  const { profile, signOut, refreshProfile } = useAuth()
  const { darkMode, toggleDarkMode } = useUIStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Edit states
  const [isEditing, setIsEditing] = useState(false)
  const [editingName, setEditingName] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['user-stats', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return { characters: 0, chats: 0 }
      const [chars, chats] = await Promise.all([
        supabase.from('characters').select('id', { count: 'exact', head: true }).eq('author_id', profile.id),
        supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('user_id', profile.id)
      ])
      return { 
        characters: chars.count || 0, 
        chats: chats.count || 0 
      }
    },
    enabled: !!profile?.id
  })

  // Initialize editing state
  useEffect(() => {
    if (profile) {
      setEditingName(profile.username || '')
      setAvatarPreview(profile.avatar_url || null)
    }
  }, [profile, isEditing])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    if (!profile) return
    setIsSaving(true)
    try {
      let finalAvatarUrl = profile.avatar_url
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop()
        const path = `profiles/${profile.id}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('avatars').upload(path, avatarFile, { upsert: true })
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
        finalAvatarUrl = urlData.publicUrl
      }
      const { error: updateError } = await supabase.from('profiles').update({
        username: editingName.trim(),
        avatar_url: finalAvatarUrl,
        updated_at: new Date().toISOString()
      }).eq('id', profile.id)
      if (updateError) throw updateError
      if (avatarFile && profile.avatar_url) {
        const oldPath = profile.avatar_url.split('/avatars/').pop()
        if (oldPath) await supabase.storage.from('avatars').remove([oldPath])
      }
      await refreshProfile()
      setIsEditing(false)
      setAvatarFile(null)
    } catch (err: any) {
      console.error(err); alert('更新失敗')
    } finally { setIsSaving(false) }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8 pb-20 overflow-x-hidden relative">
      {/* Decorative Background Blur */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[400px] bg-primary/5 blur-[120px] rounded-full -z-10" />

      {/* Hero Profile Section */}
      <section className="relative glass rounded-[40px] p-8 md:p-12 border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] overflow-hidden">
        <div className="absolute top-0 right-0 p-8">
           {profile?.is_admin ? (
             <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-[10px] font-black uppercase tracking-widest">
               <ShieldCheck className="w-3 h-3" /> System Admin
             </div>
           ) : (
             <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-muted-foreground text-[10px] font-black uppercase tracking-widest">
               <Shield className="w-3 h-3" /> Member
             </div>
           )}
        </div>

        <div className="flex flex-col items-center text-center">
          {/* Avatar with Pro Max Style */}
          <div className="relative group/avatar mb-6">
            <div 
              onClick={() => isEditing && fileInputRef.current?.click()}
              className={cn(
                "w-32 h-32 md:w-36 md:h-36 rounded-[48px] overflow-hidden flex items-center justify-center text-4xl font-bold text-white transition-all duration-500",
                "shadow-[0_0_0_4px_rgba(255,255,255,0.05),0_20px_50px_rgba(0,0,0,0.3)]",
                isEditing ? "cursor-pointer scale-105 border-2 border-primary/50" : "group-hover/avatar:scale-[1.02]"
              )}
              style={{ background: 'linear-gradient(135deg, hsl(267, 100%, 72%), hsl(240, 100%, 65%))' }}
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="user" className="w-full h-full object-cover" />
              ) : (
                profile?.username?.charAt(0)?.toUpperCase() ?? <User className="w-12 h-12" />
              )}
              
              {isEditing && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center animate-in fade-in duration-300">
                  <ImagePlus className="w-8 h-8 text-white mb-2" />
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider">更換相片</span>
                </div>
              )}
            </div>
            
            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="absolute -bottom-2 -right-2 w-11 h-11 rounded-3xl bg-background border border-white/10 flex items-center justify-center shadow-2xl hover:bg-primary hover:text-white transition-all duration-300 hover:rotate-12"
              >
                <Edit2 className="w-4.5 h-4.5" />
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          </div>

          {/* Name & ID Section */}
          <div className="w-full max-w-sm space-y-4">
            {isEditing ? (
              <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-400">
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-[20px] px-6 py-4 text-center text-xl font-black text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                  placeholder="顯示名稱"
                  autoFocus
                />
                <div className="flex gap-3">
                  <button onClick={() => setIsEditing(false)} className="flex-1 px-6 py-3.5 rounded-[20px] bg-white/5 text-sm font-bold text-muted-foreground hover:bg-white/10 transition-all">
                    取消
                  </button>
                  <button 
                    onClick={handleSave} 
                    disabled={isSaving || !editingName.trim()}
                    className="flex-[2] px-6 py-3.5 rounded-[20px] bg-primary text-sm font-black text-white shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> 儲存變更</>}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tighter decoration-primary decoration-4">
                  {profile?.username || '未設定名稱'}
                </h1>
                <p className="text-xs font-mono text-muted-foreground/40 uppercase tracking-[0.2em]">
                  UID: {profile?.id?.slice(0, 8).toUpperCase() || '---'}...
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mt-10 max-w-md mx-auto">
          <div className="glass-light rounded-[24px] p-4 text-center border border-white/5">
            <div className="flex justify-center mb-1"><Sparkles className="w-4 h-4 text-primary opacity-60" /></div>
            <p className="text-2xl font-black text-foreground leading-none">{stats?.characters || 0}</p>
            <p className="text-[10px] text-muted-foreground/60 uppercase font-black tracking-widest mt-1.5">角色創作</p>
          </div>
          <div className="glass-light rounded-[24px] p-4 text-center border border-white/5">
            <div className="flex justify-center mb-1"><MessageSquare className="w-4 h-4 text-primary opacity-60" /></div>
            <p className="text-2xl font-black text-foreground leading-none">{stats?.chats || 0}</p>
            <p className="text-[10px] text-muted-foreground/60 uppercase font-black tracking-widest mt-1.5">對話累積</p>
          </div>
        </div>
      </section>

      {/* Settings Sections Grouped */}
      <section className="space-y-4">
        <div className="glass rounded-[32px] overflow-hidden border border-white/5">
          <div className="px-8 py-5 border-b border-white/5 bg-white/5 flex items-center gap-3">
            <Settings className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em]">系統與偏好</h3>
          </div>
          <div className="p-4 space-y-1">
            {/* Dark Mode */}
            <div className="flex items-center justify-between px-4 py-4 rounded-[20px] hover:bg-white/5 transition-all group cursor-pointer" onClick={toggleDarkMode}>
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-[18px] flex items-center justify-center transition-all duration-500",
                  darkMode ? "bg-primary/10 rotate-12" : "bg-orange-500/10 -rotate-12"
                )}>
                  {darkMode ? <Moon className="w-6 h-6 text-primary" /> : <Sun className="w-6 h-6 text-orange-500" />}
                </div>
                <div>
                  <p className="text-sm font-black text-foreground">深色模式介面</p>
                  <p className="text-[10px] text-muted-foreground/50 font-medium">切換為更適合夜間使用的風格</p>
                </div>
              </div>
              <div className={cn(
                "relative w-14 h-7.5 rounded-full transition-all duration-300",
                darkMode ? "bg-primary shadow-[0_0_20px_rgba(168,85,247,0.4)]" : "bg-muted-foreground/20"
              )}>
                <span className={cn(
                  "absolute top-1.5 left-1.5 w-4.5 h-4.5 rounded-full bg-white shadow-xl transition-all duration-500",
                  darkMode ? "translate-x-6.5 scale-110" : "translate-x-0"
                )} />
              </div>
            </div>

            {/* Language (Mock) */}
            <div className="flex items-center justify-between px-4 py-4 rounded-[20px] hover:bg-white/5 transition-all group opacity-50 grayscale pointer-events-none">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-[18px] bg-white/5 flex items-center justify-center">
                  <Globe className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-black text-foreground">語系設定</p>
                  <p className="text-[10px] text-muted-foreground/50 font-medium">繁體中文 (全球版)</p>
                </div>
              </div>
              <span className="text-[10px] font-black uppercase text-muted-foreground/30 px-3 py-1 bg-white/5 rounded-full">Coming Soon</span>
            </div>
          </div>
        </div>

        {/* Support & Logout */}
        <div className="space-y-4">
          <button
            onClick={signOut}
            className="w-full flex items-center justify-between px-8 py-6 text-red-400 bg-red-400/5 hover:bg-red-400/10 border border-red-400/10 transition-all rounded-[32px] group active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-[18px] bg-red-400/10 flex items-center justify-center group-hover:scale-110 transition-all">
                <LogOut className="w-6 h-6" />
              </div>
              <div className="text-left">
                <p className="text-sm font-black uppercase tracking-wider">退出系統</p>
                <p className="text-[10px] text-red-400/50 font-medium">登出當前帳號並清除快取</p>
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* Version Tag */}
      <div className="text-center">
        <p className="text-[10px] font-black text-muted-foreground/20 uppercase tracking-[0.4em]">Somniloq OS v2.0.4 Premium</p>
      </div>
    </div>
  )
}
