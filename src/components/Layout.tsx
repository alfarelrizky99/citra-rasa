import { ReactNode, useState, useEffect, useCallback } from 'react';
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    UtensilsCrossed,
    Trash2,
    LogOut,
    Menu,
    X,
    Clock,
    Users,
    Building2,
    Shield,
    Sun,
    Moon,
    Settings,
    ListChecks,
    Home,
    ChevronsLeft,
    ChevronsRight,
    Image as ImageIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, THEME_COLORS } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { APP_VERSION } from '../version';

interface LayoutProps {
    children: ReactNode;
    currentPage: string;
    onNavigate: (page: string) => void;
}

interface MenuItem {
    id: string;
    label: string;
    icon: typeof LayoutDashboard;
    roles?: string[];  // role-based visibility
    configurable?: boolean;  // can be toggled in menu management
}

export const ALL_MENU_ITEMS: MenuItem[] = [
    { id: 'home', label: 'Beranda', icon: Home },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, configurable: true },
    { id: 'materials', label: 'Bahan Baku', icon: Package, configurable: true },
    { id: 'products', label: 'Produk & Resep', icon: UtensilsCrossed, configurable: true },
    { id: 'sales', label: 'Penjualan', icon: ShoppingCart, configurable: true },
    { id: 'admin-orders', label: 'Pesanan Aktif', icon: ListChecks, roles: ['admin', 'superadmin'] },
    { id: 'admin-history', label: 'Riwayat Pesanan', icon: ListChecks, roles: ['admin', 'superadmin'] },
    { id: 'waste', label: 'Waste/Shrinkage', icon: Trash2, configurable: true },
    { id: 'approval', label: 'Approval User', icon: Clock, roles: ['admin', 'superadmin'] },
    { id: 'manage-users', label: 'Kelola User', icon: Users, roles: ['admin', 'superadmin'] },
    { id: 'manage-menus', label: 'Kelola Menu', icon: ListChecks, roles: ['admin', 'superadmin'] },
    { id: 'manage-banners', label: 'Kelola Banner', icon: ImageIcon, roles: ['admin', 'superadmin'] },
    { id: 'store-settings', label: 'Pengaturan', icon: Settings, roles: ['admin', 'superadmin'] },
    { id: 'manage-stores', label: 'Kelola Toko', icon: Building2, roles: ['superadmin'] },
];

