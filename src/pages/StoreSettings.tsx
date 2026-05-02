import { useState, useEffect } from 'react';
import { Settings, Save, Loader2, Phone, Store, AlertCircle, CheckCircle, Truck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Card from '../components/Card';

interface StoreOption {
  id: string;
  name: string;
}

export default function StoreSettings() {
  const { user, isSuperAdmin } = useAuth();
  const { darkMode } = useTheme();
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [waNumber, setWaNumber] = useState('');
  const [freeShipping, setFreeShipping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      if (isSuperAdmin()) {
        fetchStores();
      } else {
        setSelectedStoreId(user.store_id);
      }
    }
  }, [user, isSuperAdmin]);

  useEffect(() => {
    if (selectedStoreId) fetchSettings(selectedStoreId);
  }, [selectedStoreId]);

  const fetchStores = async () => {
    const { data } = await supabase.from('stores').select('id, name').order('name');
    if (data) setStores(data);
  };

  const fetchSettings = async (storeId: string) => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('store_settings')
        .select('setting_key, setting_value')
        .eq('store_id', storeId);

      if (data) {
        const waRow = data.find(d => d.setting_key === 'whatsapp_number');
        setWaNumber(waRow?.setting_value || '');
        const freeShipRow = data.find(d => d.setting_key === 'free_shipping');
        setFreeShipping(freeShipRow?.setting_value === 'true');
      }
    } catch {
      // Table may not exist
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!selectedStoreId) return;
    setSaving(true);
    setMessage(null);

    try {
      // Save WhatsApp number
      const { error: waError } = await supabase
        .from('store_settings')
        .upsert(
          {
            store_id: selectedStoreId,
            setting_key: 'whatsapp_number',
            setting_value: waNumber,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'store_id, setting_key' }
        );

      if (waError) throw waError;

      // Save Free Shipping setting
      const { error: fsError } = await supabase
        .from('store_settings')
        .upsert(
          {
            store_id: selectedStoreId,
            setting_key: 'free_shipping',
            setting_value: freeShipping ? 'true' : 'false',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'store_id, setting_key' }
        );

      if (fsError) throw fsError;
      setMessage({ type: 'success', text: 'Pengaturan berhasil disimpan!' });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Gagal menyimpan. Pastikan tabel store_settings sudah dibuat di Supabase.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading && selectedStoreId) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
            <Settings className="text-orange-600 dark:text-orange-400" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-black dark:text-white">Pengaturan Toko</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Atur nomor WhatsApp dan konfigurasi lainnya</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !selectedStoreId}
          className={`flex items-center gap-2 px-4 py-2 text-white font-bold rounded-lg transition-all disabled:opacity-50 ${
            darkMode ? 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20' : 'bg-blue-600 hover:bg-blue-700 shadow-md'
          }`}
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          Simpan
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
            : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
        }`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      <Card className="overflow-hidden">
        {/* Store selector */}
        <div className="p-6 border-b dark:border-slate-700">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Pilih Toko</label>
          {isSuperAdmin() ? (
            <div className="relative">
              <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 dark:text-white"
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
              >
                <option value="">Pilih Toko...</option>
                {stores.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg border dark:border-slate-600">
              <Store className="text-slate-400" size={20} />
              <span className="font-bold text-black dark:text-white">{user?.store_name}</span>
            </div>
          )}
        </div>

        {!selectedStoreId ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            Pilih toko untuk mengatur konfigurasi.
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* WhatsApp Number */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                <Phone size={16} className="text-green-500" />
                Nomor WhatsApp Penerima Pesanan
              </label>
              <input
                type="tel"
                value={waNumber}
                onChange={(e) => setWaNumber(e.target.value)}
                placeholder="0881024753628"
                className={`w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                  darkMode
                    ? 'bg-slate-700 border-slate-600 text-white placeholder:text-slate-400'
                    : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400'
                }`}
              />
              <p className="text-xs text-slate-400 mt-2">
                Nomor ini akan menerima pesanan dari pelanggan via WhatsApp di halaman Beranda. Format: 08xxx atau 628xxx
              </p>
            </div>

            {/* Free Ongkir Toggle */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                <Truck size={16} className="text-blue-500" />
                Promosi Gratis Ongkir
              </label>
              <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                freeShipping
                  ? (darkMode ? 'bg-emerald-900/20 border-emerald-700/50' : 'bg-emerald-50 border-emerald-300')
                  : (darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200')
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    freeShipping
                      ? 'bg-emerald-100 dark:bg-emerald-800/40'
                      : 'bg-slate-200 dark:bg-slate-600'
                  }`}>
                    <Truck size={20} className={freeShipping ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'} />
                  </div>
                  <div>
                    <p className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Free Ongkir</p>
                    <p className="text-xs text-slate-400">
                      {freeShipping ? 'Aktif — pelanggan melihat label gratis ongkir di keranjang' : 'Nonaktif'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFreeShipping(!freeShipping)}
                  className={`relative w-12 h-7 rounded-full transition-all duration-300 ${
                    freeShipping ? 'bg-emerald-500' : (darkMode ? 'bg-slate-500' : 'bg-slate-300')
                  }`}
                >
                  <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-all duration-300 ${
                    freeShipping ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
