import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Download, Calendar, TrendingUp, DollarSign, Package } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Select from '../components/Select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

type TimeRange = 'today' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export default function Analytics() {
    const { user } = useAuth();
    const [salesData, setSalesData] = useState<any[]>([]);
    const [menuStats, setMenuStats] = useState<any[]>([]);
    const [rawSales, setRawSales] = useState<any[]>([]);
    const [timeRange, setTimeRange] = useState<TimeRange>('today');
    const [customStartDate, setCustomStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0]);
    const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (user) {
            fetchAnalyticsData();
        }
    }, [user, timeRange, customStartDate, customEndDate]);

    const fetchAnalyticsData = async () => {
        setLoading(true);
        try {
            // Fetch all completed sales for the store
            const { data: sales, error: salesError } = await supabase
                .from('sales')
                .select('*, sale_items(*, products(name))')
                .eq('store_id', user!.store_id)
                .order('sale_date', { ascending: true });

            if (salesError) throw salesError;

            // 1. Process Sales Data over time
            const groupedSales: Record<string, { date: string; label: string; total: number; margin: number; count: number }> = {};
            const menus: Record<string, { id: string; name: string; quantity: number; revenue: number; margin: number }> = {};

            const now = new Date();
            let startDate = new Date();

            if (timeRange === 'today') {
                startDate.setHours(0, 0, 0, 0); // Start of today
            } else if (timeRange === 'daily') {
                startDate.setDate(now.getDate() - 30); // Last 30 days
            } else if (timeRange === 'weekly') {
                startDate.setMonth(now.getMonth() - 3); // Last ~12 weeks
            } else if (timeRange === 'monthly') {
                startDate.setFullYear(now.getFullYear() - 1); // Last 12 months
            } else if (timeRange === 'yearly') {
                startDate.setFullYear(now.getFullYear() - 5); // Last 5 years
            } else if (timeRange === 'custom') {
                startDate = new Date(customStartDate);
                startDate.setHours(0, 0, 0, 0);
            }

            let endDate = new Date();
            if (timeRange === 'custom') {
                endDate = new Date(customEndDate);
                endDate.setHours(23, 59, 59, 999);
            }

            const filteredSales = sales?.filter(s => {
                const sDate = new Date(s.sale_date);
                return sDate >= startDate && sDate <= endDate;
            }) || [];
            setRawSales(filteredSales.sort((a,b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime()));

            filteredSales.forEach(sale => {
                const date = new Date(sale.sale_date);
                let key = '';
                let label = '';

                if (timeRange === 'today' || timeRange === 'daily' || timeRange === 'custom') {
                    key = sale.sale_date;
                    label = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                } else if (timeRange === 'weekly') {
                    // Get week number
                    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
                    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
                    const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
                    key = `${date.getFullYear()}-W${weekNum}`;
                    label = `Minggu ${weekNum}, ${date.getFullYear()}`;
                } else if (timeRange === 'monthly') {
                    key = `${date.getFullYear()}-${date.getMonth()}`;
                    label = date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
                } else {
                    key = `${date.getFullYear()}`;
                    label = `${date.getFullYear()}`;
                }

                if (!groupedSales[key]) {
                    groupedSales[key] = { date: sale.sale_date, label, total: 0, margin: 0, count: 0 };
                }
                groupedSales[key].total += sale.total_amount;
                groupedSales[key].margin += sale.total_margin;
                groupedSales[key].count += 1;

                // Process Menu Stats
                sale.sale_items?.forEach((item: any) => {
                    const productId = item.product_id;
                    const productName = item.products?.name || 'Unknown';
                    if (!menus[productId]) {
                        menus[productId] = { id: productId, name: productName, quantity: 0, revenue: 0, margin: 0 };
                    }
                    menus[productId].quantity += item.quantity;
                    menus[productId].revenue += (item.quantity * item.selling_price);
                    menus[productId].margin += item.margin;
                });
            });

            // Sort grouped sales by date ascending
            const chartData = Object.values(groupedSales).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            setSalesData(chartData);

            // Sort menus by quantity descending
            const topMenus = Object.values(menus).sort((a, b) => b.quantity - a.quantity).slice(0, 10);
            setMenuStats(topMenus);

        } catch (error) {
            console.error("Failed to fetch analytics", error);
        } finally {
            setLoading(false);
        }
    };

    const handleExportPDF = async () => {
        setExporting(true);
        try {
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            
            // Title
            doc.setFontSize(20);
            doc.text('Laporan Penjualan Citra Rasa', pageWidth / 2, 15, { align: 'center' });
            
            doc.setFontSize(12);
            const periodLabel = timeRange === 'today' ? 'Hari Ini' :
                                timeRange === 'daily' ? 'Harian (30 Hari Terakhir)' : 
                                timeRange === 'weekly' ? 'Mingguan (3 Bulan Terakhir)' : 
                                timeRange === 'monthly' ? 'Bulanan (1 Tahun Terakhir)' : 
                                timeRange === 'custom' ? `Custom (${new Date(customStartDate).toLocaleDateString('id-ID')} - ${new Date(customEndDate).toLocaleDateString('id-ID')})` : 'Tahunan';
            doc.text(`Periode: ${periodLabel}`, pageWidth / 2, 22, { align: 'center' });
            doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, pageWidth / 2, 28, { align: 'center' });

            // Charts to Image
            if (reportRef.current) {
                const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, logging: false });
                const imgData = canvas.toDataURL('image/png');
                
                // Calculate dimension to fit A4 width
                const imgWidth = pageWidth - 20;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                
                doc.addImage(imgData, 'PNG', 10, 35, imgWidth, imgHeight);
                
                let currentY = 35 + imgHeight + 10;
                if (currentY > 250) {
                    doc.addPage();
                    currentY = 20;
                }

                // Top Menus Table
                doc.setFontSize(14);
                doc.text('Menu Terfavorit', 14, currentY);
                currentY += 5;

                const menuBody = menuStats.map((m, i) => [
                    i + 1,
                    m.name,
                    m.quantity,
                    `Rp ${m.revenue.toLocaleString('id-ID')}`,
                    `Rp ${m.margin.toLocaleString('id-ID')}`
                ]);

                autoTable(doc, {
                    startY: currentY,
                    head: [['No', 'Nama Menu', 'Terjual (Porsi)', 'Pendapatan', 'Keuntungan']],
                    body: menuBody,
                    theme: 'grid',
                    headStyles: { fillColor: [16, 185, 129] }
                });

                currentY = (doc as any).lastAutoTable.finalY + 15;
                if (currentY > 250) {
                    doc.addPage();
                    currentY = 20;
                }

                // Raw Sales Table
                doc.setFontSize(14);
                doc.text('Rincian Transaksi', 14, currentY);
                currentY += 5;

                const salesBody = rawSales.slice(0, 100).map((s, i) => [ // Limit 100 on PDF
                    i + 1,
                    new Date(s.sale_date).toLocaleDateString('id-ID'),
                    s.sale_number,
                    `Rp ${s.total_amount.toLocaleString('id-ID')}`,
                    `Rp ${s.total_margin.toLocaleString('id-ID')}`
                ]);

                autoTable(doc, {
                    startY: currentY,
                    head: [['No', 'Tanggal', 'No. Penjualan', 'Total Penjualan', 'Margin']],
                    body: salesBody,
                    theme: 'striped',
                    headStyles: { fillColor: [59, 130, 246] }
                });

                doc.save(`Laporan_Penjualan_${timeRange}_${new Date().getTime()}.pdf`);
            }
        } catch (error) {
            console.error("PDF Export Error", error);
            alert("Gagal mengekspor PDF.");
        } finally {
            setExporting(false);
        }
    };

    const totalRevenue = salesData.reduce((sum, d) => sum + d.total, 0);
    const totalMargin = salesData.reduce((sum, d) => sum + d.margin, 0);

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <TrendingUp className="text-emerald-600" /> Laporan & Analitik
                </h1>
                <div className="flex gap-2 w-full sm:w-auto">
                    <div className="w-40 shrink-0">
                        <Select
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                            options={[
                                { value: 'today', label: 'Hari Ini' },
                                { value: 'daily', label: '30 Hari Terakhir' },
                                { value: 'weekly', label: 'Mingguan' },
                                { value: 'monthly', label: 'Bulanan' },
                                { value: 'yearly', label: 'Tahunan' },
                                { value: 'custom', label: 'Kustom Tanggal' },
                            ]}
                        />
                    </div>
                    {timeRange === 'custom' && (
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none text-slate-800 dark:text-slate-200"
                            />
                            <span className="text-slate-500">-</span>
                            <input
                                type="date"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none text-slate-800 dark:text-slate-200"
                            />
                        </div>
                    )}
                    <Button onClick={handleExportPDF} loading={exporting} className="shrink-0">
                        <Download size={18} className="mr-2" />
                        Export PDF
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-100 dark:border-emerald-800/50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-emerald-600 shadow-lg shadow-emerald-500/30 text-white">
                            <DollarSign size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-400">Total Penjualan (Periode Ini)</p>
                            <p className="text-2xl font-bold text-emerald-950 dark:text-white">
                                Rp {totalRevenue.toLocaleString('id-ID')}
                            </p>
                        </div>
                    </div>
                </Card>
                <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-100 dark:border-blue-800/50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-blue-600 shadow-lg shadow-blue-500/30 text-white">
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-blue-800 dark:text-blue-400">Total Keuntungan/Margin</p>
                            <p className="text-2xl font-bold text-blue-950 dark:text-white">
                                Rp {totalMargin.toLocaleString('id-ID')}
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Chart Area to be exported */}
            <div ref={reportRef} className="space-y-6 bg-slate-50 dark:bg-slate-900 p-2 sm:p-4 rounded-2xl">
                <Card title="Grafik Pencapaian Penjualan">
                    <div className="h-[300px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={salesData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                <XAxis dataKey="label" tick={{fontSize: 12}} />
                                <YAxis yAxisId="left" tickFormatter={(value) => `Rp${(value/1000)}k`} tick={{fontSize: 12}} />
                                <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${value}`} tick={{fontSize: 12}} />
                                <Tooltip formatter={(value: number, name: string) => [name === 'Transaksi' ? value : `Rp ${value.toLocaleString('id-ID')}`, name === 'total' ? 'Penjualan' : name === 'margin' ? 'Keuntungan' : 'Transaksi']} />
                                <Legend />
                                <Line yAxisId="left" type="monotone" dataKey="total" name="Total Penjualan" stroke="#10b981" strokeWidth={3} activeDot={{ r: 8 }} />
                                <Line yAxisId="left" type="monotone" dataKey="margin" name="Keuntungan" stroke="#3b82f6" strokeWidth={3} />
                                <Line yAxisId="right" type="monotone" dataKey="count" name="Jml Transaksi" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card title="Menu Terfavorit (Periode Ini)">
                    <div className="h-[300px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={menuStats} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                <XAxis dataKey="name" tick={{fontSize: 11}} interval={0} angle={-15} textAnchor="end" height={60} />
                                <YAxis tickFormatter={(value) => `${value}`} tick={{fontSize: 12}} />
                                <Tooltip cursor={{fill: 'transparent'}} formatter={(value: number) => [`${value} Porsi`, 'Terjual']} />
                                <Bar dataKey="quantity" fill="#10b981" radius={[4, 4, 0, 0]} name="Terjual (Porsi)" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            <Card title="Rincian Penjualan">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                            <tr>
                                <th className="text-left p-3 font-medium">Tanggal</th>
                                <th className="text-left p-3 font-medium">No. Penjualan</th>
                                <th className="text-right p-3 font-medium">Penjualan</th>
                                <th className="text-right p-3 font-medium">Margin</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {rawSales.map((sale) => (
                                <tr key={sale.id} className="text-slate-700 dark:text-slate-300">
                                    <td className="p-3">{new Date(sale.sale_date).toLocaleDateString('id-ID')}</td>
                                    <td className="p-3">{sale.sale_number}</td>
                                    <td className="p-3 text-right">Rp {sale.total_amount.toLocaleString('id-ID')}</td>
                                    <td className="p-3 text-right font-medium text-emerald-600 dark:text-emerald-400">Rp {sale.total_margin.toLocaleString('id-ID')}</td>
                                </tr>
                            ))}
                            {rawSales.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-4 text-center text-slate-500">Tidak ada data untuk periode ini</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
