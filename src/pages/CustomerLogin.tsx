import { useState } from 'react';
import { Lock, Mail, Loader2, ArrowLeft, Heart, Utensils, ShoppingBag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface CustomerLoginProps {
    onGoToRegister: () => void;
    onGoToHome?: () => void;
}

export default function CustomerLogin({ onGoToRegister, onGoToHome }: CustomerLoginProps) {
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
                if (userData.role !== 'pelanggan') {
                    setError('Akun ini bukan akun pelanggan. Silakan gunakan login kasir.');
                } else if (userData.status === 'pending') {
                    setError('Akun Anda masih menunggu aktivasi.');
                } else if (userData.status === 'rejected') {
                    setError('Akun Anda ditolak.');
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
        <div className="min-h-screen flex flex-col relative overflow-hidden bg-gradient-to-br from-padang-50 via-white to-gold-50">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-padang-200/30 to-gold-200/30 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-spice-200/20 to-padang-200/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
            
            {/* Floating food icons */}
            <div className="absolute top-20 left-10 text-4xl animate-float opacity-20">🍛</div>
            <div className="absolute top-40 right-16 text-3xl animate-float-delayed opacity-20">🍚</div>
            <div className="absolute bottom-32 left-20 text-3xl animate-float opacity-15">🌶️</div>
            <div className="absolute bottom-20 right-10 text-4xl animate-float-delayed opacity-20">🥘</div>

            {onGoToHome && (
                <button
                    onClick={onGoToHome}
                    className="absolute top-6 left-6 z-20 flex items-center gap-2 text-padang-600 hover:text-padang-800 transition-colors text-sm font-medium"
                >
                    <ArrowLeft size={18} />
                    Kembali ke Beranda
                </button>
            )}

            <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="w-full max-w-md space-y-8">
                    {/* Header */}
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-padang-500 to-spice-500 rounded-3xl shadow-xl shadow-padang-500/25 mb-6 animate-logo-zoom">
                            <Utensils className="w-10 h-10 text-white" />
                        </div>
                        <h2 className="font-display text-3xl sm:text-4xl font-bold text-padang-900 tracking-tight">
                            Halo, Penikmat <span className="text-spice-600">Rasa!</span>
                        </h2>
                        <p className="mt-3 text-padang-600/70 text-sm leading-relaxed">
                            Masuk ke akun pelanggan Anda untuk pesan makanan favorit
                        </p>
                    </div>

                    {/* Card */}
                    <div className="bg-white/80 backdrop-blur-xl border border-padang-100 shadow-xl shadow-padang-100/30 rounded-3xl p-8">
                        <form className="space-y-5" onSubmit={handleLogin}>
                            {error && (
                                <div className="bg-spice-50 border border-spice-200 text-spice-700 p-3.5 rounded-xl text-sm text-center font-medium flex items-center justify-center gap-2">
                                    <span>⚠️</span> {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-padang-800 mb-1.5" htmlFor="customer-email">
                                    Email
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <Mail className="h-4.5 w-4.5 text-padang-400" />
                                    </div>
                                    <input
                                        id="customer-email"
                                        type="email"
                                        required
                                        className="block w-full pl-11 pr-4 py-3 border border-padang-200 bg-padang-50/50 rounded-xl text-padang-900 placeholder-padang-400/60 focus:outline-none focus:ring-2 focus:ring-padang-500 focus:border-padang-500 sm:text-sm transition-all"
                                        placeholder="nama@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-padang-800 mb-1.5" htmlFor="customer-password">
                                    Kata Sandi
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <Lock className="h-4.5 w-4.5 text-padang-400" />
                                    </div>
                                    <input
                                        id="customer-password"
                                        type="password"
                                        required
                                        className="block w-full pl-11 pr-4 py-3 border border-padang-200 bg-padang-50/50 rounded-xl text-padang-900 placeholder-padang-400/60 focus:outline-none focus:ring-2 focus:ring-padang-500 focus:border-padang-500 sm:text-sm transition-all"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-gradient-to-r from-padang-600 to-spice-600 hover:from-padang-500 hover:to-spice-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-padang-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-lg shadow-padang-600/25 hover:shadow-xl hover:shadow-padang-600/30 hover:-translate-y-0.5 active:translate-y-0"
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin h-5 w-5" />
                                ) : (
                                    <>
                                        <ShoppingBag className="w-4 h-4" />
                                        Masuk & Pesan
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-6">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-padang-200" />
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-3 bg-white/80 text-padang-400">
                                        belum punya akun?
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={onGoToRegister}
                                className="mt-4 w-full flex justify-center items-center gap-2 py-3 px-4 border-2 border-padang-200 rounded-xl text-sm font-bold text-padang-700 hover:bg-padang-50 hover:border-padang-300 transition-all"
                            >
                                <Heart className="w-4 h-4" />
                                Daftar Sekarang — Gratis!
                            </button>
                        </div>
                    </div>

                    {/* Trust badges */}
                    <div className="flex items-center justify-center gap-6 text-padang-400">
                        <div className="flex items-center gap-1.5 text-xs">
                            <span>🔒</span> Aman
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                            <span>🚀</span> Cepat
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                            <span>❤️</span> Gratis
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
