import { useState, useEffect } from 'react';
import {
    TrendingUp,
    Package,
    ShoppingCart,
    AlertTriangle,
    DollarSign,
    BarChart3,
    Image as ImageIcon,
    ArrowRight
} from 'lucide-react';
import Card from '../components/Card';
import Table from '../components/Table';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

type Material = Database['public']['Tables']['materials']['Row'];
type Product = Database['public']['Tables']['products']['Row'];
type Sale = Database['public']['Tables']['sales']['Row'];
type WasteRecord = Database['public']['Tables']['waste_records']['Row'];

interface ProductWithSales extends Product {
    total_sold?: number;
    total_revenue?: number;
    total_hpp?: number;
    total_margin?: number;
}

interface DashboardProps {
    onNavigate?: (page: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps = {}) {
    const { user } = useAuth();
    const { darkMode } = useTheme();
    const [materials, setMaterials] = useState<Material[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);
    const [wasteRecords, setWasteRecords] = useState<WasteRecord[]>([]);
    const [productPerformance, setProductPerformance] = useState<ProductWithSales[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchDashboardData();
        }
    }, [user]);

    const fetchDashboardData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [materialsRes, productsRes, salesRes, wasteRes] = await Promise.all([
                supabase.from('materials').select('*').eq('store_id', user.store_id),
                supabase.from('products').select('*').eq('store_id', user.store_id),
                supabase.from('sales').select('*').eq('store_id', user.store_id),
                supabase.from('waste_records').select('*').eq('store_id', user.store_id),
            ]);

            if (materialsRes.data) setMaterials(materialsRes.data);
            if (salesRes.data) setSales(salesRes.data);
            if (wasteRes.data) setWasteRecords(wasteRes.data);

            if (productsRes.data) {
                const performanceData = await Promise.all(
                    productsRes.data.map(async (product) => {
                        const { data: saleItems } = await supabase
                            .from('sale_items')
                            .select('quantity, selling_price, actual_hpp, margin')
                            .eq('product_id', product.id)
                            .eq('store_id', user.store_id);

                        const totalSold = saleItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;
                        const totalRevenue = saleItems?.reduce((sum, item) => sum + item.quantity * item.selling_price, 0) || 0;
                        const totalHPP = saleItems?.reduce((sum, item) => sum + item.actual_hpp, 0) || 0;
                        const totalMargin = saleItems?.reduce((sum, item) => sum + item.margin, 0) || 0;

                        return {
                            ...product,
                            total_sold: totalSold,
                            total_revenue: totalRevenue,
                            total_hpp: totalHPP,
                            total_margin: totalMargin,
                        };
                    })
                );

                setProductPerformance(performanceData.sort((a, b) => (b.total_revenue || 0) - (a.total_revenue || 0)));
            }
        } finally {
            setLoading(false);
        }
    };

    const totalInventoryValue = materials.reduce(
        (sum, m) => sum + (m.bulk_price || 0),
        0
    );

    const totalRevenue = sales.reduce((sum, s) => sum + s.total_amount, 0);
    const totalHPP = sales.reduce((sum, s) => sum + s.total_hpp, 0);
    const totalMargin = sales.reduce((sum, s) => sum + s.total_margin, 0);
    const totalWasteLoss = wasteRecords.reduce((sum, w) => sum + w.cost, 0);

    const lowStockMaterials = materials.filter((m) => m.current_stock <= m.min_stock);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const thisMonthSales = sales.filter((s) => new Date(s.created_at) >= thisMonth);
    const thisMonthRevenue = thisMonthSales.reduce((sum, s) => sum + s.total_amount, 0);
    const thisMonthMargin = thisMonthSales.reduce((sum, s) => sum + s.total_margin, 0);

    const materialColumns = [
        { key: 'name', label: 'Nama Bahan' },
        {
            key: 'current_stock',
            label: 'Stok Saat Ini',
            align: 'right' as const,
            render: (value: number, row: Material) => (
                <span className="text-red-600 dark:text-red-400 font-semibold">
                    {value.toFixed(2)} {row.unit}
                </span>
            ),
        },
        {
            key: 'min_stock',
            label: 'Min. Stok',
            align: 'right' as const,
            render: (value: number, row: Material) => `${value} ${row.unit}`,
        },
        {
            key: 'average_cost',
            label: 'Harga per Porsi',
            align: 'right' as const,
            render: (value: number) => `Rp ${value.toLocaleString('id-ID')}`,
        },
    ];

    const productColumns = [
        { key: 'name', label: 'Produk' },
        {
            key: 'total_sold',
            label: 'Terjual',
            align: 'right' as const,
            render: (value: number) => `${value} porsi`,
        },
        {
            key: 'total_revenue',
            label: 'Revenue',
            align: 'right' as const,
            render: (value: number) => `Rp ${value.toLocaleString('id-ID')}`,
        },
        {
            key: 'total_margin',
            label: 'Margin',
            align: 'right' as const,
            render: (value: number, row: ProductWithSales) => (
                <div className="text-right">
                    <p className="font-semibold text-green-600 dark:text-green-400">
                        Rp {value.toLocaleString('id-ID')}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {((value / (row.total_revenue || 1)) * 100).toFixed(1)}% margin
                    </p>
                </div>
            ),
        },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-slate-600 dark:text-slate-400">Loading dashboard...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {(user?.role === 'admin' || user?.role === 'superadmin') && (
                <div 
                    onClick={() => onNavigate?.('manage-banners')}
                    className={`relative overflow-hidden rounded-2xl cursor-pointer group shadow-sm hover:shadow-md transition-all ${
                        darkMode ? 'bg-gradient-to-r from-blue-900/60 to-indigo-900/60 border border-blue-800/50' : 'bg-gradient-to-r from-blue-600 to-indigo-600'
                    }`}
                >
                    <div className="absolute inset-0 pattern-overlay opacity-10" />
                    <div className="relative p-6 sm:p-8 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-white">
                                <ImageIcon size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white mb-1">Kelola Banner Promo</h3>
                                <p className="text-blue-100 text-sm">Atur banner promosi yang tampil di halaman utama pelanggan</p>
                            </div>
                        </div>
                        <div className="hidden sm:flex items-center justify-center w-10 h-10 bg-white/10 rounded-full text-white group-hover:bg-white/20 group-hover:translate-x-1 transition-all">
                            <ArrowRight size={20} />
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="dark:bg-gradient-to-br dark:from-blue-900/20 dark:to-cyan-900/20 border-slate-200 dark:border-blue-800/50 transition-all duration-300">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl shadow-sm ${darkMode ? 'bg-gradient-to-r from-blue-600 to-cyan-600 shadow-blue-500/20 text-white' : 'bg-blue-100 text-blue-600'}`}>
                            <Package size={24} />
                        </div>
                        <div className="min-w-0">
                            <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-700'}`}>Nilai Modal</p>
                            <p className={`text-xl font-bold truncate ${darkMode ? 'text-white' : 'text-black'}`}>
                                Rp {totalInventoryValue.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="dark:bg-gradient-to-br dark:from-emerald-900/20 dark:to-teal-900/20 border-slate-200 dark:border-emerald-800/50 transition-all duration-300">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl shadow-sm ${darkMode ? 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-500/20 text-white' : 'bg-emerald-100 text-emerald-600'}`}>
                            <DollarSign size={24} />
                        </div>
                        <div className="min-w-0">
                            <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-700'}`}>Total Revenue</p>
                            <p className={`text-xl font-bold truncate ${darkMode ? 'text-white' : 'text-black'}`}>
                                Rp {totalRevenue.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="dark:bg-gradient-to-br dark:from-purple-900/20 dark:to-pink-900/20 border-slate-200 dark:border-purple-800/50 transition-all duration-300">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl shadow-sm ${darkMode ? 'bg-gradient-to-r from-purple-600 to-pink-600 shadow-purple-500/20 text-white' : 'bg-purple-100 text-purple-600'}`}>
                            <TrendingUp size={24} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-700'}`}>Total Margin</p>
                            <p className={`text-xl font-bold truncate ${darkMode ? 'text-white' : 'text-black'}`}>
                                Rp {totalMargin.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                {totalRevenue > 0 ? ((totalMargin / totalRevenue) * 100).toFixed(1) : 0}% dari revenue
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="dark:bg-gradient-to-br dark:from-amber-900/20 dark:to-orange-900/20 border-slate-200 dark:border-amber-800/50 transition-all duration-300">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl shadow-sm ${darkMode ? 'bg-gradient-to-r from-amber-600 to-orange-600 shadow-amber-500/20 text-white' : 'bg-amber-100 text-amber-600'}`}>
                            <AlertTriangle size={24} />
                        </div>
                        <div className="min-w-0">
                            <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-700'}`}>Stok Menipis</p>
                            <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-black'}`}>{lowStockMaterials.length}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">bahan perlu restock</p>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="dark:bg-gradient-to-br dark:from-slate-800 dark:to-slate-900 border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${darkMode ? 'bg-gradient-to-r from-slate-600 to-slate-700' : 'bg-slate-600'}`}>
                            <ShoppingCart className="text-white" size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-700'}`}>Revenue Bulan Ini</p>
                            <p className={`text-2xl font-bold truncate ${darkMode ? 'text-white' : 'text-black'}`}>
                                Rp {thisMonthRevenue.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                            </p>
                            <p className="text-sm text-green-600 dark:text-green-400 font-semibold">
                                Margin: Rp {thisMonthMargin.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="dark:bg-gradient-to-br dark:from-red-900/20 dark:to-rose-900/20 border-slate-200 dark:border-red-800/50">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${darkMode ? 'bg-gradient-to-r from-red-600 to-rose-600' : 'bg-red-600'}`}>
                            <AlertTriangle className="text-white" size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-700'}`}>Total Kerugian (Waste)</p>
                            <p className={`text-2xl font-bold truncate ${darkMode ? 'text-white' : 'text-black'}`}>
                                Rp {totalWasteLoss.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{wasteRecords.length} record waste</p>
                        </div>
                    </div>
                </Card>
            </div>

            {lowStockMaterials.length > 0 && (
                <Card
                    title="⚠️ Bahan Baku Stok Menipis"
                    className="border-2 border-amber-300 dark:border-amber-700"
                >
                    <Table
                        columns={materialColumns}
                        data={lowStockMaterials}
                        emptyMessage="Semua stok aman"
                    />
                </Card>
            )}

            <Card
                title="Performa Produk"
                action={
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <BarChart3 size={16} />
                        <span>Diurutkan berdasarkan revenue tertinggi</span>
                    </div>
                }
            >
                <Table
                    columns={productColumns}
                    data={productPerformance.filter((p) => (p.total_sold || 0) > 0)}
                    emptyMessage="Belum ada data penjualan"
                />
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Ringkasan HPP">
                    <div className="space-y-3">
                        <div className="flex justify-between items-center pb-2 border-b dark:border-slate-700">
                            <span className="text-slate-600 dark:text-slate-400">Total Revenue</span>
                            <span className="font-semibold text-slate-800 dark:text-white">
                                Rp {totalRevenue.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                            </span>
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b dark:border-slate-700">
                            <span className="text-slate-600 dark:text-slate-400">Total HPP</span>
                            <span className="font-semibold text-slate-800 dark:text-white">
                                Rp {totalHPP.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                            </span>
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b dark:border-slate-700">
                            <span className={darkMode ? 'text-slate-400' : 'text-slate-700'}>Gross Margin</span>
                            <span className="font-semibold text-green-600 dark:text-green-400">
                                Rp {totalMargin.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                            </span>
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b dark:border-slate-700">
                            <span className="text-slate-600 dark:text-slate-400">Waste Loss</span>
                            <span className="font-semibold text-red-600 dark:text-red-400">
                                Rp {totalWasteLoss.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                            </span>
                        </div>
                        <div className={`flex justify-between items-center pt-2 p-3 rounded-lg border focus-within:ring-2 transition-all ${
                            darkMode ? 'bg-gradient-to-r from-blue-900/20 to-cyan-900/20 border-blue-800/30' : 'bg-slate-50 border-slate-200'
                        }`}>
                            <span className={`font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-900'}`}>Net Margin</span>
                            <span className={`font-bold text-lg ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                Rp {(totalMargin - totalWasteLoss).toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                            </span>
                        </div>
                        <div className="pt-2">
                            <div className="flex justify-between items-center text-sm mb-1">
                                <span className={darkMode ? 'text-slate-400' : 'text-slate-700'}>Margin Percentage</span>
                                <span className={`font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>
                                    {totalRevenue > 0 ? ((totalMargin / totalRevenue) * 100).toFixed(2) : 0}%
                                </span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full transition-all duration-500 ${darkMode ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-emerald-500'}`}
                                    style={{
                                        width: `${totalRevenue > 0 ? Math.min((totalMargin / totalRevenue) * 100, 100) : 0}%`,
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
