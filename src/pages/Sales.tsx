import { useState, useEffect } from 'react';
import { Plus, ShoppingCart, Eye, Trash2, Receipt } from 'lucide-react';
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
import POSCashier from './POSCashier';

type Sale = Database['public']['Tables']['sales']['Row'];
type Product = Database['public']['Tables']['products']['Row'];

interface SaleWithItems extends Sale {
    sale_items: Array<{
        id: string;
        product_id: string;
        quantity: number;
        selling_price: number;
        actual_hpp: number;
        margin: number;
        products?: Product;
    }>;
}

interface SaleItem {
    product_id: string;
    quantity: number;
    selling_price: number;
}

export default function Sales() {
    const { user } = useAuth();
    const { darkMode } = useTheme();
    const [sales, setSales] = useState<SaleWithItems[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedSale, setSelectedSale] = useState<SaleWithItems | null>(null);
    const [showPOS, setShowPOS] = useState(false);

    const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [saleItems, setSaleItems] = useState<SaleItem[]>([
        { product_id: '', quantity: 1, selling_price: 0 },
    ]);

    useEffect(() => {
        if (user) {
            fetchSales();
            fetchProducts();
        }
    }, [user]);

    const fetchSales = async () => {
        if (!user) return;
        const { data, error } = await supabase
            .from('sales')
            .select('*, sale_items(*, products(*))')
            .eq('store_id', user.store_id)
            .order('sale_date', { ascending: false });

        if (!error && data) {
            setSales(data as SaleWithItems[]);
        }
    };

    const fetchProducts = async () => {
        if (!user) return;
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('store_id', user.store_id)
            .eq('is_active', true)
            .order('name');

        if (!error && data) {
            setProducts(data);
        }
    };

    const calculateHPPForProduct = async (productId: string, quantity: number) => {
        const { data: recipes } = await supabase
            .from('recipes')
            .select('material_id, quantity_needed, yield_portions')
            .eq('product_id', productId)
            .eq('store_id', user!.store_id);

        if (!recipes || recipes.length === 0) return 0;

        let totalCost = 0;
        const yieldPortions = recipes[0].yield_portions || 1;
        const quantityMultiplier = quantity / yieldPortions;

        for (const recipe of recipes) {
            const { data: material } = await supabase
                .from('materials')
                .select('average_cost')
                .eq('id', recipe.material_id)
                .eq('store_id', user!.store_id)
                .single();

            if (material) {
                totalCost += recipe.quantity_needed * material.average_cost * quantityMultiplier;
            }
        }

        return totalCost;
    };

    const deductMaterialStock = async (productId: string, quantity: number, saleId: string) => {
        const { data: recipes } = await supabase
            .from('recipes')
            .select('material_id, quantity_needed, yield_portions')
            .eq('product_id', productId)
            .eq('store_id', user!.store_id);

        if (!recipes) return;

        const yieldPortions = recipes[0]?.yield_portions || 1;
        const quantityMultiplier = quantity / yieldPortions;

        for (const recipe of recipes) {
            const materialNeeded = recipe.quantity_needed * quantityMultiplier;

            const { data: material } = await supabase
                .from('materials')
                .select('*')
                .eq('id', recipe.material_id)
                .eq('store_id', user!.store_id)
                .single();

            if (material) {
                const newStock = material.current_stock - materialNeeded;

                await supabase
                    .from('materials')
                    .update({
                        current_stock: newStock,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', material.id)
                    .eq('store_id', user!.store_id);

                await supabase.from('material_transactions').insert([
                    {
                        store_id: user!.store_id,
                        material_id: material.id,
                        transaction_type: 'OUT',
                        quantity: materialNeeded,
                        cost_per_unit: material.average_cost,
                        total_cost: materialNeeded * material.average_cost,
                        reference_type: 'SALE',
                        reference_id: saleId,
                    },
                ]);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const validItems = saleItems.filter((item) => item.product_id && item.quantity > 0);

            if (validItems.length === 0) {
                alert('Tambahkan minimal satu item penjualan');
                setLoading(false);
                return;
            }

            const saleNumber = `SALE-${Date.now()}`;
            const totalAmount = validItems.reduce((sum, item) => sum + item.quantity * item.selling_price, 0);

            const { data: saleData, error: saleError } = await supabase
                .from('sales')
                .insert([
                    {
                        store_id: user!.store_id,
                        sale_number: saleNumber,
                        sale_date: saleDate,
                        total_amount: totalAmount,
                        notes: notes,
                    },
                ])
                .select()
                .single();

            if (saleError || !saleData) {
                console.error('Error creating sale:', saleError);
                setLoading(false);
                return;
            }

            let totalHPP = 0;

            for (const item of validItems) {
                const actualHPP = await calculateHPPForProduct(item.product_id, item.quantity);
                const margin = item.quantity * item.selling_price - actualHPP;

                await supabase.from('sale_items').insert([
                    {
                        store_id: user!.store_id,
                        sale_id: saleData.id,
                        product_id: item.product_id,
                        quantity: item.quantity,
                        selling_price: item.selling_price,
                        actual_hpp: actualHPP,
                        margin: margin,
                    },
                ]);

                await deductMaterialStock(item.product_id, item.quantity, saleData.id);

                totalHPP += actualHPP;
            }

            await supabase
                .from('sales')
                .update({
                    total_hpp: totalHPP,
                    total_margin: totalAmount - totalHPP,
                })
                .eq('id', saleData.id)
                .eq('store_id', user!.store_id);

            await fetchSales();
            handleCloseModal();
        } catch (error) {
            console.error('Error saving sale:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Yakin ingin menghapus transaksi penjualan ini? Stok bahan tidak akan dikembalikan.')) return;

        await supabase.from('sales').delete().eq('id', id).eq('store_id', user!.store_id);
        await fetchSales();
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSaleDate(new Date().toISOString().split('T')[0]);
        setNotes('');
        setSaleItems([{ product_id: '', quantity: 1, selling_price: 0 }]);
    };

    const addSaleItem = () => {
        setSaleItems([...saleItems, { product_id: '', quantity: 1, selling_price: 0 }]);
    };

    const removeSaleItem = (index: number) => {
        setSaleItems(saleItems.filter((_, i) => i !== index));
    };

    const updateSaleItem = (index: number, field: string, value: any) => {
        const updated = [...saleItems];
        updated[index] = { ...updated[index], [field]: value };

        if (field === 'product_id' && value) {
            const product = products.find((p) => p.id === value);
            if (product) {
                updated[index].selling_price = product.selling_price;
            }
        }

        setSaleItems(updated);
    };

    const viewDetail = (sale: SaleWithItems) => {
        setSelectedSale(sale);
        setShowDetailModal(true);
    };

    const columns = [
        {
            key: 'sale_number',
            label: 'No. Penjualan',
        },
        {
            key: 'sale_date',
            label: 'Tanggal',
            render: (value: string) => new Date(value).toLocaleDateString('id-ID'),
        },
        {
            key: 'total_amount',
            label: 'Total Penjualan',
            align: 'right' as const,
            render: (value: number) => `Rp ${value.toLocaleString('id-ID')}`,
        },
        {
            key: 'total_hpp',
            label: 'Total HPP',
            align: 'right' as const,
            render: (value: number) => `Rp ${value.toLocaleString('id-ID')}`,
        },
        {
            key: 'total_margin',
            label: 'Margin',
            align: 'right' as const,
            render: (value: number, row: Sale) => {
                const marginPct = row.total_amount > 0 ? (value / row.total_amount) * 100 : 0;
                return (
                    <div>
                        <div className="font-semibold text-emerald-600 dark:text-emerald-400">Rp {value.toLocaleString('id-ID')}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{marginPct.toFixed(1)}%</div>
                    </div>
                );
            },
        },
        {
            key: 'actions',
            label: 'Aksi',
            align: 'center' as const,
            render: (_: any, row: SaleWithItems) => (
                <div className="flex items-center justify-center gap-2">
                    <button
                        onClick={() => viewDetail(row)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Lihat Detail"
                    >
                        <Eye size={18} />
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

    const totalSalesToday = sales
        .filter((s) => new Date(s.sale_date).toDateString() === new Date().toDateString())
        .reduce((sum, s) => sum + s.total_amount, 0);

    const totalMarginToday = sales
        .filter((s) => new Date(s.sale_date).toDateString() === new Date().toDateString())
        .reduce((sum, s) => sum + s.total_margin, 0);

    if (showPOS) {
        return <POSCashier onBack={() => { setShowPOS(false); fetchSales(); }} />;
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="dark:bg-gradient-to-br dark:from-blue-900/20 dark:to-cyan-900/20 border-slate-200 dark:border-blue-800/50">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl shadow-sm ${darkMode ? 'bg-gradient-to-r from-blue-600 to-cyan-600 shadow-blue-500/20 text-white' : 'bg-blue-100 text-blue-600'}`}>
                            <ShoppingCart size={24} />
                        </div>
                        <div>
                            <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-700'}`}>Total Transaksi</p>
                            <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-black'}`}>{sales.length}</p>
                        </div>
                    </div>
                </Card>

                <Card className="dark:bg-gradient-to-br dark:from-emerald-900/20 dark:to-teal-900/20 border-slate-200 dark:border-emerald-800/50">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg shadow-lg ${darkMode ? 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-500/20' : 'bg-emerald-600'}`}>
                            <ShoppingCart className="text-white" size={24} />
                        </div>
                        <div>
                            <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-700'}`}>Penjualan Hari Ini</p>
                            <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-black'}`}>
                                Rp {totalSalesToday.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="dark:bg-gradient-to-br dark:from-amber-900/20 dark:to-orange-900/20 border-slate-200 dark:border-amber-800/50">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg shadow-lg ${darkMode ? 'bg-gradient-to-r from-amber-600 to-orange-600 shadow-amber-500/20' : 'bg-amber-600'}`}>
                            <ShoppingCart className="text-white" size={24} />
                        </div>
                        <div>
                            <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-700'}`}>Margin Hari Ini</p>
                            <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-black'}`}>
                                Rp {totalMarginToday.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            <Card
                title="Daftar Penjualan"
                action={
                    <div className="flex gap-2">
                        <Button onClick={() => setShowPOS(true)} size="sm" variant="success">
                            <Receipt size={18} className="mr-1" />
                            Mode Kasir
                        </Button>
                        <Button onClick={() => setShowModal(true)} size="sm">
                            <Plus size={18} className="mr-1" />
                            Transaksi Baru
                        </Button>
                    </div>
                }
            >
                <Table columns={columns} data={sales} emptyMessage="Belum ada transaksi penjualan" />
            </Card>

            <Modal isOpen={showModal} onClose={handleCloseModal} title="Transaksi Penjualan Baru" size="lg">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Tanggal Penjualan"
                        type="date"
                        value={saleDate}
                        onChange={(e) => setSaleDate(e.target.value)}
                        required
                    />

                    <div className="border-t dark:border-slate-700 pt-4">
                        <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-3">Item Penjualan</h4>
                        <div className="space-y-3">
                            {saleItems.map((item, index) => (
                                <div key={index} className="flex gap-2 items-end">
                                    <div className="flex-1">
                                        <Select
                                            label={index === 0 ? 'Produk' : ''}
                                            value={item.product_id}
                                            onChange={(e) => updateSaleItem(index, 'product_id', e.target.value)}
                                            options={[
                                                { value: '', label: '-- Pilih Produk --' },
                                                ...products.map((p) => ({ value: p.id, label: p.name })),
                                            ]}
                                            required
                                        />
                                    </div>
                                    <div className="w-24">
                                        <Input
                                            label={index === 0 ? 'Qty' : ''}
                                            type="number"
                                            step="0.01"
                                            value={item.quantity}
                                            onChange={(e) => updateSaleItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                                            required
                                        />
                                    </div>
                                    <div className="w-36">
                                        <Input
                                            label={index === 0 ? 'Harga' : ''}
                                            type="number"
                                            step="0.01"
                                            value={item.selling_price}
                                            onChange={(e) => updateSaleItem(index, 'selling_price', parseFloat(e.target.value) || 0)}
                                            required
                                        />
                                    </div>
                                    <div className="w-32 text-right">
                                        {index === 0 && <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Subtotal</label>}
                                        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 border dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200">
                                            Rp {(item.quantity * item.selling_price).toLocaleString('id-ID')}
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="danger"
                                        size="sm"
                                        onClick={() => removeSaleItem(index)}
                                        disabled={saleItems.length === 1}
                                        className="mb-0.5"
                                    >
                                        <Trash2 size={16} />
                                    </Button>
                                </div>
                            ))}
                        </div>

                        <Button type="button" variant="secondary" onClick={addSaleItem} size="sm" className="mt-3">
                            <Plus size={16} className="mr-1" />
                            Tambah Item
                        </Button>
                    </div>

                    <div className="bg-slate-50 dark:bg-gradient-to-r dark:from-blue-900/20 dark:to-cyan-900/20 p-4 rounded-xl border dark:border-blue-800/30">
                        <div className="flex justify-between items-center">
                            <span className="text-lg font-semibold text-slate-700 dark:text-slate-300">Total Penjualan</span>
                            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                Rp {saleItems.reduce((sum, item) => sum + item.quantity * item.selling_price, 0).toLocaleString('id-ID')}
                            </span>
                        </div>
                    </div>

                    <Input
                        label="Catatan (Opsional)"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />

                    <div className="flex gap-2 justify-end pt-4 border-t dark:border-slate-700">
                        <Button type="button" variant="secondary" onClick={handleCloseModal}>
                            Batal
                        </Button>
                        <Button type="submit" loading={loading} variant="success">
                            Simpan Penjualan
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={showDetailModal}
                onClose={() => setShowDetailModal(false)}
                title={`Detail Penjualan - ${selectedSale?.sale_number}`}
                size="lg"
            >
                {selectedSale && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Tanggal</p>
                                <p className="font-semibold text-slate-800 dark:text-slate-200">{new Date(selectedSale.sale_date).toLocaleDateString('id-ID')}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-600 dark:text-slate-400">No. Penjualan</p>
                                <p className="font-semibold text-slate-800 dark:text-slate-200">{selectedSale.sale_number}</p>
                            </div>
                        </div>

                        {selectedSale.notes && (
                            <div>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Catatan</p>
                                <p className="font-semibold text-slate-800 dark:text-slate-200">{selectedSale.notes}</p>
                            </div>
                        )}

                        <div className="border dark:border-slate-700 rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-700/50">
                                    <tr className="text-slate-600 dark:text-slate-300">
                                        <th className="text-left p-3 font-semibold">Produk</th>
                                        <th className="text-right p-3 font-semibold">Qty</th>
                                        <th className="text-right p-3 font-semibold">Harga</th>
                                        <th className="text-right p-3 font-semibold">HPP</th>
                                        <th className="text-right p-3 font-semibold">Margin</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y dark:divide-slate-700">
                                    {selectedSale.sale_items.map((item) => (
                                        <tr key={item.id} className="text-slate-700 dark:text-slate-300">
                                            <td className="p-3">{item.products?.name}</td>
                                            <td className="text-right p-3">{item.quantity}</td>
                                            <td className="text-right p-3">Rp {item.selling_price.toLocaleString('id-ID')}</td>
                                            <td className="text-right p-3 text-slate-500 dark:text-slate-400">Rp {item.actual_hpp.toLocaleString('id-ID')}</td>
                                            <td className="text-right p-3 text-emerald-600 dark:text-emerald-400 font-semibold">
                                                Rp {item.margin.toLocaleString('id-ID')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="bg-slate-50 dark:bg-gradient-to-r dark:from-blue-900/20 dark:to-cyan-900/20 p-4 rounded-xl border dark:border-blue-800/30 space-y-2">
                            <div className="flex justify-between text-slate-700 dark:text-slate-300">
                                <span>Total Penjualan</span>
                                <span className="font-bold">Rp {selectedSale.total_amount.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between text-slate-500 dark:text-slate-400 text-sm">
                                <span>Total HPP</span>
                                <span>Rp {selectedSale.total_hpp.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between text-lg border-t dark:border-slate-700 pt-2 text-slate-800 dark:text-white">
                                <span className="font-semibold">Total Margin</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                    Rp {selectedSale.total_margin.toLocaleString('id-ID')} ({((selectedSale.total_margin / selectedSale.total_amount) * 100).toFixed(1)}%)
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
