import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Trash2, Upload, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { compressImage } from '@/lib/image'
import { logger } from '@/lib/logger'
import { useModalStore } from '@/stores/modalStore'

interface BackgroundGalleryDialogProps {
  isOpen: boolean
  onClose: () => void
  conversationId: string
  updateConversationBg: (conversationId: string, url: string) => Promise<void>
}

export function BackgroundGalleryDialog({
  isOpen,
  onClose,
  conversationId,
  updateConversationBg,
}: BackgroundGalleryDialogProps) {
  const { user } = useAuth()
  const modal = useModalStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingBg, setIsUploadingBg] = useState(false)
  const [bgHistory, setBgHistory] = useState<string[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

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
      logger.error('Fetch history error:', err)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchBgHistory()
    }
  }, [isOpen, user])

  if (!isOpen) return null

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!ALLOWED.includes(file.type)) {
      modal.alert('只支援 JPEG、PNG、WebP、GIF 格式', { title: '格式不支援' })
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    const MAX_BG_SIZE = 10 * 1024 * 1024  // 10MB
    if (file.size > MAX_BG_SIZE) {
      modal.alert('圖片大小不可超過 10MB', { title: '檔案過大' })
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    try {
      setIsUploadingBg(true)
      const compressed = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.75 })
      const ext = compressed.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('backgrounds')
        .upload(path, compressed)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
          .from('backgrounds')
          .getPublicUrl(path)

      await updateConversationBg(conversationId, publicUrl)
      fetchBgHistory()
      modal.alert('背景圖上傳成功！', { title: '上傳完成' })
    } catch (err: any) {
      logger.error('Upload error:', err)
      modal.alert('圖片上傳失敗：' + (err.message || '未知錯誤'), { title: '錯誤' })
    } finally {
      setIsUploadingBg(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDeleteBg = async (url: string) => {
    const segments = url.split('/')
    const fileName = segments[segments.length - 1]
    if (!fileName || !user) return

    const { error } = await supabase.storage
      .from('backgrounds')
      .remove([`${user.id}/${fileName}`])

    if (!error) {
      fetchBgHistory()
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#0C0C0C] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between shrink-0">
          <h3 className="text-[17px] font-black text-white tracking-tight">選擇背景圖</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-white/40 hover:text-white transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {/* 清除背景 */}
            <button
              onClick={async () => {
                await updateConversationBg(conversationId, '')
                onClose()
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

            {/* 隱藏的檔案選擇器 */}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileUpload}
            />

            {isLoadingHistory ? (
              <div className="col-span-2 md:col-span-3 py-10 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : (
              bgHistory.map((url, i) => (
                <div key={i} className="relative group aspect-[3/4] rounded-2xl overflow-hidden border border-white/5 hover:border-primary/50 transition-all">
                  <button
                    onClick={async () => {
                      await updateConversationBg(conversationId, url)
                      onClose()
                    }}
                    className="w-full h-full animate-in fade-in duration-200"
                  >
                    <img src={url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                  </button>

                  {/* 刪除按鈕 */}
                  <button
                    onClick={async (e) => {
                      e.stopPropagation()
                      handleDeleteBg(url)
                    }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/40 hover:text-red-500 hover:bg-black/80 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-200"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
