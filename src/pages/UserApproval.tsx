import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Loader2, Store, Shield, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Card from '../components/Card';
import Table from '../components/Table';
import Button from '../components/Button';

interface PendingUser {
    id: string;
    name: string | null;
    email: string;
    role: string;
    status: string;
    store_id: string;
    created_at: string;
    stores?: { name: string } | null;
}

export default function UserApproval() {
    const { user, isSuperAdmin } = useAuth();
    const { darkMode } = useTheme();
    const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) fetchPendingUsers();
    }, [user]);

    const fetchPendingUsers = async () => {
        if (!user) return;
        setLoading(true);
        let query = supabase
            .from('users')
            .select('id, name, email, role, status, store_id, created_at, stores(name)')
            .eq('status', 'pending')
            .order('created_at', { ascending: true });

        if (!isSuperAdmin()) {
            query = query.eq('store_id', user.store_id);
        }

        const { data } = await query;
        if (data) setPendingUsers(data as unknown as PendingUser[]);
        setLoading(false);
    };

    const handleAction = async (userId: string, action: 'approved' | 'rejected') => {
        await supabase.from('users').update({ status: action }).eq('id', userId);
        await fetchPendingUsers();
        // Refresh badge in sidebar
        if ((window as any).__refreshPendingCount) {
            (window as any).__refreshPendingCount();
        }
    };

    const columns = [
        {
            key: 'user',
            label: 'User',
            render: (_: any, u: PendingUser) => (
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                        <User size={18} className="text-slate-500 dark:text-slate-400" />
                    </div>
                    <div>
                        <p className="font-bold text-black dark:text-white leading-tight">{u.name || '-'}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                    </div>
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
            label: 'Role Requested',
            render: (role: string) => {
                const colors: Record<string, string> = {
                    admin: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
                    member: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800',
                };
                return (
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-full border ${colors[role] || ''}`}>
                        <Shield size={10} />
                        {role}
                    </span>
                );
            }
        },
        {
            key: 'created_at',
            label: 'Tanggal Masuk',
            render: (value: string) => (
                <span className="text-sm text-slate-500 dark:text-slate-400">
                    {new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
            )
        },
        {
            key: 'actions',
            label: 'Aksi',
            align: 'right' as const,
            render: (_: any, u: PendingUser) => (
                <div className="flex items-center justify-end gap-2">
                    <Button
                        size="sm"
                        variant="success"
                        onClick={() => handleAction(u.id, 'approved')}
                        className="h-8"
                    >
                        <CheckCircle size={14} className="mr-1" />
                        Setujui
                    </Button>
                    <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleAction(u.id, 'rejected')}
                        className="h-8"
                    >
                        <XCircle size={14} className="mr-1" />
                        Tolak
                    </Button>
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
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                    <Clock className="text-amber-600 dark:text-amber-400" size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-black dark:text-white">Approval User</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {isSuperAdmin() ? 'Semua pengajuan dari seluruh toko' : 'Pengajuan tertunda untuk toko Anda'}
                    </p>
                </div>
            </div>

            {pendingUsers.length === 0 ? (
                <Card className={`p-12 text-center border-dashed border-2 ${darkMode ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="text-emerald-600 dark:text-emerald-400" size={32} />
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 text-lg font-bold">Semua Beres!</p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-xs mx-auto">
                        Tidak ada pengajuan user yang menunggu persetujuan saat ini.
                    </p>
                </Card>
            ) : (
                <Card className="overflow-hidden">
                    <Table columns={columns} data={pendingUsers} emptyMessage="Tidak ada pengajuan pending" />
                </Card>
            )}
        </div>
    );
}
