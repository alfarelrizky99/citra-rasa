import { useState, useEffect } from 'react';
import { Lock, Mail, Loader2, User, Store, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface RegisterProps {
    onBackToLogin: () => void;
    onGoToHome?: () => void;
}

export default function Register({ onBackToLogin, onGoToHome }: RegisterProps) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState<'admin' | 'member'>('member');
    const [storeType, setStoreType] = useState<'new' | 'existing'>('new');
    const [storeName, setStoreName] = useState('');
    const [storeId, setStoreId] = useState('');
    const [stores, setStores] = useState<Array<{ id: string; name: string }>>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        fetchStores();
    }, []);

    const fetchStores = async () => {
        const { data } = await supabase.from('stores').select('id, name').order('name');
        if (data) setStores(data);
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        if (password !== confirmPassword) {
            setError('Password tidak sama');
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            setError('Password minimal 6 karakter');
            setLoading(false);
            return;
        }

        if (storeType === 'new' && !storeName.trim()) {
            setError('Nama toko harus diisi');
            setLoading(false);
            return;
        }

        if (storeType === 'existing' && !storeId) {
            setError('Pilih toko terlebih dahulu');
            setLoading(false);
            return;
        }

        try {
            const { data, error: rpcError } = await supabase.rpc('register_user', {
                input_name: name,
                input_email: email,
                input_password: password,
                input_role: storeType === 'new' ? 'admin' : role,
                input_store_id: storeType === 'existing' ? storeId : undefined,
                input_store_name: storeType === 'new' ? storeName : undefined,
            });

            if (rpcError) {
                setError(rpcError.message);
            } else if (data && data.length > 0) {
                const result = data[0];
                if (result.success) {
                    setSuccess(result.message);
                } else {
                    setError(result.message);
                }
            }
        } catch (err) {
            setError('Terjadi kesalahan saat memproses registrasi.');
            console.error(err);
        }

        setLoading(false);
    };

    return (
        <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[url('https://images.pexels.com/photos/6287527/pexels-photo-6287527.jpeg?auto=compress&cs=tinysrgb&w=1920')] bg-cover bg-center relative">
            <div className="absolute inset-0 bg-padang-950/75 backdrop-blur-[2px]"></div>
            <div className="absolute inset-0 pattern-overlay opacity-10"></div>

            {onGoToHome && (
                <button
                    onClick={onGoToHome}
                    className="absolute top-6 left-6 z-20 flex items-center gap-2 text-white/70 hover:text-gold-400 transition-colors text-sm font-medium"
                >
                    <ArrowLeft size={18} />
                    Kembali ke Beranda
                </button>
            )}

            <div className="sm:mx-auto sm:w-full sm:max-w-lg relative z-10">
                <div className="flex justify-center">
                    <img src="/logo-citrarasa.png" alt="Citra Rasa" className="h-16 w-auto object-contain drop-shadow-2xl" />
                </div>
                <h2 className="mt-4 text-center text-3xl font-display font-bold text-white tracking-tight">
                    Daftar Akun <span className="text-gold-400">Baru</span>
                </h2>
                <p className="mt-2 text-center text-sm text-white/50">
                    Bergabung ke HPP Kasir System — Citra Rasa
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg relative z-10">
                <div className="bg-padang-950/50 backdrop-blur-xl border border-white/10 py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10">
                    {success ? (
                        <div className="text-center space-y-4">
                            <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-100 p-4 rounded-lg text-sm font-medium">
                                {success}
                            </div>
                            <button
                                onClick={onBackToLogin}
                                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-padang-400/30 rounded-xl text-sm font-bold text-padang-300 hover:bg-padang-800/30 transition-all"
                            >
                                <ArrowLeft size={18} />
                                Kembali ke Login
                            </button>
                        </div>
                    ) : (
                        <form className="space-y-5" onSubmit={handleRegister}>
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/50 text-red-100 p-3 rounded-lg text-sm text-center font-medium">
                                    {error}
                                </div>
                            )}

                            {/* Nama */}
                            <div>
                                <label className="block text-sm font-medium text-slate-200">Nama Lengkap</label>
                                <div className="mt-1.5 relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <User className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        className="block w-full pl-10 pr-3 py-2.5 border border-white/10 bg-white/5 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-gold-400 sm:text-sm transition-all"
                                        placeholder="Nama Anda"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-slate-200">Email</label>
                                <div className="mt-1.5 relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        className="block w-full pl-10 pr-3 py-2.5 border border-white/10 bg-white/5 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-gold-400 sm:text-sm transition-all"
                                        placeholder="email@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-200">Password</label>
                                    <div className="mt-1.5 relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Lock className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <input
                                            type="password"
                                            required
                                            className="block w-full pl-10 pr-3 py-2.5 border border-white/10 bg-white/5 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm transition-all"
                                            placeholder="••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-200">Konfirmasi</label>
                                    <div className="mt-1.5 relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Lock className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <input
                                            type="password"
                                            required
                                            className="block w-full pl-10 pr-3 py-2.5 border border-white/10 bg-white/5 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm transition-all"
                                            placeholder="••••••"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Tipe Toko */}
                            <div>
                                <label className="block text-sm font-medium text-slate-200 mb-2">Toko</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setStoreType('new')}
                                        className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                                            storeType === 'new'
                                                ? 'border-gold-400 bg-gold-400/20 text-gold-300'
                                                : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                                        }`}
                                    >
                                        <Store className="mx-auto mb-1" size={20} />
                                        Buat Toko Baru
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStoreType('existing')}
                                        className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                                            storeType === 'existing'
                                                ? 'border-gold-400 bg-gold-400/20 text-gold-300'
                                                : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                                        }`}
                                    >
                                        <Store className="mx-auto mb-1" size={20} />
                                        Gabung Toko
                                    </button>
                                </div>
                            </div>

                            {storeType === 'new' ? (
                                <div>
                                    <label className="block text-sm font-medium text-slate-200">Nama Toko Baru</label>
                                    <div className="mt-1.5 relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Store className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <input
                                            type="text"
                                            required={storeType === 'new'}
                                            className="block w-full pl-10 pr-3 py-2.5 border border-white/10 bg-white/5 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-gold-400 sm:text-sm transition-all"
                                            placeholder="Contoh: Toko Sinar Jaya"
                                            value={storeName}
                                            onChange={(e) => setStoreName(e.target.value)}
                                        />
                                    </div>
                                    <p className="mt-1 text-xs text-gold-400">
                                        Anda otomatis menjadi Admin toko ini
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-200">Pilih Toko</label>
                                        <select
                                            required={storeType === 'existing'}
                                            className="mt-1.5 block w-full px-3 py-2.5 border border-white/10 bg-white/5 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-gold-400 sm:text-sm transition-all"
                                            value={storeId}
                                            onChange={(e) => setStoreId(e.target.value)}
                                        >
                                            <option value="" className="bg-slate-800">-- Pilih Toko --</option>
                                            {stores.map((s) => (
                                                <option key={s.id} value={s.id} className="bg-slate-800">
                                                    {s.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-200">Daftar Sebagai</label>
                                        <div className="mt-1.5 grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setRole('member')}
                                                className={`p-2 rounded-lg border text-sm font-medium transition-all ${
                                                    role === 'member'
                                                        ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300'
                                                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                                                }`}
                                            >
                                                Anggota
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setRole('admin')}
                                                className={`p-2 rounded-lg border text-sm font-medium transition-all ${
                                                    role === 'admin'
                                                        ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                                                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                                                }`}
                                            >
                                                Admin
                                            </button>
                                        </div>
                                        <p className="mt-1 text-xs text-amber-400">
                                            Membutuhkan persetujuan admin toko
                                        </p>
                                    </div>
                                </>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-padang-950 bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-300 hover:to-gold-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-400 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-lg shadow-gold-400/20"
                            >
                                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Daftar'}
                            </button>

                            <button
                                type="button"
                                onClick={onBackToLogin}
                                className="w-full flex justify-center items-center gap-2 py-2.5 text-sm font-medium text-padang-300 hover:text-gold-400 transition-all"
                            >
                                <ArrowLeft size={16} />
                                Sudah punya akun? Login
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
