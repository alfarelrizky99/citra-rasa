import { useState, useEffect } from 'react';
import { Plus, CreditCard as Edit2, Trash2, UtensilsCrossed, ListChecks, Upload, X, ImageIcon } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Select from '../components/Select';
import { supabase } from '../lib/supabase';
import { uploadProductImage, deleteProductImage } from '../lib/filebase';
import type { Database } from '../lib/database.types';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

type Product = Database['public']['Tables']['products']['Row'];
type ProductInsert = Database['public']['Tables']['products']['Insert'];
type Material = Database['public']['Tables']['materials']['Row'];

type ProductFormData = Omit<ProductInsert, 'store_id'>;


export default function Products() {
    const { user } = useAuth();
    const { darkMode } = useTheme();
    const [products, setProducts] = useState<Product[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showRecipeModal, setShowRecipeModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const [formData, setFormData] = useState<ProductFormData>({
        name: '',
        description: '',
        selling_price: 0,
        category: '',
        image_url: null,
        is_active: true,
    });

    const [recipeItems, setRecipeItems] = useState<
        Array<{ material_id: string; quantity_needed: number; yield_portions: number }>
    >([{ material_id: '', quantity_needed: 0, yield_portions: 1 }]);

    useEffect(() => {
        if (user) {
            fetchProducts();
            fetchMaterials();
        }
    }, [user]);

    const fetchProducts = async () => {
        if (!user) return;
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('store_id', user.store_id)
            .order('name');

        if (!error && data) {
            setProducts(data);
        }
    };

    const fetchMaterials = async () => {
        if (!user) return;
        const { data, error } = await supabase
            .from('materials')
            .select('*')
            .eq('store_id', user.store_id)
            .order('name');

        if (!error && data) {
            setMaterials(data);
        }
    };


    const calculateStandardHPP = async (productId: string) => {
        const { data: recipeData } = await supabase
            .from('recipes')
            .select('material_id, quantity_needed, yield_portions')
            .eq('product_id', productId)
            .eq('store_id', user!.store_id);

        if (!recipeData || recipeData.length === 0) return 0;

        let totalCost = 0;
        const yieldPortions = recipeData[0].yield_portions || 1;

        for (const recipe of recipeData) {
            const { data: material } = await supabase
                .from('materials')
                .select('average_cost')
                .eq('id', recipe.material_id)
                .eq('store_id', user!.store_id)
                .single();

            if (material) {
                totalCost += recipe.quantity_needed * material.average_cost;
            }
        }

        return totalCost / yieldPortions;
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
        setFormData({ ...formData, image_url: null });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage(null);

        try {
            let imageUrl = formData.image_url;

            // Upload image if new file selected
            if (imageFile) {
                setUploadingImage(true);
                const productId = editingProduct?.id || crypto.randomUUID();
                // Delete old image if replacing
                if (editingProduct?.image_url) {
                    await deleteProductImage(editingProduct.image_url);
                }
                imageUrl = await uploadProductImage(imageFile, productId);
                setUploadingImage(false);
            }

            const submitData = { ...formData, image_url: imageUrl };

            if (editingProduct) {
                await supabase
                    .from('products')
                    .update({ ...submitData, updated_at: new Date().toISOString() })
                    .eq('id', editingProduct.id)
                    .eq('store_id', user!.store_id);
            } else {
                await supabase.from('products').insert([{ ...submitData, store_id: user!.store_id }]);
            }

            await fetchProducts();
            handleCloseModal();
        } catch (error: any) {
            console.error('Error saving product:', error);
            setErrorMessage(error?.message || 'Gagal menyimpan produk. Silakan coba lagi.');
        } finally {
            setLoading(false);
            setUploadingImage(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Yakin ingin menghapus produk ini?')) return;
        const product = products.find(p => p.id === id);
        if (product?.image_url) {
            await deleteProductImage(product.image_url);
        }
        await supabase.from('products').delete().eq('id', id).eq('store_id', user!.store_id);
        await fetchProducts();
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingProduct(null);
        setImageFile(null);
        setImagePreview(null);
        setErrorMessage(null);
        setFormData({
            name: '',
            description: '',
            selling_price: 0,
            category: '',
            image_url: null,
            is_active: true,
        });
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            description: product.description,
            selling_price: product.selling_price,
            category: product.category,
            image_url: product.image_url,
            is_active: product.is_active,
        });
        setImagePreview(product.image_url || null);
        setShowModal(true);
    };

    const handleManageRecipe = async (product: Product) => {
        setSelectedProduct(product);

        const { data: existingRecipes } = await supabase
            .from('recipes')
            .select('*')
            .eq('product_id', product.id)
            .eq('store_id', user!.store_id);

        if (existingRecipes && existingRecipes.length > 0) {
            setRecipeItems(
                existingRecipes.map((r) => ({
                    material_id: r.material_id,
                    quantity_needed: r.quantity_needed,
                    yield_portions: r.yield_portions,
                }))
            );
        } else {
            setRecipeItems([{ material_id: '', quantity_needed: 0, yield_portions: 1 }]);
        }

        setShowRecipeModal(true);
    };

    const handleSaveRecipe = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct) return;

        setLoading(true);
        try {
            await supabase.from('recipes').delete().eq('product_id', selectedProduct.id).eq('store_id', user!.store_id);

            const validRecipes = recipeItems.filter((item) => item.material_id && item.quantity_needed > 0);

            if (validRecipes.length > 0) {
                await supabase.from('recipes').insert(
                    validRecipes.map((item) => ({
                        product_id: selectedProduct.id,
                        material_id: item.material_id,
                        quantity_needed: item.quantity_needed,
                        yield_portions: item.yield_portions,
                        store_id: user!.store_id,
                    }))
                );
            }

            const standardHPP = await calculateStandardHPP(selectedProduct.id);
            await supabase
                .from('products')
                .update({
                    standard_hpp: standardHPP,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', selectedProduct.id)
                .eq('store_id', user!.store_id);

            await fetchProducts();
            setShowRecipeModal(false);
        } catch (error) {
            console.error('Error saving recipe:', error);
        } finally {
            setLoading(false);
        }
    };

    const addRecipeItem = () => {
        setRecipeItems([...recipeItems, { material_id: '', quantity_needed: 0, yield_portions: 1 }]);
    };

    const removeRecipeItem = (index: number) => {
        setRecipeItems(recipeItems.filter((_, i) => i !== index));
    };

    const updateRecipeItem = (index: number, field: string, value: any) => {
        const updated = [...recipeItems];
        updated[index] = { ...updated[index], [field]: value };
        setRecipeItems(updated);
    };

    const columns = [
        {
            key: 'image_url',
            label: 'Foto',
            align: 'center' as const,
            render: (value: string | null, row: Product) => (
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                    {value ? (
                        <img src={value} alt={row.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                    ) : (
                        <ImageIcon size={20} className="text-slate-400" />
                    )}
                </div>
            ),
        },
        { key: 'name', label: 'Nama Produk' },
        { key: 'category', label: 'Kategori' },
        {
            key: 'selling_price',
            label: 'Harga Jual',
            align: 'right' as const,
            render: (value: number) => `Rp ${value.toLocaleString('id-ID')}`,
        },
        {
            key: 'standard_hpp',
            label: 'HPP Standar',
            align: 'right' as const,
            render: (value: number) => `Rp ${value.toLocaleString('id-ID')}`,
        },
        {
            key: 'margin',
            label: 'Margin',
            align: 'right' as const,
            render: (_: any, row: Product) => {
                const margin = row.selling_price - row.standard_hpp;
                const marginPct = row.selling_price > 0 ? (margin / row.selling_price) * 100 : 0;
                return (
                    <span className={margin > 0 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-red-600 dark:text-red-400'}>
                        {marginPct.toFixed(1)}%
                    </span>
                );
            },
        },
        {
            key: 'is_active',
            label: 'Status',
            align: 'center' as const,
            render: (value: boolean) => (
                <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${value 
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-400'
                    }`}
                >
                    {value ? 'Aktif' : 'Non-Aktif'}
                </span>
            ),
        },
        {
            key: 'actions',
            label: 'Aksi',
            align: 'center' as const,
            render: (_: any, row: Product) => (
                <div className="flex items-center justify-center gap-2">
                    <button
                        onClick={() => handleManageRecipe(row)}
                        className="p-1.5 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                        title="Kelola Resep"
                    >
                        <ListChecks size={18} />
                    </button>
                    <button
                        onClick={() => handleEdit(row)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Edit"
                    >
                        <Edit2 size={18} />
                    </button>
                    <button
                        onClick={() => handleDelete(row.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Hapus"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="dark:bg-gradient-to-br dark:from-purple-900/20 dark:to-pink-900/20 border-slate-200 dark:border-purple-800/50">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl shadow-sm ${darkMode ? 'bg-gradient-to-r from-purple-600 to-pink-600 shadow-purple-500/20 text-white' : 'bg-purple-100 text-purple-600'}`}>
                            <UtensilsCrossed size={24} />
                        </div>
                        <div>
                            <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-700'}`}>Total Produk</p>
                            <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-black'}`}>{products.length}</p>
                        </div>
                    </div>
                </Card>

                <Card className="dark:bg-gradient-to-br dark:from-emerald-900/20 dark:to-teal-900/20 border-slate-200 dark:border-emerald-800/50">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl shadow-sm ${darkMode ? 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-500/20 text-white' : 'bg-emerald-100 text-emerald-600'}`}>
                            <ListChecks size={24} />
                        </div>
                        <div>
                            <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-700'}`}>Produk Aktif</p>
                            <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-black'}`}>
                                {products.filter((p) => p.is_active).length}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="dark:bg-gradient-to-br dark:from-blue-900/20 dark:to-cyan-900/20 border-slate-200 dark:border-blue-800/50">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl shadow-sm ${darkMode ? 'bg-gradient-to-r from-blue-600 to-cyan-600 shadow-blue-500/20 text-white' : 'bg-blue-100 text-blue-600'}`}>
                            <UtensilsCrossed size={24} />
                        </div>
                        <div>
                            <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-700'}`}>Rata-rata Margin</p>
                            <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-black'}`}>
                                {products.length > 0
                                    ? (
                                        products.reduce((sum, p) => {
                                            const margin = p.selling_price > 0 ? ((p.selling_price - p.standard_hpp) / p.selling_price) * 100 : 0;
                                            return sum + margin;
                                        }, 0) / products.length
                                    ).toFixed(1)
                                    : 0}
                                %
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            <Card
                title="Daftar Produk"
                action={
                    <Button onClick={() => setShowModal(true)} size="sm">
                        <Plus size={18} className="mr-1" />
                        Tambah Produk
                    </Button>
                }
            >
                <Table columns={columns} data={products} emptyMessage="Belum ada produk" />
            </Card>

            <Modal
                isOpen={showModal}
                onClose={handleCloseModal}
                title={editingProduct ? 'Edit Produk' : 'Tambah Produk'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Error Message */}
                    {errorMessage && (
                        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
                            <p className="font-semibold">⚠️ Error</p>
                            <p>{errorMessage}</p>
                        </div>
                    )}
                    {/* Image Upload */}
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            Foto Produk
                        </label>
                        {imagePreview ? (
                            <div className="relative w-full h-48 rounded-xl overflow-hidden border-2 border-dashed border-padang-300 dark:border-padang-700">
                                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" loading="lazy" decoding="async" />
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
                            <label className={`flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${darkMode ? 'border-slate-600 hover:border-slate-500 bg-slate-800/50' : 'border-slate-300 hover:border-padang-400 bg-slate-50'}`}>
                                <Upload size={28} className="text-slate-400 mb-2" />
                                <span className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Klik untuk upload gambar</span>
                                <span className="text-xs text-slate-400 mt-1">JPG, PNG, WebP (maks 5MB)</span>
                                <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                            </label>
                        )}
                    </div>

                    <Input
                        label="Nama Produk"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />

                    <Input
                        label="Deskripsi"
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />

                    <Input
                        label="Kategori"
                        value={formData.category || ''}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    />

                    <Input
                        label="Harga Jual"
                        type="number"
                        step="0.01"
                        value={formData.selling_price}
                        onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })}
                        required
                    />

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="is_active"
                            checked={formData.is_active}
                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                            className="w-4 h-4 text-blue-600 dark:text-blue-500 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="is_active" className="text-sm text-slate-700 dark:text-slate-300 select-none">
                            Produk Aktif
                        </label>
                    </div>

                    <div className="flex gap-2 justify-end pt-4">
                        <Button type="button" variant="secondary" onClick={handleCloseModal}>
                            Batal
                        </Button>
                        <Button type="submit" loading={loading || uploadingImage}>
                            {uploadingImage ? 'Mengupload...' : editingProduct ? 'Update' : 'Simpan'}
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={showRecipeModal}
                onClose={() => setShowRecipeModal(false)}
                title={`Kelola Resep - ${selectedProduct?.name}`}
                size="lg"
            >
                <form onSubmit={handleSaveRecipe} className="space-y-4">
                    <div className="space-y-3">
                        {recipeItems.map((item, index) => (
                            <div key={index} className="flex gap-2 items-end">
                                <div className="flex-1">
                                    <Select
                                        label={index === 0 ? 'Bahan Baku' : ''}
                                        value={item.material_id}
                                        onChange={(e) => updateRecipeItem(index, 'material_id', e.target.value)}
                                        options={[
                                            { value: '', label: '-- Pilih Bahan --' },
                                            ...materials.map((m) => ({ value: m.id, label: `${m.name} (${m.unit})` })),
                                        ]}
                                        required
                                    />
                                </div>
                                <div className="w-32">
                                    <Input
                                        label={index === 0 ? 'Jumlah' : ''}
                                        type="number"
                                        step="0.01"
                                        value={item.quantity_needed}
                                        onChange={(e) => updateRecipeItem(index, 'quantity_needed', parseFloat(e.target.value) || 0)}
                                        required
                                    />
                                </div>
                                <div className="w-32">
                                    <Input
                                        label={index === 0 ? 'Porsi' : ''}
                                        type="number"
                                        step="0.01"
                                        value={item.yield_portions}
                                        onChange={(e) => updateRecipeItem(index, 'yield_portions', parseFloat(e.target.value) || 1)}
                                        required
                                    />
                                </div>
                                <Button
                                    type="button"
                                    variant="danger"
                                    size="sm"
                                    onClick={() => removeRecipeItem(index)}
                                    disabled={recipeItems.length === 1}
                                    className="mb-0.5"
                                >
                                    <Trash2 size={16} />
                                </Button>
                            </div>
                        ))}
                    </div>

                    <Button type="button" variant="secondary" onClick={addRecipeItem} size="sm">
                        <Plus size={16} className="mr-1" />
                        Tambah Bahan
                    </Button>

                    <div className="flex gap-2 justify-end pt-4 border-t dark:border-slate-700">
                        <Button type="button" variant="secondary" onClick={() => setShowRecipeModal(false)}>
                            Batal
                        </Button>
                        <Button type="submit" loading={loading}>
                            Simpan Resep
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
