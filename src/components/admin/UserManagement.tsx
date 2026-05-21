import { Users, CheckCircle, XCircle } from 'lucide-react'
import type { Profile } from '@/types'
import { cn } from '@/lib/utils'

interface UserManagementProps {
  profiles: Profile[]
  userFilter: 'all' | 'active' | 'inactive'
  setUserFilter: (filter: 'all' | 'active' | 'inactive') => void
  toggleUserActive: (id: string, currentStatus: boolean) => Promise<void>
}

export function UserManagement({
  profiles,
  userFilter,
  setUserFilter,
  toggleUserActive
}: UserManagementProps) {
  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-[24px] bg-muted/50 border border-border">
        <div>
          <h2 className="text-lg font-black flex items-center gap-2">
            使用者審核
            {profiles.filter(p => !p.is_active).length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold shadow-lg shadow-red-500/20">
                {profiles.filter(p => !p.is_active).length} 待審核
              </span>
            )}
          </h2>
          <p className="text-[11px] text-muted-foreground/50 mt-0.5 font-medium">管理平台使用者帳號審核與狀態控制</p>
        </div>

        <div className="flex bg-muted p-1 rounded-xl border border-border self-start sm:self-auto overflow-x-auto print:hidden">
          {[
            { id: 'all', label: '全部', icon: Users },
            { id: 'active', label: '已啟用', icon: CheckCircle },
            { id: 'inactive', label: '未啟用', icon: XCircle }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setUserFilter(f.id as any)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                userFilter === f.id 
                  ? "bg-card text-foreground shadow-sm border border-border" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <f.icon className="w-3.5 h-3.5" />
              {f.label}
              <span className="opacity-40 ml-0.5">
                ({profiles.filter(p => {
                  if (f.id === 'active') return p.is_active
                  if (f.id === 'inactive') return !p.is_active
                  return true
                }).length})
              </span>
            </button>
          ))}
        </div>
      </div>
      
      <div className="md:glass-md md:rounded-3xl overflow-hidden md:shadow-2xl">
        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="p-5 text-[11px] font-black text-muted-foreground uppercase tracking-widest">User</th>
                <th className="p-5 text-[11px] font-black text-muted-foreground uppercase tracking-widest">Joined</th>
                <th className="p-5 text-center text-[11px] font-black text-muted-foreground uppercase tracking-widest">Status</th>
                <th className="p-5 text-right text-[11px] font-black text-muted-foreground uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {profiles
                .filter(p => {
                  if (userFilter === 'active') return p.is_active
                  if (userFilter === 'inactive') return !p.is_active
                  return true
                })
                .map(profile => (
                <tr key={profile.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-5">
                    <div className="flex items-center gap-4">
                      <img 
                        src={profile.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + profile.username} 
                        alt={profile.username}
                        className="w-11 h-11 rounded-full bg-white/5 object-cover ring-1 ring-white/10"
                      />
                      <div>
                        <p className="font-bold text-[15px] text-foreground">{profile.username}</p>
                        <p className="text-[10px] text-muted-foreground/50 mt-0.5 tracking-widest font-mono uppercase">
                          ID: {profile.id.split('-')[0]}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {new Date(profile.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-center">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                      profile.is_active 
                        ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                        : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                    }`}>
                      {profile.is_active ? '已啟用' : '待審核'}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => toggleUserActive(profile.id, profile.is_active)}
                      className={cn(
                        "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all outline-none",
                        profile.is_active
                          ? "bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20"
                          : "bg-green-500 text-white hover:bg-green-600 shadow-md hover:shadow-lg hover:shadow-green-500/20"
                      )}
                    >
                      {profile.is_active ? (
                        <><XCircle className="w-4 h-4" /> 停用帳號</>
                      ) : (
                        <><CheckCircle className="w-4 h-4" /> 核准啟用</>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="flex flex-col gap-4 md:hidden">
          {profiles
            .filter(p => {
              if (userFilter === 'active') return p.is_active
              if (userFilter === 'inactive') return !p.is_active
              return true
            })
            .map(profile => (
              <div key={profile.id} className="bg-card p-5 rounded-[28px] border border-border space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img 
                      src={profile.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + profile.username} 
                      alt={profile.username}
                      className="w-12 h-12 rounded-full bg-muted object-cover ring-1 ring-border"
                    />
                    <div>
                      <p className="font-bold text-[16px] text-foreground leading-tight">{profile.username}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono mt-1">
                        ID: {profile.id.split('-')[0]}
                      </p>
                    </div>
                  </div>
                  <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                    profile.is_active 
                      ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                      : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                  }`}>
                    {profile.is_active ? '已啟用' : '待審核'}
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span className="text-[11px] text-muted-foreground font-medium">加入: {new Date(profile.created_at).toLocaleDateString()}</span>
                  <button
                    onClick={() => toggleUserActive(profile.id, profile.is_active)}
                    className={cn(
                      "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                      profile.is_active
                        ? "bg-red-500/10 text-red-500 border border-red-500/20"
                        : "bg-green-500 text-white shadow-md shadow-green-500/20"
                    )}
                  >
                    {profile.is_active ? (
                      <><XCircle className="w-4 h-4" /> 停用</>
                    ) : (
                      <><CheckCircle className="w-4 h-4" /> 啟用</>
                    )}
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
