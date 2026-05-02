import { useState } from 'react';
import { Lock, Mail, Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface LoginProps {
    onGoToRegister: () => void;
    onGoToHome?: () => void;
}

export default function Login({ onGoToRegister, onGoToHome }: LoginProps) {
    const { signIn } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase.rpc('login_user', {
                input_email: email,
                input_password: password
            });

            if (error || !data || data.length === 0) {
                setError('Email atau Password salah');
            } else {
                const userData = data[0];
                if (userData.status === 'pending') {
                    setError('Akun Anda masih menunggu persetujuan admin toko.');
                } else if (userData.status === 'rejected') {
                    setError('Pendaftaran Anda ditolak oleh admin toko.');
                } else {
                    signIn(userData);
                }
            }
        } catch (err) {
            setError('Terjadi kesalahan saat memproses login.');
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

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                <div className="flex justify-center">
                    <img src="/logo-citrarasa.png" alt="Citra Rasa" className="h-20 w-auto object-contain drop-shadow-2xl" />
                </div>
                <h2 className="mt-6 text-center text-3xl font-display font-bold text-white tracking-tight">
                    Citra <span className="text-gold-400">Rasa</span>
                </h2>
                <p className="mt-2 text-center text-sm text-white/50">
                    HPP Kasir System — Manajemen Harga Pokok Penjualan
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                <div className="bg-padang-950/50 backdrop-blur-xl border border-white/10 py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10">
                    <form className="space-y-6" onSubmit={handleLogin}>
                        {error && (
                            <div className="bg-spice-500/10 border border-spice-500/50 text-spice-200 p-3 rounded-lg text-sm text-center font-medium">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-white/70" htmlFor="email">
                                Alamat Email
                            </label>
                            <div className="mt-2 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-padang-400" />
                                </div>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    className="block w-full pl-10 pr-3 py-3 border border-white/10 bg-white/5 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-gold-400 sm:text-sm transition-all"
                                    placeholder="admin@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white/70" htmlFor="password">
                                Kata Sandi
                            </label>
                            <div className="mt-2 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-padang-400" />
                                </div>
                                <input
                                    id="password"
                                    type="password"
                                    required
                                    className="block w-full pl-10 pr-3 py-3 border border-white/10 bg-white/5 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-gold-400 sm:text-sm transition-all"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-padang-950 bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-300 hover:to-gold-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-400 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-lg shadow-gold-400/20"
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin h-5 w-5" />
                                ) : (
                                    'Masuk'
                                )}
                            </button>
                        </div>
                    </form>
                    
                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/10" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-transparent text-white/30">
                                    atau
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={onGoToRegister}
                            className="mt-4 w-full flex justify-center py-3 px-4 border border-padang-400/30 rounded-xl text-sm font-bold text-padang-300 hover:bg-padang-800/30 transition-all"
                        >
                            Buat Akun Baru
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
