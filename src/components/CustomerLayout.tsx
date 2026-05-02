import { ReactNode, useState } from 'react';
import { LayoutDashboard, ClipboardList, LogOut, Home, User, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface CustomerLayoutProps {
    children: ReactNode;
    currentPage: string;
    onNavigate: (page: string) => void;
}

const CUSTOMER_MENU = [
    { id: 'customer-dashboard', label: 'Beranda', icon: LayoutDashboard },
    { id: 'customer-orders', label: 'Pesanan Saya', icon: ClipboardList },
];

export default function CustomerLayout({ children, currentPage, onNavigate }: CustomerLayoutProps) {
    const { user, signOut } = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gradient-to-b from-padang-50 to-white">
            {/* Top navbar */}
            <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-padang-100 shadow-sm">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <button onClick={() => onNavigate('home')} className="flex items-center gap-3 group">
                            <img src="/logo-citrarasa.png" alt="Citra Rasa" className="h-10 w-auto object-contain group-hover:scale-105 transition-transform" />
                        </button>

                        {/* Desktop nav */}
                        <div className="hidden sm:flex items-center gap-1">
                            {CUSTOMER_MENU.map((item) => {
                                const Icon = item.icon;
                                const isActive = currentPage === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => onNavigate(item.id)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                                            isActive
                                                ? 'bg-gradient-to-r from-padang-600 to-spice-600 text-white shadow-md shadow-padang-600/20'
                                                : 'text-padang-700 hover:bg-padang-50 hover:text-padang-900'
                                        }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {item.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* User info + logout */}
                        <div className="flex items-center gap-3">
                            <div className="hidden sm:flex items-center gap-2 bg-padang-50 rounded-full px-4 py-1.5">
                                <div className="w-7 h-7 bg-gradient-to-br from-padang-500 to-spice-500 rounded-full flex items-center justify-center">
                                    <User className="w-3.5 h-3.5 text-white" />
                                </div>
                                <span className="text-sm font-medium text-padang-800 max-w-[120px] truncate">
                                    {user?.name || user?.email}
                                </span>
                            </div>
                            <button
                                onClick={signOut}
                                className="hidden sm:flex items-center gap-1.5 text-padang-500 hover:text-spice-600 text-sm font-medium transition-colors px-3 py-2 rounded-xl hover:bg-spice-50"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>

                            {/* Mobile hamburger */}
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="sm:hidden p-2 rounded-xl hover:bg-padang-50 transition-colors"
                            >
                                {mobileMenuOpen ? <X className="w-5 h-5 text-padang-700" /> : <Menu className="w-5 h-5 text-padang-700" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile menu */}
                {mobileMenuOpen && (
                    <div className="sm:hidden border-t border-padang-100 bg-white/95 backdrop-blur-xl animate-fade-in">
                        <div className="px-4 py-3 space-y-1">
                            {/* User info */}
                            <div className="flex items-center gap-3 px-3 py-2.5 mb-2">
                                <div className="w-9 h-9 bg-gradient-to-br from-padang-500 to-spice-500 rounded-full flex items-center justify-center">
                                    <User className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-padang-900">{user?.name || user?.email}</p>
                                    <p className="text-xs text-padang-500">Pelanggan</p>
                                </div>
                            </div>

                            {CUSTOMER_MENU.map((item) => {
                                const Icon = item.icon;
                                const isActive = currentPage === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => { onNavigate(item.id); setMobileMenuOpen(false); }}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                                            isActive
                                                ? 'bg-gradient-to-r from-padang-600 to-spice-600 text-white'
                                                : 'text-padang-700 hover:bg-padang-50'
                                        }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {item.label}
                                    </button>
                                );
                            })}

                            <button
                                onClick={() => { onNavigate('home'); setMobileMenuOpen(false); }}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-padang-700 hover:bg-padang-50 transition-all"
                            >
                                <Home className="w-4 h-4" />
                                Beranda Website
                            </button>

                            <hr className="border-padang-100" />
                            <button
                                onClick={() => { signOut(); setMobileMenuOpen(false); }}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-spice-600 hover:bg-spice-50 transition-all"
                            >
                                <LogOut className="w-4 h-4" />
                                Keluar
                            </button>
                        </div>
                    </div>
                )}
            </nav>

            {/* Main content */}
            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {children}
            </main>
        </div>
    );
}
