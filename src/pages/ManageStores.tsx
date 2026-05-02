import { useState, useEffect } from 'react';
import { Building2, Pencil, Trash2, Loader2, Plus, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';

interface StoreRow {
    id: string;
    name: string;
    created_at: string;
    user_count?: number;
}

export default function ManageStores() {
    const { darkMode } = useTheme();
    const [stores, setStores] = useState<StoreRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<StoreRow | null>(null);
    const [storeName, setStoreName] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchStores();
    }, []);

    const fetchStores = async () => {
        setLoading(true);
        const { data: storeData } = await supabase.from('stores').select('*').order('name');

        if (storeData) {
            const storesWithCount: StoreRow[] = [];
            for (const store of storeData) {
                const { count } = await supabase
                    .from('users')
                    .select('*', { count: 'exact', head: true })
                    .eq('store_id', store.id);
                storesWithCount.push({ ...store, user_count: count || 0 });
            }
            setStores(storesWithCount);
        }
        setLoading(false);
    };

    const handleAddNew = () => {
        setEditing(null);
        setStoreName('');
        setShowModal(true);
    };

    const handleEdit = (store: StoreRow) => {
        setEditing(store);
        setStoreName(store.name);
        setShowModal(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!storeName.trim()) return;
        setSaving(true);

        try {
            if (editing) {
                await supabase.from('stores').update({ name: storeName }).eq('id', editing.id);
            } else {
                await supabase.from('stores').insert([{ name: storeName }]);
            }

            setShowModal(false);
            await fetchStores();
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, userCount: number) => {
        if (userCount > 0) {
            return alert(`Tidak bisa menghapus toko ini karena masih memiliki ${userCount} user.`);
        }
        if (!confirm('Yakin ingin menghapus toko ini?')) return;
        await supabase.from('stores').delete().eq('id', id);
        await fetchStores();
    };

    if (loading) {
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
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <Building2 className="text-purple-600 dark:text-purple-400" size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-black dark:text-white">Kelola Toko</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Daftar semua toko dalam sistem</p>
                    </div>
                </div>
                <Button onClick={handleAddNew}>
                    <Plus size={18} className="mr-2" />
                    Tambah Toko
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stores.map((store) => (
                    <Card key={store.id} className="p-5 border-slate-200 hover:border-purple-500/50 transition-all group">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg ${
                                    darkMode ? 'bg-gradient-to-br from-purple-500 to-indigo-600 shadow-purple-500/20' : 'bg-purple-600'
                                }`}>
                                    {store.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                     <h3 className="font-bold text-black dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                        {store.name}
                                    </h3>
                                    <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                                        <Users size={14} />
                                        <span>{store.user_count} User</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => handleEdit(store)}
                                    className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                                    title="Edit"
                                >
                                    <Pencil size={16} />
                                </button>
                                <button
                                    onClick={() => handleDelete(store.id, store.user_count || 0)}
                                    className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                    title="Hapus"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t dark:border-slate-700 flex justify-between items-center">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Terdaftar</span>
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                {new Date(store.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                        </div>
                    </Card>
                ))}
            </div>

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editing ? 'Edit Toko' : 'Tambah Toko Baru'}
            >
                <form onSubmit={handleSave} className="space-y-4">
                    <Input
                        label="Nama Toko"
                        value={storeName}
                        onChange={(e) => setStoreName(e.target.value)}
                        placeholder="Contoh: Toko Sinar Jaya"
                        required
                        autoFocus
                    />
                    
                    <div className="flex gap-2 justify-end pt-6">
                        <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                            Batal
                        </Button>
                        <Button type="submit" loading={saving}>
                            {editing ? 'Simpan Perubahan' : 'Tambah Toko'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