export default function Layout({ children, currentPage, onNavigate }: LayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        return localStorage.getItem('sidebar_collapsed') === 'true';
    });
    const [settingsOpen, setSettingsOpen] = useState(false);
    const { signOut, user } = useAuth();
    const { darkMode, toggleDarkMode, themeColor, setThemeColor, theme } = useTheme();
    const [pendingCount, setPendingCount] = useState(0);
    const [hiddenMenus, setHiddenMenus] = useState<Set<string>>(new Set());

    const toggleSidebarCollapse = () => {
        setSidebarCollapsed(prev => {
            const next = !prev;
            localStorage.setItem('sidebar_collapsed', String(next));
            return next;
        });
    };

    const fetchPendingCount = useCallback(async () => {
        if (!user) return;
        let query = supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');

        if (user.role !== 'superadmin') {
            query = query.eq('store_id', user.store_id);
        }

        const { count } = await query;
        setPendingCount(count || 0);
    }, [user]);

    const fetchMenuConfig = useCallback(async () => {
        if (!user) return;
        const { data } = await supabase
            .from('store_menu_config')
            .select('menu_id, is_visible')
            .eq('store_id', user.store_id);

        if (data) {
            const hidden = new Set<string>();
            data.forEach((item) => {
                if (!item.is_visible) hidden.add(item.menu_id);
            });
            setHiddenMenus(hidden);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            if (user.role === 'admin' || user.role === 'superadmin') {
                fetchPendingCount();
            }
            fetchMenuConfig();
        }
    }, [user, fetchPendingCount, fetchMenuConfig]);

    // Expose refresh function for children (like UserApproval)
    useEffect(() => {
        (window as any).__refreshPendingCount = fetchPendingCount;
        (window as any).__refreshMenuConfig = fetchMenuConfig;
        return () => {
            delete (window as any).__refreshPendingCount;
            delete (window as any).__refreshMenuConfig;
        };
    }, [fetchPendingCount, fetchMenuConfig]);

    const visibleMenuItems = ALL_MENU_ITEMS.filter((item) => {
        // Role check
        if (item.roles && (!user || !item.roles.includes(user.role))) return false;
        // Superadmin sees everything
        if (user?.role === 'superadmin') return true;
        // Menu config check (only for configurable items)
        if (item.configurable && hiddenMenus.has(item.id)) return false;
        return true;
    });

    const getRoleBadge = () => {
        const map: Record<string, { label: string; color: string }> = {
            superadmin: { label: 'Super Admin', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
            admin: { label: 'Admin', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
            member: { label: 'Anggota', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
        };
        return map[user?.role || 'member'] || map.member;
    };

    const roleBadge = getRoleBadge();

    return (
        <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
            <div className="flex h-screen overflow-hidden">
                {/* Sidebar */}
                <aside
                    className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                        } fixed inset-y-0 left-0 z-50 w-64 ${sidebarCollapsed ? 'lg:w-[72px]' : 'lg:w-64'
                        } ${darkMode ? 'bg-gradient-to-b ' + theme.sidebar : 'bg-white border-r border-slate-200'
                        } text-white transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col`}
                >
                    {/* Sidebar Header */}
                    <div className={`flex items-center h-16 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'} ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : 'justify-between px-6'} pt-[env(safe-area-inset-top)]`}>
                        <h1 className={`text-xl font-bold truncate pr-2 ${sidebarCollapsed ? 'lg:hidden' : ''} ${darkMode ? `bg-gradient-to-r ${theme.sidebarHover} bg-clip-text text-transparent` : 'text-blue-600'}`}>
                            {user?.store_name || 'HPP Manager'}
                        </h1>
                        {/* Desktop collapse toggle */}
                        <button
                            onClick={toggleSidebarCollapse}
                            className={`hidden lg:flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 ${darkMode
                                ? 'text-slate-400 hover:text-white hover:bg-slate-700/60'
                                : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'
                                }`}
                            title={sidebarCollapsed ? 'Perluas Sidebar' : 'Kecilkan Sidebar'}
                        >
                            {sidebarCollapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
                        </button>
                        {/* Mobile close */}
                        <button onClick={() => setSidebarOpen(false)} className={`lg:hidden ${darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-600'}`}>
                            <X size={24} />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className={`flex-1 overflow-y-auto ${sidebarCollapsed ? 'lg:p-2' : 'p-4'} space-y-1`}>
                        {visibleMenuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = currentPage === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => { onNavigate(item.id); setSidebarOpen(false); }}
                                    className={`group relative w-full flex items-center ${sidebarCollapsed ? 'lg:justify-center lg:px-0 lg:py-3' : 'px-4 py-3'
                                        } gap-3 rounded-lg transition-all duration-200 ${isActive
                                            ? (darkMode ? `bg-gradient-to-r ${theme.gradient} text-white shadow-lg ${theme.badge}` : 'bg-blue-600 text-white shadow-md')
                                            : (darkMode ? 'text-slate-300 hover:bg-slate-700/50 hover:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600')
                                        }`}
                                    title={sidebarCollapsed ? item.label : undefined}
                                >
                                    <Icon size={20} className="flex-shrink-0" />
                                    <span className={`font-medium whitespace-nowrap ${sidebarCollapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                                    {item.id === 'approval' && pendingCount > 0 && (
                                        <span className={`bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse ${sidebarCollapsed ? 'lg:absolute lg:-top-1 lg:-right-1 lg:px-1.5 lg:py-0.5 lg:text-[10px]' : 'ml-auto'}`}>
                                            {pendingCount}
                                        </span>
                                    )}
                                    {/* Tooltip on collapsed hover */}
                                    {sidebarCollapsed && (
                                        <div className="hidden lg:block absolute left-full ml-2 px-3 py-1.5 bg-slate-800 text-white text-sm font-medium rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap z-[60]">
                                            {item.label}
                                            <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45" />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </nav>

                    {/* Bottom section */}
                    <div className={`border-t ${darkMode ? 'border-slate-700/50 bg-slate-900/50' : 'border-slate-100 bg-slate-50/50'} ${sidebarCollapsed ? 'lg:p-2' : 'p-4'}`}>
                        {/* Store info - hidden when collapsed */}
                        <div className={`mb-3 px-4 py-2 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Store</p>
                            <p className={`text-sm font-bold truncate ${darkMode ? 'text-white' : 'text-slate-800'}`} title={user?.store_name || ''}>
                                {user?.store_name || 'HPP Manager'}
                            </p>
                            <p className="text-xs font-medium text-slate-400 mt-1 truncate" title={user?.email || ''}>
                                {user?.email}
                            </p>
                            <span className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 text-xs font-semibold rounded-full border ${roleBadge.color} ${!darkMode && 'bg-opacity-10'}`}>
                                <Shield size={10} />
                                {roleBadge.label}
                            </span>
                        </div>
                        <div className={`flex items-center ${sidebarCollapsed ? 'lg:flex-col lg:gap-2' : 'gap-1'}`}>
                            {/* Settings Button */}
                            <button
                                onClick={() => setSettingsOpen(true)}
                                className={`group relative flex items-center justify-center gap-2 rounded-lg transition-all duration-200 ${sidebarCollapsed ? 'lg:w-full lg:p-2.5' : 'flex-1 px-3 py-2.5'
                                    } ${darkMode ? 'text-slate-400 hover:bg-slate-700/50 hover:text-white' : 'text-slate-500 hover:bg-white hover:shadow-sm hover:text-blue-600'}`}
                                title="Pengaturan Tema"
                            >
                                <Settings size={18} />
                                <span className={`text-xs font-medium ${sidebarCollapsed ? 'lg:hidden' : ''}`}>Tema</span>
                                {sidebarCollapsed && (
                                    <div className="hidden lg:block absolute left-full ml-2 px-3 py-1.5 bg-slate-800 text-white text-sm font-medium rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap z-[60]">
                                        Tema
                                        <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45" />
                                    </div>
                                )}
                            </button>
                            {/* Logout */}
                            <button
                                onClick={signOut}
                                className={`group relative flex items-center justify-center gap-2 rounded-lg transition-all duration-200 ${sidebarCollapsed ? 'lg:w-full lg:p-2.5' : 'flex-1 px-3 py-2.5'
                                    } ${darkMode ? 'text-red-400 hover:bg-slate-700/50 hover:text-red-300' : 'text-red-500 hover:bg-white hover:shadow-sm hover:text-red-600'}`}
                                title="Keluar"
                            >
                                <LogOut size={18} />
                                <span className={`text-xs font-medium ${sidebarCollapsed ? 'lg:hidden' : ''}`}>Keluar</span>
                                {sidebarCollapsed && (
                                    <div className="hidden lg:block absolute left-full ml-2 px-3 py-1.5 bg-slate-800 text-white text-sm font-medium rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap z-[60]">
                                        Keluar
                                        <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45" />
                                    </div>
                                )}
                            </button>
                        </div>

                        {/* Version Info */}
                        <div className={`mt-2 text-center text-[10px] ${sidebarCollapsed ? 'hidden' : 'block'} ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            Versi {APP_VERSION}
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <header className={`h-16 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-b flex items-center justify-between px-6 shadow-sm transition-colors duration-300 pt-[env(safe-area-inset-top)]`}>
                        <div className="flex items-center">
                            <button onClick={() => setSidebarOpen(true)} className={`lg:hidden mr-4 ${darkMode ? 'text-slate-300' : 'text-slate-600'} hover:text-slate-900`}>
                                <Menu size={24} />
                            </button>
                            <h2 className={`text-lg font-semibold ${darkMode ? 'text-slate-100' : 'text-black'}`}>
                                {visibleMenuItems.find((item) => item.id === currentPage)?.label || 'Dashboard'}
                            </h2>
                        </div>
                        
                        {/* Dark Mode Toggle - Sun/Moon in Navbar */}
                        <button
                            onClick={toggleDarkMode}
                            className={`relative w-14 h-7 rounded-full transition-all duration-500 ${darkMode
                                ? 'bg-indigo-900 shadow-inner shadow-indigo-950'
                                : 'bg-slate-200'
                            }`}
                            title={darkMode ? 'Mode Terang' : 'Mode Gelap'}
                        >
                            <div className={`absolute top-0.5 w-6 h-6 rounded-full transition-all duration-500 transform flex items-center justify-center ${darkMode
                                ? 'translate-x-7 bg-indigo-200'
                                : 'translate-x-0.5 bg-amber-300'
                            }`}>
                                {darkMode ? (
                                    <Moon size={14} className="text-indigo-800" />
                                ) : (
                                    <Sun size={14} className="text-amber-700" />
                                )}
                            </div>
                            {/* Stars for dark mode */}
                            {darkMode && (
                                <>
                                    <div className="absolute top-1 left-1.5 w-1 h-1 bg-white rounded-full animate-pulse" />
                                    <div className="absolute top-3 left-3 w-0.5 h-0.5 bg-white/70 rounded-full animate-pulse delay-100" />
                                    <div className="absolute top-1.5 left-4.5 w-0.5 h-0.5 bg-white/50 rounded-full animate-pulse delay-200" />
                                </>
                            )}
                        </button>
                    </header>

                    <main className={`flex-1 overflow-auto p-6 ${darkMode ? 'bg-slate-900' : ''}`}>{children}</main>
                </div>
            </div>

            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Settings Popup */}
            {settingsOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" style={{ marginTop: '0px' }}>
                    <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden`}>
                        <div className={`flex items-center justify-between p-5 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                            <div className="flex items-center gap-2">
                                <Settings size={20} className={darkMode ? 'text-slate-300' : 'text-slate-600'} />
                                <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Pengaturan Tema</h3>
                            </div>
                            <button onClick={() => setSettingsOpen(false)} className={`p-1 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
                                <X size={20} className={darkMode ? 'text-slate-400' : 'text-slate-500'} />
                            </button>
                        </div>
                        <div className="p-5 space-y-5">
                            {/* Dark Mode Toggle */}
                            <div>
                                <label className={`block text-sm font-semibold mb-3 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Mode Tampilan</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => { if (darkMode) toggleDarkMode(); }}
                                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${!darkMode
                                            ? 'border-amber-400 bg-amber-50 text-amber-700'
                                            : `${darkMode ? 'border-slate-600 bg-slate-700 text-slate-400 hover:border-slate-500' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'}`
                                        }`}
                                    >
                                        <Sun size={18} />
                                        Light
                                    </button>
                                    <button
                                        onClick={() => { if (!darkMode) toggleDarkMode(); }}
                                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${darkMode
                                            ? 'border-indigo-400 bg-indigo-500/20 text-indigo-300'
                                            : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
                                        }`}
                                    >
                                        <Moon size={18} />
                                        Dark
                                    </button>
                                </div>
                            </div>

                            {/* Theme Color Picker */}
                            <div>
                                <label className={`block text-sm font-semibold mb-3 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Warna Tema</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {Object.entries(THEME_COLORS).map(([key, val]) => (
                                        <button
                                            key={key}
                                            onClick={() => setThemeColor(key)}
                                            className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-xs font-medium transition-all ${themeColor === key
                                                ? `border-current ring-1 ring-current/20 ${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`
                                                : `${darkMode ? 'border-slate-600 bg-slate-700 hover:border-slate-500' : 'border-slate-200 bg-white hover:border-slate-300'}`
                                            }`}
                                            style={themeColor === key ? { borderColor: val.primary, color: val.primary } : undefined}
                                        >
                                            <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: val.primary }} />
                                            <span className={themeColor === key ? '' : (darkMode ? 'text-slate-300' : 'text-slate-600')}>
                                                {val.name}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Preview */}
                            <div className={`p-3 rounded-xl border ${darkMode ? 'border-slate-700 bg-slate-750' : 'border-slate-200 bg-slate-50'}`}>
                                <p className={`text-xs font-semibold mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Preview</p>
                                <div
                                    className="h-2 rounded-full"
                                    style={{ background: `linear-gradient(to right, ${theme.primary}, ${theme.accent})` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
