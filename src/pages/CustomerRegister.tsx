import { useState } from 'react';
import { Lock, Mail, Loader2, User, ArrowLeft, UserPlus, Phone, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CustomerRegisterProps {
    onBackToLogin: () => void;
    onGoToHome?: () => void;
}

export default function CustomerRegister({ onBackToLogin, onGoToHome }: CustomerRegisterProps) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const defaultStoreId = import.meta.env.VITE_DEFAULT_STORE_ID || '';

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

        try {
            // Register as pelanggan with the default store
            const { data, error: rpcError } = await supabase.rpc('register_user', {
                input_name: name,
                input_email: email,
                input_password: password,
                input_role: 'pelanggan',
                input_store_id: defaultStoreId || undefined,
                input_store_name: !defaultStoreId ? 'Citra Rasa' : undefined,
            });

            if (rpcError) {
                setError(rpcError.message);
            } else if (data && data.length > 0) {
                const result = data[0];
                if (result.success) {
                    setSuccess('🎉 Selamat! Akun Anda berhasil dibuat. Silakan masuk untuk mulai memesan.');
                } else {
                    setError(result.message);
                }
            }
        } catch (err) {
            setError('Terjadi kesalahan saat memproses pendaftaran.');
            console.error(err);
        }

        setLoading(false);
    };

    return (
        <div className="min-h-screen flex flex-col relative overflow-hidden bg-gradient-to-br from-gold-50 via-white to-padang-50">
            {/* Decorative background */}
            <div className="absolute top-0 left-0 w-80 h-80 bg-gradient-to-br from-gold-200/30 to-padang-200/30 rounded-full -translate-y-1/3 -translate-x-1/3 blur-3xl" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-spice-200/20 to-gold-200/20 rounded-full translate-y-1/3 translate-x-1/3 blur-3xl" />
            
            {/* Floating food */}
            <div className="absolute top-16 right-12 text-4xl animate-float opacity-15">🥗</div>
            <div className="absolute top-52 left-8 text-3xl animate-float-delayed opacity-15">🍛</div>
            <div className="absolute bottom-28 right-20 text-3xl animate-float opacity-15">🥩</div>

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
                <div className="w-full max-w-md space-y-6">
                    {/* Header */}
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-gold-400 to-padang-500 rounded-3xl shadow-xl shadow-gold-400/25 mb-6 animate-logo-zoom">
                            <Sparkles className="w-10 h-10 text-white" />
                        </div>
                        <h2 className="font-display text-3xl sm:text-4xl font-bold text-padang-900 tracking-tight">
                            Gabung <span className="text-gold-600">Sekarang!</span>
                        </h2>
                        <p className="mt-3 text-padang-600/70 text-sm leading-relaxed">
                            Daftar gratis dan nikmati kemudahan pesan makanan favorit
                        </p>
                    </div>

                    {/* Card */}
                    <div className="bg-white/80 backdrop-blur-xl border border-padang-100 shadow-xl shadow-padang-100/30 rounded-3xl p-8">
                        {success ? (
                            <div className="text-center space-y-5">
                                <div className="w-20 h-20 bg-leaf-100 rounded-full flex items-center justify-center mx-auto">
                                    <span className="text-4xl">🎉</span>
                                </div>
                                <div className="bg-leaf-50 border border-leaf-200 text-leaf-800 p-4 rounded-xl text-sm font-medium leading-relaxed">
                                    {success}
                                </div>
                                <button
                                    onClick={onBackToLogin}
                                    className="w-full flex justify-center items-center gap-2 py-3.5 px-4 bg-gradient-to-r from-padang-600 to-spice-600 text-white font-bold rounded-xl hover:shadow-lg transition-all"
                                >
                                    <ArrowLeft size={18} />
                                    Masuk ke Akun Saya
                                </button>
                            </div>
                        ) : (
                            <form className="space-y-4" onSubmit={handleRegister}>
                                {error && (
                                    <div className="bg-spice-50 border border-spice-200 text-spice-700 p-3 rounded-xl text-sm text-center font-medium">
                                        ⚠️ {error}
                                    </div>
                                )}

                                {/* Name */}
                                <div>
                                    <label className="block text-sm font-semibold text-padang-800 mb-1.5">Nama Lengkap</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <User className="h-4 w-4 text-padang-400" />
                                        </div>
                                        <input
                                            type="text"
                                            required
                                            className="block w-full pl-11 pr-4 py-2.5 border border-padang-200 bg-padang-50/50 rounded-xl text-padang-900 placeholder-padang-400/60 focus:outline-none focus:ring-2 focus:ring-padang-500 sm:text-sm transition-all"
                                            placeholder="Nama Anda"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-sm font-semibold text-padang-800 mb-1.5">Email</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <Mail className="h-4 w-4 text-padang-400" />
                                        </div>
                                        <input
                                            type="email"
                                            required
                                            className="block w-full pl-11 pr-4 py-2.5 border border-padang-200 bg-padang-50/50 rounded-xl text-padang-900 placeholder-padang-400/60 focus:outline-none focus:ring-2 focus:ring-padang-500 sm:text-sm transition-all"
                                            placeholder="email@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Phone */}
                                <div>
                                    <label className="block text-sm font-semibold text-padang-800 mb-1.5">No. WhatsApp</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <Phone className="h-4 w-4 text-padang-400" />
                                        </div>
                                        <input
                                            type="tel"
                                            className="block w-full pl-11 pr-4 py-2.5 border border-padang-200 bg-padang-50/50 rounded-xl text-padang-900 placeholder-padang-400/60 focus:outline-none focus:ring-2 focus:ring-padang-500 sm:text-sm transition-all"
                                            placeholder="08xx-xxxx-xxxx (opsional)"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Password */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-semibold text-padang-800 mb-1.5">Password</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                                <Lock className="h-4 w-4 text-padang-400" />
                                            </div>
                                            <input
                                                type="password"
                                                required
                                                className="block w-full pl-11 pr-3 py-2.5 border border-padang-200 bg-padang-50/50 rounded-xl text-padang-900 placeholder-padang-400/60 focus:outline-none focus:ring-2 focus:ring-padang-500 sm:text-sm transition-all"
                                                placeholder="••••••"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-padang-800 mb-1.5">Konfirmasi</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                                <Lock className="h-4 w-4 text-padang-400" />
                                            </div>
                                            <input
                                                type="password"
                                                required
                                                className="block w-full pl-11 pr-3 py-2.5 border border-padang-200 bg-padang-50/50 rounded-xl text-padang-900 placeholder-padang-400/60 focus:outline-none focus:ring-2 focus:ring-padang-500 sm:text-sm transition-all"
                                                placeholder="••••••"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-gradient-to-r from-gold-500 to-padang-600 hover:from-gold-400 hover:to-padang-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-400 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-lg shadow-gold-400/25 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
                                >
                                    {loading ? (
                                        <Loader2 className="animate-spin h-5 w-5" />
                                    ) : (
                                        <>
                                            <UserPlus className="w-4 h-4" />
                                            Daftar Gratis
                                        </>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={onBackToLogin}
                                    className="w-full flex justify-center items-center gap-2 py-2.5 text-sm font-medium text-padang-600 hover:text-padang-800 transition-all"
                                >
                                    <ArrowLeft size={16} />
                                    Sudah punya akun? Masuk
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
