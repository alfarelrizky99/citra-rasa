import { useState, useEffect } from 'react';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
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

type WasteRecord = Database['public']['Tables']['waste_records']['Row'];
type Material = Database['public']['Tables']['materials']['Row'];

interface WasteWithMaterial extends WasteRecord {
    materials?: Material;
}

export default function Waste() {
    const { user } = useAuth();
    const { darkMode } = useTheme();
    const [wasteRecords, setWasteRecords] = useState<WasteWithMaterial[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);

    const [formData, setFormData] = useState({
        material_id: '',
        quantity: 0,
        reason: '',
        waste_date: new Date().toISOString().split('T')[0],
    });

    useEffect(() => {
        if (user) {
            fetchWasteRecords();
            fetchMaterials();
        }
    }, [user]);

    const fetchWasteRecords = async () => {
        if (!user) return;
        const { data, error } = await supabase
            .from('waste_records')
            .select('*, materials(*)')
            .eq('store_id', user.store_id)
            .order('waste_date', { ascending: false });

        if (!error && data) {
            setWasteRecords(data as WasteWithMaterial[]);
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const material = materials.find((m) => m.id === formData.material_id);
            if (!material) return;

            const cost = formData.quantity * material.average_cost;

            await supabase.from('waste_records').insert([
                {
                    store_id: user!.store_id,
                    material_id: formData.material_id,
                    quantity: formData.quantity,
                    cost: cost,
                    reason: formData.reason,
                    waste_date: formData.waste_date,
                },
            ]);

            const newStock = material.current_stock - formData.quantity;
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
                    quantity: formData.quantity,
                    cost_per_unit: material.average_cost,
                    total_cost: cost,
                    reference_type: 'WASTE',
                    notes: formData.reason,
                },
            ]);

            await fetchWasteRecords();
            handleCloseModal();
        } catch (error) {
            console.error('Error saving waste record:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, _wasteRecord: WasteWithMaterial) => {
        if (!confirm('Yakin ingin menghapus record waste ini? Stok tidak akan dikembalikan.')) return;

        await supabase.from('waste_records').delete().eq('id', id).eq('store_id', user!.store_id);
        await fetchWasteRecords();
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setFormData({
            material_id: '',
            quantity: 0,
            reason: '',
            waste_date: new Date().toISOString().split('T')[0],
        });
    };

    const columns = [
        {
            key: 'waste_date',
            label: 'Tanggal',
            render: (value: string) => new Date(value).toLocaleDateString('id-ID'),
        },
        {
            key: 'materials',
            label: 'Bahan Baku',
            render: (value: Material) => value?.name || '-',
        },
        {
            key: 'quantity',
            label: 'Jumlah',
            align: 'right' as const,
            render: (value: number, row: WasteWithMaterial) => `${value.toFixed(2)} ${row.materials?.unit || ''}`,
        },
        {
            key: 'cost',
            label: 'Nilai Kerugian',
            align: 'right' as const,
            render: (value: number) => (
                <span className="text-red-600 dark:text-red-400 font-semibold">Rp {value.toLocaleString('id-ID')}</span>
            ),
        },
        {
            key: 'reason',
            label: 'Alasan',
            render: (value: string) => value || '-',
        },
        {
            key: 'actions',
            label: 'Aksi',
            align: 'center' as const,
            render: (_: any, row: WasteWithMaterial) => (
                <div className="flex items-center justify-center gap-2">
                    <button
                        onClick={() => handleDelete(row.id, row)}
                        className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Hapus"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            ),
        },
    ];

    const totalWasteValue = wasteRecords.reduce((sum, w) => sum + w.cost, 0);
    const totalWasteThisMonth = wasteRecords
        .filter((w) => {
            const wasteDate = new Date(w.waste_date);
            const now = new Date();
            return wasteDate.getMonth() === now.getMonth() && wasteDate.getFullYear() === now.getFullYear();
        })
        .reduce((sum, w) => sum + w.cost, 0);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="dark:bg-gradient-to-br dark:from-red-900/20 dark:to-rose-900/20 border-slate-200 dark:border-red-800/50">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl shadow-sm ${darkMode ? 'bg-gradient-to-r from-red-600 to-rose-600 shadow-red-500/20 text-white' : 'bg-red-100 text-red-600'}`}>
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-700'}`}>Total Waste Record</p>
                            <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-black'}`}>{wasteRecords.length}</p>
                        </div>
                    </div>
                </Card>

                <Card className="dark:bg-gradient-to-br dark:from-orange-900/20 dark:to-amber-900/20 border-slate-200 dark:border-orange-800/50">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl shadow-sm ${darkMode ? 'bg-gradient-to-r from-orange-600 to-amber-600 shadow-orange-500/20 text-white' : 'bg-orange-100 text-orange-600'}`}>
                            <Trash2 size={24} />
                        </div>
                        <div>
                            <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-700'}`}>Kerugian Bulan Ini</p>
                            <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-black'}`}>
                                Rp {totalWasteThisMonth.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="dark:bg-gradient-to-br dark:from-slate-800 dark:to-slate-900 border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl shadow-sm ${darkMode ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-700'}`}>Total Kerugian</p>
                            <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-black'}`}>
                                Rp {totalWasteValue.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            <Card
                title="Record Waste & Shrinkage"
                action={
                    <Button onClick={() => setShowModal(true)} size="sm" variant="danger">
                        <Plus size={18} className="mr-1" />
                        Tambah Waste
                    </Button>
                }
            >
                <Table columns={columns} data={wasteRecords} emptyMessage="Belum ada record waste" />
            </Card>

            <Modal isOpen={showModal} onClose={handleCloseModal} title="Tambah Waste/Shrinkage">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Tanggal"
                        type="date"
                        value={formData.waste_date}
                        onChange={(e) => setFormData({ ...formData, waste_date: e.target.value })}
                        required
                    />

                    <Select
                        label="Bahan Baku"
                        value={formData.material_id}
                        onChange={(e) => setFormData({ ...formData, material_id: e.target.value })}
                        options={[
                            { value: '', label: '-- Pilih Bahan --' },
                            ...materials.map((m) => ({
                                value: m.id,
                                label: `${m.name} (${m.current_stock.toFixed(2)} ${m.unit} tersedia)`,
                            })),
                        ]}
                        required
                    />

                    <Input
                        label="Jumlah"
                        type="number"
                        step="0.01"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                        required
                    />

                    {formData.material_id && formData.quantity > 0 && (
                        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800/30">
                            <p className="text-sm text-slate-600 dark:text-slate-400">Nilai Kerugian</p>
                            <p className="text-xl font-bold text-red-600 dark:text-red-400">
                                Rp{' '}
                                {(
                                    formData.quantity *
                                    (materials.find((m) => m.id === formData.material_id)?.average_cost || 0)
                                ).toLocaleString('id-ID')}
                            </p>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Alasan</label>
                        <textarea
                            value={formData.reason}
                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            rows={3}
                            placeholder="Misal: Kadaluarsa, Rusak, Tumpah, dll"
                        />
                    </div>

                    <div className="flex gap-2 justify-end pt-4 border-t dark:border-slate-700">
                        <Button type="button" variant="secondary" onClick={handleCloseModal}>
                            Batal
                        </Button>
                        <Button type="submit" loading={loading} variant="danger">
                            Simpan Record
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
