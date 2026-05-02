import { useState, useEffect } from 'react';
import { Users, Pencil, Trash2, Loader2, Shield, Store, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Select from '../components/Select';
import Table from '../components/Table';

interface UserRow {
    id: string;
    name: string | null;
    email: string;
    role: string;
    status: string;
    store_id: string;
    created_at: string;
    stores?: { name: string } | null;
}

interface StoreOption {
    id: string;
    name: string;
}

export default function ManageUsers() {
    const { user, isSuperAdmin } = useAuth();
    const [users, setUsers] = useState<UserRow[]>([]);
    const [stores, setStores] = useState<StoreOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<UserRow | null>(null);
    const [form, setForm] = useState({ name: '', email: '', role: 'member', status: 'approved', store_id: '' });
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        if (user) {
            fetchUsers();
            if (isSuperAdmin()) fetchStores();
        }
    }, [user]);

    const fetchUsers = async () => {
        if (!user) return;
        setLoading(true);
        let query = supabase
            .from('users')
            .select('id, name, email, role, status, store_id, created_at, stores(name)')
            .order('created_at', { ascending: false });

        if (!isSuperAdmin()) {
            query = query.eq('store_id', user.store_id);
        }

        const { data } = await query;
        if (data) setUsers(data as unknown as UserRow[]);
        setLoading(false);
    };

    const fetchStores = async () => {
        const { data } = await supabase.from('stores').select('id, name').order('name');
        if (data) setStores(data);
    };

    const handleEdit = (u: UserRow) => {
        setEditing(u);
        setForm({
            name: u.name || '',
            email: u.email,
            role: u.role,
            status: u.status,
            store_id: u.store_id,
        });
        setNewPassword('');
        setShowPassword(false);
        setSaveMessage(null);
        setShowModal(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editing) return;
        setSaving(true);
        setSaveMessage(null);

        try {
            // Update user data
            const { error: updateError } = await supabase
                .from('users')
                .update({
                    name: form.name,
                    role: form.role,
                    status: form.status,
                    ...(isSuperAdmin() ? { store_id: form.store_id } : {}),
                })
                .eq('id', editing.id);

            if (updateError) {
                setSaveMessage({ type: 'error', text: 'Gagal menyimpan data user.' });
                setSaving(false);
                return;
            }

            // Update password if provided
            if (newPassword.trim()) {
                if (newPassword.length < 6) {
                    setSaveMessage({ type: 'error', text: 'Password minimal 6 karakter.' });
                    setSaving(false);
                    return;
                }

                const { error: pwError } = await supabase.rpc('change_user_password', {
                    target_user_id: editing.id,
                    new_password: newPassword,
                });

                if (pwError) {
                    setSaveMessage({ type: 'error', text: 'Data tersimpan, tapi gagal mengubah password.' });
                    setSaving(false);
                    return;
                }
            }

            setShowModal(false);
            setEditing(null);
            await fetchUsers();
        } catch {
            setSaveMessage({ type: 'error', text: 'Terjadi kesalahan.' });
        }

        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (id === user?.id) return alert('Tidak bisa menghapus akun sendiri');
        if (!confirm('Yakin ingin menghapus user ini?')) return;
        await supabase.from('users').delete().eq('id', id);
        await fetchUsers();
    };

    const columns = [
        {
            key: 'name',
            label: 'User',
            render: (_: any, u: UserRow) => (
                <div>
                    <p className="font-bold text-black dark:text-white leading-tight">{u.name || '-'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                </div>
            )
        },
        ...(isSuperAdmin() ? [{
            key: 'stores',
            label: 'Toko',
            render: (value: any) => (
                <div className="flex items-center gap-1.5 text-sm">
                    <Store size={14} className="text-slate-400" />
                    <span>{value?.name || '-'}</span>
                </div>
            )
        }] : []),
        {
            key: 'role',
            label: 'Role',
            render: (value: string) => {
                const map: Record<string, string> = {
                    superadmin: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
                    admin: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
                    member: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800',
                };
                return (
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-full border ${map[value] || ''}`}>
                        <Shield size={10} />
                        {value}
                    </span>
                );
            }
        },
        {
            key: 'status',
            label: 'Status',
            render: (value: string) => {
                const map: Record<string, string> = {
                    approved: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
                    pending: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
                    rejected: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
                };
                return (
                    <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${map[value] || ''}`}>
                        {value}
                    </span>
                );
            }
        },
        {
            key: 'actions',
            label: 'Aksi',
            align: 'right' as const,
            render: (_: any, u: UserRow) => (
                <div className="flex items-center justify-end gap-1">
                    <button
                        onClick={() => handleEdit(u)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                    >
                        <Pencil size={16} />
                    </button>
                    {u.id !== user?.id && (
                        <button
                            onClick={() => handleDelete(u.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            )
        }
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Users className="text-blue-600 dark:text-blue-400" size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-black dark:text-white">Kelola User</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {isSuperAdmin() ? 'Semua user dari seluruh toko' : `Daftar user di ${user?.store_name}`}
                    </p>
                </div>
            </div>

            <Card className="overflow-hidden">
                <Table columns={columns} data={users} emptyMessage="Tidak ada user ditemukan" />
            </Card>

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="Edit User"
            >
                <form onSubmit={handleSave} className="space-y-4">
                    {saveMessage && (
                        <div className={`p-3 rounded-lg text-sm font-medium border ${saveMessage.type === 'success'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
                            : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                            }`}>
                            {saveMessage.text}
                        </div>
                    )}
                    
                    <Input
                        label="Nama"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                    />

                    <Input
                        label="Email"
                        value={form.email}
                        disabled
                        className="bg-slate-50 dark:bg-slate-700/50 opacity-70"
                    />

                    <Select
                        label="Role"
                        value={form.role}
                        onChange={(e) => setForm({ ...form, role: e.target.value })}
                        options={[
                            { value: 'member', label: 'Member' },
                            { value: 'admin', label: 'Admin' },
                            ...(isSuperAdmin() ? [{ value: 'superadmin', label: 'Superadmin' }] : []),
                        ]}
                    />

                    <Select
                        label="Status"
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                        options={[
                            { value: 'approved', label: 'Approved' },
                            { value: 'pending', label: 'Pending' },
                            { value: 'rejected', label: 'Rejected' },
                        ]}
                    />

                    {isSuperAdmin() && (
                        <Select
                            label="Toko"
                            value={form.store_id}
                            onChange={(e) => setForm({ ...form, store_id: e.target.value })}
                            options={stores.map(s => ({ value: s.id, label: s.name }))}
                        />
                    )}

                    <div className="pt-4 border-t dark:border-slate-700">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                            Ganti Password
                        </label>
                        <p className="text-xs text-slate-400 mb-3">Kosongkan jika tidak ingin mengubah password</p>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2.5 pr-10 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="Password baru (min. 6 karakter)"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 transition-colors"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-6">
                        <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                            Batal
                        </Button>
                        <Button type="submit" loading={saving}>
                            Simpan Perubahan
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
