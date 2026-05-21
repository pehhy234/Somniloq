import { Shield, Loader2, Users, Database, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAdminState } from '@/hooks/useAdminState'
import { UserManagement } from '@/components/admin/UserManagement'
import { ModelManagement } from '@/components/admin/ModelManagement'
import { SystemSettings } from '@/components/admin/SystemSettings'
import { EditModelModal } from '@/components/admin/EditModelModal'

export default function AdminPage() {
  const {
    isAdmin,
    activeTab,
    setActiveTab,
    profiles,
    userFilter,
    setUserFilter,
    models,
    modelSearch,
    setModelSearch,
    providerFilter,
    setProviderFilter,
    categoryFilter,
    setCategoryFilter,
    showProviderFilterDropdown,
    setShowProviderFilterDropdown,
    showCategoryFilterDropdown,
    setShowCategoryFilterDropdown,
    isEditingModel,
    setIsEditingModel,
    editForm,
    setEditForm,
    showCategoryDropdown,
    setShowCategoryDropdown,
    showProviderDropdown,
    setShowProviderDropdown,
    suggestionModelId,
    pendingModelId,
    setPendingModelId,
    defaultChatModelId,
    pendingDefaultChatModelId,
    setPendingDefaultChatModelId,
    isLoading,
    error,
    toggleUserActive,
    toggleModelActive,
    deleteModel,
    saveModel,
    handleSaveSettings,
    handleSaveDefaultChatModel
  } = useAdminState()

  if (!isAdmin) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-dvh relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-red-500/5 blur-[120px] pointer-events-none" />
        <div className="relative z-10 text-center space-y-4">
          <div className="w-20 h-20 rounded-[28px] bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto shadow-lg">
            <Shield className="w-10 h-10 text-red-500/70" />
          </div>
          <h2 className="text-2xl font-black tracking-tight">權限不足</h2>
          <p className="text-muted-foreground text-sm max-w-xs">您不是管理員，無法存取此頁面。</p>
          <a href="/" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-muted border border-border text-sm font-bold hover:bg-muted/80 transition-all">
            返回大廳
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto py-10 px-6 h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-6 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 shadow-inner">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">System Admin</h1>
            <p className="text-[11px] text-muted-foreground/50 font-medium uppercase tracking-widest mt-0.5">Administration Panel</p>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 shadow-inner">
          <button
            onClick={() => setActiveTab('users')}
            className={cn(
              "flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all",
              activeTab === 'users' ? "bg-white/10 text-white shadow-lg border border-white/10" : "text-white/40 hover:text-white/80"
            )}
          >
            <Users className="w-4 h-4" />
            Users
          </button>
          <button
            onClick={() => setActiveTab('models')}
            className={cn(
              "flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all",
              activeTab === 'models' ? "bg-white/10 text-white shadow-lg border border-white/10" : "text-white/40 hover:text-white/80"
            )}
          >
            <Database className="w-4 h-4" />
            Models
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={cn(
              "flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all",
              activeTab === 'settings' ? "bg-white/10 text-white shadow-lg border border-white/10" : "text-white/40 hover:text-white/80"
            )}
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
            {error}
          </div>
        )}

        {isLoading && !isEditingModel ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : activeTab === 'users' ? (
          <UserManagement
            profiles={profiles}
            userFilter={userFilter}
            setUserFilter={setUserFilter}
            toggleUserActive={toggleUserActive}
          />
        ) : activeTab === 'models' ? (
          <ModelManagement
            models={models}
            modelSearch={modelSearch}
            setModelSearch={setModelSearch}
            providerFilter={providerFilter}
            setProviderFilter={setProviderFilter}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            showProviderFilterDropdown={showProviderFilterDropdown}
            setShowProviderFilterDropdown={setShowProviderFilterDropdown}
            showCategoryFilterDropdown={showCategoryFilterDropdown}
            setShowCategoryFilterDropdown={setShowCategoryFilterDropdown}
            toggleModelActive={toggleModelActive}
            deleteModel={deleteModel}
            setIsEditingModel={setIsEditingModel}
            setEditForm={setEditForm}
          />
        ) : (
          <SystemSettings
            models={models}
            pendingDefaultChatModelId={pendingDefaultChatModelId}
            setPendingDefaultChatModelId={setPendingDefaultChatModelId}
            defaultChatModelId={defaultChatModelId}
            pendingModelId={pendingModelId}
            setPendingModelId={setPendingModelId}
            suggestionModelId={suggestionModelId}
            handleSaveDefaultChatModel={handleSaveDefaultChatModel}
            handleSaveSettings={handleSaveSettings}
          />
        )}
      </div>

      {/* Edit Model Modal */}
      <EditModelModal
        models={models}
        isEditingModel={isEditingModel}
        setIsEditingModel={setIsEditingModel}
        editForm={editForm}
        setEditForm={setEditForm}
        showCategoryDropdown={showCategoryDropdown}
        setShowCategoryDropdown={setShowCategoryDropdown}
        showProviderDropdown={showProviderDropdown}
        setShowProviderDropdown={setShowProviderDropdown}
        saveModel={saveModel}
      />
    </div>
  )
}
