import { useState, useEffect } from 'react';
import { ListChecks, Save, Loader2, Store, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { ALL_MENU_ITEMS } from '../components/Layout';
import Card from '../components/Card';

interface StoreOption {
    id: string;
    name: string;
}


export default function ManageMenus() {
    const { user, isSuperAdmin } = useAuth();
    const { darkMode } = useTheme();
    const [stores, setStores] = useState<StoreOption[]>([]);
    const [selectedStoreId, setSelectedStoreId] = useState<string>('');
    const [menuConfigs, setMenuConfigs] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const configurableMenus = ALL_MENU_ITEMS.filter(item => item.configurable);

    useEffect(() => {
        if (user) {
            if (isSuperAdmin()) {
                fetchStores();
            } else {
                setSelectedStoreId(user.store_id);
            }
        }
    }, [user, isSuperAdmin]);

    useEffect(() => {
        if (selectedStoreId) {
            fetchMenuConfigs(selectedStoreId);
        }
    }, [selectedStoreId]);

    const fetchStores = async () => {
        const { data } = await supabase.from('stores').select('id, name').order('name');
        if (data) setStores(data);
    };

    const fetchMenuConfigs = async (storeId: string) => {
        setLoading(true);
        const { data } = await supabase
            .from('store_menu_config')
            .select('menu_id, is_visible')
            .eq('store_id', storeId);

        const configs: Record<string, boolean> = {};
        // Default all to true
        configurableMenus.forEach(menu => configs[menu.id] = true);
        
        if (data) {
            data.forEach(item => {
                configs[item.menu_id] = item.is_visible;
            });
        }
        
        setMenuConfigs(configs);
        setLoading(false);
    };

    const handleToggle = (menuId: string) => {
        setMenuConfigs(prev => ({
            ...prev,
            [menuId]: !prev[menuId]
        }));
    };

    const handleSave = async () => {
        if (!selectedStoreId) return;
        setSaving(true);
        setMessage(null);

        try {
            const updates = Object.entries(menuConfigs).map(([menuId, isVisible]) => ({
                store_id: selectedStoreId,
                menu_id: menuId,
                is_visible: isVisible
            }));

            const { error } = await supabase
                .from('store_menu_config')
                .upsert(updates, { onConflict: 'store_id, menu_id' });

            if (error) throw error;

            setMessage({ type: 'success', text: 'Pengaturan menu berhasil disimpan.' });
            
            // If editing current store, refresh layout
            if (selectedStoreId === user?.store_id && (window as any).__refreshMenuConfig) {
                (window as any).__refreshMenuConfig();
            }
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Gagal menyimpan pengaturan.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading && selectedStoreId) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                        <ListChecks className="text-indigo-600 dark:text-indigo-400" size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-black dark:text-white">Kelola Menu</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Atur visibilitas menu untuk toko
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving || !selectedStoreId}
                    className={`flex items-center gap-2 px-4 py-2 text-white font-bold rounded-lg transition-all disabled:opacity-50 ${
                        darkMode ? 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20' : 'bg-blue-600 hover:bg-blue-700 shadow-md'
                    }`}
                >
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    Simpan Perubahan
                </button>
            </div>

            {message && (
                <div className={`p-4 rounded-lg flex items-center gap-3 ${
                    message.type === 'success' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' 
                        : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                }`}>
                    {message.type === 'success' ? <ListChecks size={20} /> : <AlertCircle size={20} />}
                    <p className="text-sm font-medium">{message.text}</p>
                </div>
            )}

            <Card className="overflow-hidden">
                <div className="p-6 border-b dark:border-slate-700 px-6">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Pilih Toko</label>
                    {isSuperAdmin() ? (
                        <div className="relative">
                            <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <select
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 dark:text-white"
                                value={selectedStoreId}
                                onChange={(e) => setSelectedStoreId(e.target.value)}
                            >
                                <option value="">Pilih Toko...</option>
                                {stores.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg border dark:border-slate-600">
                            <Store className="text-slate-400" size={20} />
                            <span className="font-bold text-black dark:text-white">{user?.store_name}</span>
                        </div>
                    )}
                </div>

                {!selectedStoreId ? (
                    <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                        Pilih toko untuk mulai mengatur visibilitas menu.
                    </div>
                ) : (
                    <div className="divide-y dark:divide-slate-700">
                        {configurableMenus.map(menu => {
                            const Icon = menu.icon;
                            const isVisible = menuConfigs[menu.id] !== false;
                            
                            return (
                                <div key={menu.id} className="flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-lg ${isVisible ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500'}`}>
                                            <Icon size={20} />
                                        </div>
                                        <div>
                                            <p className={`font-bold ${isVisible ? 'text-black dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                                                {menu.label}
                                            </p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                {isVisible ? 'Menu ini tampil di sidebar.' : 'Menu ini disembunyikan.'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleToggle(menu.id)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all border ${
                                            isVisible 
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' 
                                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600'
                                        }`}
                                    >
                                        {isVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                                        {isVisible ? 'Visible' : 'Hidden'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>
        </div>
    );
}
