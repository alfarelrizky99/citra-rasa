import { useState, useEffect } from 'react';
import { Plus, CreditCard as Edit2, Trash2, Package, TrendingUp, TrendingDown } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Select from '../components/Select';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

type Material = Database['public']['Tables']['materials']['Row'];
type MaterialInsert = Database['public']['Tables']['materials']['Insert'];

type MaterialFormData = Omit<MaterialInsert, 'store_id'>;

const UNITS = [
    { value: 'gram', label: 'Gram (g)' },
    { value: 'kg', label: 'Kilogram (kg)' },
    { value: 'liter', label: 'Liter (L)' },
    { value: 'ml', label: 'Mililiter (mL)' },
    { value: 'pcs', label: 'Pieces (pcs)' },
];

export default function Materials() {
    const { user } = useAuth();
    const { darkMode } = useTheme();
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showStockModal, setShowStockModal] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
    const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);

    const [formData, setFormData] = useState<MaterialFormData>({
        name: '',
        unit: 'gram',
        current_stock: 0,
        average_cost: 0,
        bulk_price: 0,
        min_stock: 0,
    });

    // Auto-calculated: Harga per Porsi = Harga Belanja / Stok (porsi)
    const calculatedCostPerPortion = formData.current_stock && formData.current_stock > 0
        ? (formData.bulk_price || 0) / formData.current_stock
        : 0;

    const [stockData, setStockData] = useState({
        total_price: 0,
        portions: 1,
        notes: '',
    });

    useEffect(() => {
        if (user) fetchMaterials();
    }, [user]);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // average_cost = bulk_price / current_stock (auto-calculated)
            const submitData = {
                ...formData,
                average_cost: calculatedCostPerPortion,
                bulk_price: formData.bulk_price || 0,
            };

            if (editingMaterial) {
                await supabase
                    .from('materials')
                    .update({ ...submitData, updated_at: new Date().toISOString() })
                    .eq('id', editingMaterial.id)
                    .eq('store_id', user!.store_id);
            } else {
                await supabase.from('materials').insert([{ ...submitData, store_id: user!.store_id }]);
            }

            await fetchMaterials();
            handleCloseModal();
        } catch (error) {
            console.error('Error saving material:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Yakin ingin menghapus bahan baku ini?')) return;

        await supabase.from('materials').delete().eq('id', id).eq('store_id', user!.store_id);
        await fetchMaterials();
    };

    const handleStockIn = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMaterial) return;

        setLoading(true);
        try {
            // Calculate cost per piece/portion
            const costPerUnit = stockData.portions > 0 ? stockData.total_price / stockData.portions : 0;
            const quantity = stockData.portions; // stock added = number of portions
            const totalCost = stockData.total_price;

            const oldStock = selectedMaterial.current_stock;
            const oldBulkPrice = selectedMaterial.bulk_price || 0;
            const newStock = oldStock + quantity;
            const newBulkPrice = oldBulkPrice + totalCost;
            const newAverageCost = newStock > 0 ? newBulkPrice / newStock : costPerUnit;

            await supabase.from('material_transactions').insert([
                {
                    store_id: user!.store_id,
                    material_id: selectedMaterial.id,
                    transaction_type: 'IN',
                    quantity: quantity,
                    cost_per_unit: costPerUnit,
                    total_cost: totalCost,
                    reference_type: 'PURCHASE',
                    notes: stockData.notes,
                },
            ]);

            await supabase
                .from('materials')
                .update({
                    current_stock: newStock,
                    bulk_price: newBulkPrice,
                    average_cost: newAverageCost,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', selectedMaterial.id)
                .eq('store_id', user!.store_id);

            await fetchMaterials();
            setShowStockModal(false);
            setStockData({ total_price: 0, portions: 1, notes: '' });
        } catch (error) {
            console.error('Error adding stock:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingMaterial(null);
        setFormData({
            name: '',
            unit: 'gram',
            current_stock: 0,
            average_cost: 0,
            bulk_price: 0,
            min_stock: 0,
        });
    };

    const handleEdit = (material: Material) => {
        setEditingMaterial(material);
        setFormData({
            name: material.name,
            unit: material.unit,
            current_stock: material.current_stock,
            average_cost: material.average_cost,
            bulk_price: material.bulk_price || 0,
            min_stock: material.min_stock,
        });
        setShowModal(true);
    };

    const handleAddStock = (material: Material) => {
        setSelectedMaterial(material);
        setShowStockModal(true);
    };

    const columns = [
        { key: 'name', label: 'Nama Bahan' },
        {
            key: 'current_stock',
            label: 'Stok',
            align: 'right' as const,
            render: (value: number, row: Material) => (
                <span className={row.current_stock <= row.min_stock ? 'text-red-600 dark:text-red-400 font-semibold' : (darkMode ? 'text-slate-300' : 'text-slate-900')}>
                    {value.toFixed(2)} {row.unit}
                </span>
            ),
        },
        {
            key: 'bulk_price',
            label: 'Harga Belanja',
            align: 'right' as const,
            render: (value: number) => `Rp ${(value || 0).toLocaleString('id-ID')}`,
        },
        {
            key: 'average_cost',
            label: 'Harga per Porsi',
            align: 'right' as const,
            render: (value: number) => `Rp ${value.toLocaleString('id-ID')}`,
        },
        {
            key: 'min_stock',
            label: 'Min. Stok',
            align: 'right' as const,
            render: (value: number, row: Material) => `${value} ${row.unit}`,
        },
        {
            key: 'actions',
            label: 'Aksi',
            align: 'center' as const,
            render: (_: any, row: Material) => (
                <div className="flex items-center justify-center gap-2">
                    <button
                        onClick={() => handleAddStock(row)}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                        title="Stok Masuk"
                    >
                        <TrendingUp size={18} />
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
                <Card className="dark:bg-gradient-to-br dark:from-blue-900/20 dark:to-cyan-900/20 border-slate-200 dark:border-blue-800/50">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl shadow-sm ${darkMode ? 'bg-blue-600 shadow-blue-500/20 text-white' : 'bg-blue-100 text-blue-600'}`}>
                            <Package size={24} />
                        </div>
                        <div>
                            <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-700'}`}>Total Bahan Baku</p>
                            <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-black'}`}>{materials.length}</p>
                        </div>
                    </div>
                </Card>

                <Card className="dark:bg-gradient-to-br dark:from-amber-900/20 dark:to-orange-900/20 border-slate-200 dark:border-amber-800/50">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl shadow-sm ${darkMode ? 'bg-amber-600 shadow-amber-500/20 text-white' : 'bg-amber-100 text-amber-600'}`}>
                            <TrendingDown size={24} />
                        </div>
                        <div>
                            <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-700'}`}>Stok Menipis</p>
                            <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-black'}`}>
                                {materials.filter((m) => m.current_stock <= m.min_stock).length}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="dark:bg-gradient-to-br dark:from-emerald-900/20 dark:to-teal-900/20 border-slate-200 dark:border-emerald-800/50">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl shadow-sm ${darkMode ? 'bg-emerald-600 shadow-emerald-500/20 text-white' : 'bg-emerald-100 text-emerald-600'}`}>
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-700'}`}>Nilai Modal</p>
                            <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-black'}`}>
                                Rp {materials.reduce((sum, m) => sum + (m.bulk_price || 0), 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            <Card
                title="Daftar Bahan Baku"
                action={
                    <Button onClick={() => setShowModal(true)} size="sm">
                        <Plus size={18} className="mr-1" />
                        Tambah Bahan
                    </Button>
                }
            >
                <Table columns={columns} data={materials} emptyMessage="Belum ada bahan baku" />
            </Card>

            <Modal
                isOpen={showModal}
                onClose={handleCloseModal}
                title={editingMaterial ? 'Edit Bahan Baku' : 'Tambah Bahan Baku'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Nama Bahan"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />

                    <Select
                        label="Satuan"
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        options={UNITS}
                        required
                    />

                    <Input
                        label="Stok Awal / Satuan Perporsi"
                        type="number"
                        step="1"
                        value={formData.current_stock}
                        onChange={(e) => setFormData({ ...formData, current_stock: parseFloat(e.target.value) || 0 })}
                    />
                    <p className={`text-xs -mt-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Jumlah porsi/potong dari bahan yang dibeli (misal: 10 potong ayam)</p>

                    <Input
                        label="Harga Belanja"
                        type="number"
                        step="1"
                        value={formData.bulk_price}
                        onChange={(e) => setFormData({ ...formData, bulk_price: parseFloat(e.target.value) || 0 })}
                    />
                    <p className={`text-xs -mt-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Harga total beli bahan (misal: Rp 38.000 untuk 1 ekor ayam)</p>

                    {/* Harga per Porsi — auto-calculated */}
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            Harga per Porsi
                        </label>
                        <div className={`w-full px-4 py-3 rounded-xl border text-lg font-bold ${darkMode
                            ? 'bg-emerald-900/20 border-emerald-700/50 text-emerald-400'
                            : 'bg-emerald-50 border-emerald-300 text-emerald-700'
                        }`}>
                            Rp {calculatedCostPerPortion.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                        </div>
                        <p className={`text-xs mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            = Rp {(formData.bulk_price || 0).toLocaleString('id-ID')} ÷ {formData.current_stock || 0} porsi — dipakai untuk perhitungan HPP di penjualan
                        </p>
                    </div>

                    <Input
                        label="Minimum Stok"
                        type="number"
                        step="0.01"
                        value={formData.min_stock}
                        onChange={(e) => setFormData({ ...formData, min_stock: parseFloat(e.target.value) || 0 })}
                    />

                    <div className="flex gap-2 justify-end pt-4">
                        <Button type="button" variant="secondary" onClick={handleCloseModal}>
                            Batal
                        </Button>
                        <Button type="submit" loading={loading}>
                            {editingMaterial ? 'Update' : 'Simpan'}
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={showStockModal}
                onClose={() => setShowStockModal(false)}
                title={`Stok Masuk - ${selectedMaterial?.name}`}
            >
                <form onSubmit={handleStockIn} className="space-y-4">
                    <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border dark:border-slate-600">
                        <p className="text-sm text-slate-600 dark:text-slate-400">Stok Saat Ini</p>
                        <p className="text-xl font-bold text-slate-800 dark:text-white">
                            {selectedMaterial?.current_stock.toFixed(2)} {selectedMaterial?.unit}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">Harga per Porsi Saat Ini</p>
                        <p className="text-lg font-semibold text-slate-800 dark:text-white">
                            Rp {selectedMaterial?.average_cost.toLocaleString('id-ID')}
                        </p>
                    </div>

                    <Input
                        label="Harga Beli Total"
                        type="number"
                        step="1"
                        value={stockData.total_price}
                        onChange={(e) => setStockData({ ...stockData, total_price: parseFloat(e.target.value) || 0 })}
                        required
                    />
                    <p className={`text-xs -mt-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Contoh: Rp 38.000 untuk 1 ekor ayam</p>

                    <Input
                        label="Jumlah Potong / Porsi"
                        type="number"
                        step="1"
                        value={stockData.portions}
                        onChange={(e) => setStockData({ ...stockData, portions: parseInt(e.target.value) || 1 })}
                        required
                    />
                    <p className={`text-xs -mt-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Contoh: 1 ekor ayam dipotong jadi 10 pcs</p>

                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg border border-emerald-100 dark:border-emerald-800/30 space-y-2">
                        <div className="flex justify-between">
                            <span className="text-sm text-slate-600 dark:text-slate-400">Harga per Potong/Porsi</span>
                            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                Rp {stockData.portions > 0 ? (stockData.total_price / stockData.portions).toLocaleString('id-ID', { maximumFractionDigits: 0 }) : '0'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-slate-600 dark:text-slate-400">Stok yang ditambahkan</span>
                            <span className="text-sm font-semibold text-slate-800 dark:text-white">
                                +{stockData.portions} {selectedMaterial?.unit}
                            </span>
                        </div>
                    </div>

                    <Input
                        label="Catatan (Opsional)"
                        value={stockData.notes}
                        onChange={(e) => setStockData({ ...stockData, notes: e.target.value })}
                    />

                    <div className="flex gap-2 justify-end pt-4">
                        <Button type="button" variant="secondary" onClick={() => setShowStockModal(false)}>
                            Batal
                        </Button>
                        <Button type="submit" loading={loading} variant="success">
                            Tambah Stok
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
