
import React from 'react';
import { UserRole, UserProfile } from '../types';
import { 
  LayoutDashboard, 
  Files, 
  ShieldAlert, 
  Users, 
  LogOut, 
  Bell, 
  Search,
  ChevronRight,
  Menu,
  Sun,
  Moon,
  Building2,
  Globe,
  Settings
} from 'lucide-react';

interface LayoutProps {
  user: UserProfile;
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

const Layout: React.FC<LayoutProps> = ({ user, children, activeTab, setActiveTab, onLogout, theme, toggleTheme }) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  const getMenuItems = () => {
    if (user.role === UserRole.SUPER_ADMIN) {
      return [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Platform Hub' },
        { id: 'registrations', icon: Building2, label: 'Registrations' },
        { id: 'global_logs', icon: ShieldAlert, label: 'Global Security' },
        { id: 'settings', icon: Settings, label: 'System Config' },
      ];
    }
    
    const common = [
      { id: 'dashboard', icon: LayoutDashboard, label: 'Overview' },
    ];
    
    if (user.role === UserRole.MANAGER) {
      return [
        ...common,
        { id: 'files', icon: Files, label: 'All Files' },
        { id: 'users', icon: Users, label: 'Manage Users' },
        { id: 'audit', icon: ShieldAlert, label: 'Activity Logs' },
      ];
    }
    
    if (user.role === UserRole.AUDITOR) {
      return [
        ...common,
        { id: 'audit', icon: ShieldAlert, label: 'Security Audit' },
        { id: 'files', icon: Files, label: 'File Archive' },
      ];
    }

    return [
      ...common,
      { id: 'files', icon: Files, label: 'My Files' },
      { id: 'shared', icon: Users, label: 'Shared with Me' },
    ];
  };

  const menuItems = getMenuItems();

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 glass border-r border-white/10 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${user.role === UserRole.SUPER_ADMIN ? 'bg-emerald-600' : 'bg-gradient-to-br from-indigo-500 to-purple-600'}`}>
              {user.role === UserRole.SUPER_ADMIN ? <Globe className="text-white" size={24} /> : <ShieldAlert className="text-white" size={24} />}
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">SecureSphere</h1>
          </div>

          <nav className="space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${activeTab === item.id ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-inner' : 'opacity-50 hover:opacity-100 hover:bg-white/5'}`}
              >
                <item.icon size={20} className={activeTab === item.id ? 'text-indigo-400' : 'text-inherit'} />
                <span className="font-medium">{item.label}</span>
                {activeTab === item.id && <ChevronRight size={16} className="ml-auto" />}
              </button>
            ))}
          </nav>
        </div>

        <div className="absolute bottom-0 w-full p-8 space-y-4">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <p className="text-xs opacity-40 mb-1 uppercase tracking-widest font-bold">Current Identity</p>
            <p className="text-sm font-semibold truncate">{user.name}</p>
            <p className={`text-[10px] uppercase tracking-tighter font-bold ${user.role === UserRole.SUPER_ADMIN ? 'text-emerald-500' : 'text-indigo-500'}`}>{user.role}</p>
          </div>
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors font-bold">
            <LogOut size={20} /> <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative">
        <header className="sticky top-0 z-40 px-8 py-4 glass-dark border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4 lg:hidden">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 opacity-70 hover:opacity-100"><Menu size={24} /></button>
          </div>
          <div className="hidden md:flex items-center glass rounded-xl px-4 py-2 w-96 border border-white/5">
            <Search className="opacity-40 mr-2" size={18} />
            <input type="text" placeholder="Global search..." className="bg-transparent border-none outline-none text-sm w-full placeholder:opacity-20" />
          </div>
          <div className="flex items-center gap-4">
            <button onClick={toggleTheme} className="p-2 text-indigo-500 hover:bg-white/5 rounded-full transition-colors">{theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}</button>
            <button className="p-2 relative opacity-60 hover:opacity-100 hover:bg-white/5 rounded-full transition-colors"><Bell size={20} /><span className="absolute top-2 right-2 w-2 h-2 bg-indigo-600 rounded-full"></span></button>
            <div className="h-8 w-[1px] bg-white/10 mx-2"></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium opacity-90">{user.organization}</p>
                <p className="text-[10px] opacity-40 uppercase tracking-widest">{user.role === UserRole.SUPER_ADMIN ? 'System Governance' : 'Org Portal'}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${user.role === UserRole.SUPER_ADMIN ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-indigo-500/20 border-indigo-500/30'}`}>
                <span className={`${user.role === UserRole.SUPER_ADMIN ? 'text-emerald-500' : 'text-indigo-500'} font-bold`}>{user.name.charAt(0)}</span>
              </div>
            </div>
          </div>
        </header>
        <div className="p-8 max-w-7xl mx-auto">{children}</div>
      </main>
      {isSidebarOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}
    </div>
  );
};

export default Layout;
