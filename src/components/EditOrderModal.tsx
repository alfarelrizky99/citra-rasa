import { useState, useEffect } from 'react';
import { X, Plus, Minus, Trash2, Search, Save, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Product = Database['public']['Tables']['products']['Row'];
type OrderItem = Database['public']['Tables']['order_items']['Row'];

interface EditOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  storeId: string;
  currentItems: OrderItem[];
  onSave: () => void;
}

export default function EditOrderModal({ isOpen, onClose, orderId, storeId, currentItems, onSave }: EditOrderModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<{ product_id: string; name: string; price: number; quantity: number }[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'menu' | 'cart'>('cart');

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      // Initialize cart with current items
      setCart(currentItems.map(item => ({
        product_id: item.product_id || '', // Handle possible nulls if any
        name: item.product_name,
        price: item.price,
        quantity: item.quantity,
      })).filter(i => i.product_id !== ''));
    }
  }, [isOpen, currentItems]);

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('name');
    if (data) setProducts(data);
    setLoading(false);
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, {
        product_id: product.id,
        name: product.name,
        price: product.selling_price,
        quantity: 1,
      }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product_id === productId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product_id !== productId));
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleSave = async () => {
    if (cart.length === 0) {
      alert('Pesanan tidak boleh kosong. Jika ingin membatalkan pesanan, gunakan tombol Batal di menu utama.');
      return;
    }
    setSaving(true);
    try {
      // 1. Delete all existing order items
      await supabase.from('order_items').delete().eq('order_id', orderId);

      // 2. Insert new order items
      const newItems = cart.map(item => ({
        order_id: orderId,
        product_id: item.product_id,
        product_name: item.name,
        quantity: item.quantity,
        price: item.price,
      }));
      await supabase.from('order_items').insert(newItems);

      // 3. Update total_amount in orders table
      await supabase.from('orders').update({ total_amount: total }).eq('id', orderId);

      // 4. Send system message to chat
      let changesText = 'Daftar menu pesanan telah diperbarui oleh Admin:\n';
      cart.forEach(item => {
        changesText += `- ${item.quantity}x ${item.name} (Rp ${item.price.toLocaleString('id-ID')})\n`;
      });
      changesText += `\nTotal Baru: Rp ${total.toLocaleString('id-ID')}`;

      await supabase.from('order_messages').insert([{
        order_id: orderId,
        sender_id: storeId, // System/Admin id
        sender_name: 'Sistem Citra Rasa',
        sender_role: 'system',
        message: changesText,
      }]);

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving order items:', error);
      alert('Gagal menyimpan perubahan pesanan.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-lg">Edit Menu Pesanan</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Tabs */}
        <div className="flex md:hidden border-b border-slate-200 bg-white shrink-0">
          <button 
            onClick={() => setActiveTab('cart')}
            className={`flex-1 py-3.5 text-sm font-bold transition-colors ${activeTab === 'cart' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/50' : 'text-slate-500 hover:bg-slate-50'}`}>
            Daftar Pesanan ({cart.reduce((a,b)=>a+b.quantity,0)})
          </button>
          <button 
            onClick={() => setActiveTab('menu')}
            className={`flex-1 py-3.5 text-sm font-bold transition-colors ${activeTab === 'menu' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/50' : 'text-slate-500 hover:bg-slate-50'}`}>
            Tambah Menu
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Left: Product List */}
          <div className={`flex-1 border-r border-slate-100 flex-col md:h-full bg-white ${activeTab === 'menu' ? 'flex' : 'hidden md:flex'}`}>
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Cari produk untuk ditambah..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {loading ? (
                <p className="text-center text-slate-400 p-4 text-sm">Memuat produk...</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {filteredProducts.map(p => (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      className="p-3 text-left border border-slate-100 rounded-xl hover:bg-emerald-50 hover:border-emerald-200 transition-colors"
                    >
                      <p className="font-semibold text-sm text-slate-800 line-clamp-1">{p.name}</p>
                      <p className="text-xs text-emerald-600 font-bold mt-1">Rp {p.selling_price.toLocaleString('id-ID')}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Cart/Order Items */}
          <div className={`w-full md:w-96 flex-col bg-slate-50 md:h-full ${activeTab === 'cart' ? 'flex' : 'hidden md:flex'}`}>
            <div className="p-4 border-b border-slate-200 bg-white shrink-0">
              <h4 className="font-bold text-slate-800">Daftar Menu Saat Ini</h4>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.map(item => (
                <div key={item.product_id} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-800 truncate">{item.name}</p>
                    <p className="text-xs text-slate-500 font-medium">Rp {item.price.toLocaleString('id-ID')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(item.product_id, -1)} className="w-6 h-6 flex items-center justify-center bg-slate-100 text-slate-600 rounded hover:bg-slate-200">
                      <Minus size={12} />
                    </button>
                    <span className="w-6 text-center text-sm font-bold text-slate-800">{item.quantity}</span>
                    <button onClick={() => updateQty(item.product_id, 1)} className="w-6 h-6 flex items-center justify-center bg-slate-100 text-slate-600 rounded hover:bg-slate-200">
                      <Plus size={12} />
                    </button>
                  </div>
                  <button onClick={() => removeFromCart(item.product_id)} className="text-red-400 hover:text-red-600 p-1">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="p-4 bg-white border-t border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <span className="text-slate-500 font-medium">Total Harga</span>
                <span className="text-xl font-bold text-emerald-600">Rp {total.toLocaleString('id-ID')}</span>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : (
                  <>
                    <Save size={18} />
                    Simpan Perubahan
                  </>
                )}
              </button>
              <div className="mt-3 flex items-start gap-2 text-xs text-orange-600 bg-orange-50 p-2 rounded-lg border border-orange-100">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <p>Pelanggan akan otomatis diberitahu mengenai perubahan pesanan ini melalui Chat.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
