import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { uploadBannerImage, deleteBannerImage } from '../lib/filebase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Image as ImageIcon, Plus, Trash2, Edit2, Loader2, Link as LinkIcon, AlertCircle, X, Upload } from 'lucide-react';
import type { Database } from '../lib/database.types';

type PromoBanner = Database['public']['Tables']['promo_banners']['Row'];

export default function ManageBanners() {
    const { user } = useAuth();
    const { darkMode } = useTheme();
    const [banners, setBanners] = useState<PromoBanner[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [sortOrder, setSortOrder] = useState(0);

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);

    useEffect(() => {
        if (user) {
            fetchBanners();
        }
    }, [user]);

    const fetchBanners = async () => {
        if (!user) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('promo_banners')
            .select('*')
            .eq('store_id', user.store_id)
            .order('sort_order', { ascending: true });

        if (error) {
            console.error('Error fetching banners:', error);
        } else if (data) {
            setBanners(data);
        }
        setLoading(false);
    };

    const handleOpenModal = (banner?: PromoBanner) => {
        if (banner) {
            setEditingId(banner.id);
            setTitle(banner.title);
            setImageUrl(banner.image_url);
            setImagePreview(banner.image_url);
            setIsActive(banner.is_active);
            setSortOrder(banner.sort_order);
        } else {
            setEditingId(null);
            setTitle('');
            setImageUrl('');
            setImagePreview(null);
            setIsActive(true);
            setSortOrder(banners.length);
        }
        setImageFile(null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setImageFile(null);
        setImagePreview(null);
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageFile(file);
        const reader = new FileReader();
        reader.onload = () => setImagePreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreview(null);
        setImageUrl('');
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        
        if (!imageUrl && !imageFile && !imagePreview) {
            alert('Silakan upload atau masukkan URL gambar');
            return;
        }

        setSaving(true);
        try {
            let finalImageUrl = imageUrl;
            const bannerIdToUse = editingId || crypto.randomUUID();

            if (imageFile) {
                setUploadingImage(true);
                // If editing and had a previous uploaded image, try deleting it
                if (editingId) {
                    const oldBanner = banners.find(b => b.id === editingId);
                    if (oldBanner?.image_url) {
                        await deleteBannerImage(oldBanner.image_url);
                    }
                }
                finalImageUrl = await uploadBannerImage(imageFile, bannerIdToUse);
                setUploadingImage(false);
            }

            const payload = {
                ...(editingId ? {} : { id: bannerIdToUse }),
                store_id: user.store_id,
                title,
                image_url: finalImageUrl,
                is_active: isActive,
                sort_order: sortOrder,
            };

            if (editingId) {
                const { error } = await supabase
                    .from('promo_banners')
                    .update(payload)
                    .eq('id', editingId)
                    .eq('store_id', user.store_id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('promo_banners')
                    .insert(payload);
                if (error) throw error;
            }
            await fetchBanners();
            handleCloseModal();
        } catch (error) {
            console.error('Error saving banner:', error);
            alert('Gagal menyimpan banner');
        } finally {
            setSaving(false);
            setUploadingImage(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus banner ini?')) return;
        if (!user) return;

        try {
            const banner = banners.find(b => b.id === id);
            if (banner?.image_url) {
                await deleteBannerImage(banner.image_url);
            }

            const { error } = await supabase
                .from('promo_banners')
                .delete()
                .eq('id', id)
                .eq('store_id', user.store_id);
            if (error) throw error;
            await fetchBanners();
        } catch (error) {
            console.error('Error deleting banner:', error);
            alert('Gagal menghapus banner');
        }
    };

    const toggleActive = async (banner: PromoBanner) => {
        if (!user) return;
        try {
            const { error } = await supabase
                .from('promo_banners')
                .update({ is_active: !banner.is_active })
                .eq('id', banner.id)
                .eq('store_id', user.store_id);
            if (error) throw error;
            await fetchBanners();
        } catch (error) {
            console.error('Error toggling active:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className={`w-8 h-8 animate-spin ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        Kelola Banner Promo
                    </h1>
                    <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Atur banner yang akan tampil di halaman utama pelanggan
                    </p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-white transition-all ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700 shadow-md'
                        }`}
                >
                    <Plus size={18} />
                    Tambah Banner
                </button>
            </div>

            {banners.length === 0 ? (
                <div className={`text-center py-20 rounded-2xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <div className={`w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-4 ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                        <ImageIcon className={`w-10 h-10 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                    </div>
                    <h3 className={`text-lg font-bold mb-1 ${darkMode ? 'text-white' : 'text-slate-800'}`}>Belum Ada Banner</h3>
                    <p className={`text-sm mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Tambahkan banner promo pertama Anda</p>
                    <button
                        onClick={() => handleOpenModal()}
                        className={`text-sm font-semibold ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                    >
                        + Tambah Banner
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {banners.map((banner) => (
                        <div key={banner.id} className={`rounded-2xl border overflow-hidden transition-all ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                            <div className="relative aspect-[12/5] bg-slate-100">
                                <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                                <div className="absolute top-2 right-2 flex gap-2">
                                    <button
                                        onClick={() => toggleActive(banner)}
                                        className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-md ${banner.is_active
                                                ? 'bg-emerald-500/90 text-white'
                                                : 'bg-slate-500/90 text-white'
                                            }`}
                                    >
                                        {banner.is_active ? 'Aktif' : 'Nonaktif'}
                                    </button>
                                </div>
                            </div>
                            <div className="p-4">
                                <h3 className={`font-bold mb-1 truncate ${darkMode ? 'text-white' : 'text-slate-800'}`}>{banner.title}</h3>
                                <div className="flex items-center gap-2 mt-4">
                                    <button
                                        onClick={() => handleOpenModal(banner)}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                            }`}
                                    >
                                        <Edit2 size={16} /> Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(banner.id)}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${darkMode ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-red-50 text-red-600 hover:bg-red-100'
                                            }`}
                                    >
                                        <Trash2 size={16} /> Hapus
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden ${darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>
                        <div className={`p-5 border-b flex justify-between items-center ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                            <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                {editingId ? 'Edit Banner' : 'Tambah Banner'}
                            </h2>
                            <button onClick={handleCloseModal} className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-5 space-y-4">
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                    Judul Banner
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 outline-none transition-all ${darkMode ? 'bg-slate-900 border-slate-700 text-white focus:ring-blue-500' : 'bg-white border-slate-300 focus:ring-blue-500'
                                        }`}
                                    placeholder="Promo Lebaran, Diskon Akhir Tahun..."
                                />
                            </div>
                            
                            {/* Image Upload/Preview */}
                            <div>
                                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                    Gambar Banner
                                </label>
                                {imagePreview || imageUrl ? (
                                    <div className="relative w-full aspect-[12/5] rounded-xl overflow-hidden border-2 border-dashed border-padang-300 dark:border-padang-700">
                                        <img src={imagePreview || imageUrl} alt="Preview" className="w-full h-full object-cover" loading="lazy" decoding="async" onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/1200x500?text=Gambar+Tidak+Valid')} />
                                        <button
                                            type="button"
                                            onClick={handleRemoveImage}
                                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-lg"
                                        >
                                            <X size={16} />
                                        </button>
                                        {uploadingImage && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                <div className="animate-spin w-8 h-8 border-3 border-white border-t-transparent rounded-full" />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <label className={`flex flex-col items-center justify-center w-full aspect-[12/5] rounded-xl border-2 border-dashed cursor-pointer transition-colors ${darkMode ? 'border-slate-600 hover:border-slate-500 bg-slate-800/50' : 'border-slate-300 hover:border-padang-400 bg-slate-50'}`}>
                                        <Upload size={28} className="text-slate-400 mb-2" />
                                        <span className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Klik untuk upload gambar</span>
                                        <span className="text-xs text-slate-400 mt-1">Atau masukkan URL gambar di bawah</span>
                                        <span className="text-xs text-slate-400 mt-1">Disarankan ukuran gambar rasio 12:5 (contoh: 1200x500)</span>
                                        <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                                    </label>
                                )}
                            </div>

                            <div className="relative flex items-center gap-2">
                                <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
                                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2">ATAU</span>
                                <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
                            </div>

                            <div>
                                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                    URL Gambar (Opsional)
                                </label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <LinkIcon size={16} className={darkMode ? 'text-slate-500' : 'text-slate-400'} />
                                        </div>
                                        <input
                                            type="url"
                                            value={imageUrl}
                                            onChange={(e) => { setImageUrl(e.target.value); setImagePreview(e.target.value); setImageFile(null); }}
                                            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border focus:ring-2 outline-none transition-all ${darkMode ? 'bg-slate-900 border-slate-700 text-white focus:ring-blue-500' : 'bg-white border-slate-300 focus:ring-blue-500'
                                                }`}
                                            placeholder="https://example.com/image.jpg"
                                            disabled={!!imageFile}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                        Urutan (Sort Order)
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        value={sortOrder}
                                        onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                                        className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 outline-none transition-all ${darkMode ? 'bg-slate-900 border-slate-700 text-white focus:ring-blue-500' : 'bg-white border-slate-300 focus:ring-blue-500'
                                            }`}
                                    />
                                </div>
                                <div className="flex items-center pt-7">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isActive}
                                            onChange={(e) => setIsActive(e.target.checked)}
                                            className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Status Aktif</span>
                                    </label>
                                </div>
                            </div>

                            <div className={`pt-4 border-t flex justify-end gap-3 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className={`px-5 py-2.5 rounded-xl font-medium transition-colors ${darkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                        }`}
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving || uploadingImage}
                                    className={`px-5 py-2.5 rounded-xl font-semibold text-white transition-all flex items-center gap-2 ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700 shadow-md'
                                        } disabled:opacity-50`}
                                >
                                    {(saving || uploadingImage) && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {uploadingImage ? 'Mengupload...' : 'Simpan Banner'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
