import { useState } from 'react';
import { X, Plus, Minus, Trash2, ShoppingCart, MessageCircle, Send, MapPin, Home, Loader2, CheckCircle } from 'lucide-react';
import type { CartItem } from './MenuSection';
import { supabase } from '../../lib/supabase';
import AddressMap from '../../components/AddressMap';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQty: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onClearCart: () => void;
  waNumber: string;
  freeShipping?: boolean;
  customerId?: string; // If logged-in customer
  storeId?: string;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
}

export default function CartModal({ isOpen, onClose, cart, onUpdateQty, onRemove, onClearCart, waNumber, freeShipping, customerId, storeId }: CartModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  if (!isOpen) return null;

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartStoreId = cart.find(item => item.storeId)?.storeId || '';
  const orderStoreId = cartStoreId || storeId || '';

  const createOrderRecord = async (currentCustomerId?: string) => {
    if (!orderStoreId) throw new Error('Store ID pesanan belum tersedia.');

    const orderNumber = `ORD-${Date.now()}`;
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert([{
        store_id: orderStoreId,
        customer_id: currentCustomerId || null,
        order_number: orderNumber,
        order_type: 'delivery',
        status: 'menunggu_pembayaran',
        customer_name: name,
        customer_phone: phone,
        customer_address: address,
        customer_landmark: landmark || null,
        customer_lat: lat,
        customer_lng: lng,
        total_amount: total,
      }])
      .select()
      .single();

    if (orderError || !orderData) throw orderError || new Error('Gagal membuat pesanan.');

    const items = cart.map(item => ({
      order_id: orderData.id,
      product_id: item.id,
      product_name: item.name,
      quantity: item.quantity,
      price: item.price,
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(items);
    if (itemsError) throw itemsError;

    return orderData;
  };

  const handleSendWA = async () => {
    if (!name.trim() || !phone.trim() || !address.trim()) return;

    let waTarget = waNumber.replace(/\D/g, '');
    if (waTarget.startsWith('0')) waTarget = '62' + waTarget.slice(1);
    if (!waTarget.startsWith('62')) waTarget = '62' + waTarget;

    let msg = `🍽️ *PESANAN BARU - CITRA RASA*\n\n`;
    msg += `👤 *Nama:* ${name}\n`;
    msg += `📱 *No WA:* ${phone}\n`;
    msg += `📍 *Alamat:* ${address}\n`;
    if (landmark.trim()) msg += `🏠 *Patokan:* ${landmark}\n`;
    if (lat !== null && lng !== null) msg += `🗺️ *Koordinat:* ${lat.toFixed(6)}, ${lng.toFixed(6)}\n`;
    msg += `\n📋 *Detail Pesanan:*\n`;
    msg += `${'─'.repeat(30)}\n`;
    cart.forEach((item, i) => {
      msg += `${i + 1}. ${item.name}\n`;
      msg += `   ${item.quantity}x @ ${formatPrice(item.price)} = ${formatPrice(item.price * item.quantity)}\n`;
    });
    msg += `${'─'.repeat(30)}\n`;
    msg += `💰 *TOTAL: ${formatPrice(total)}*\n\n`;
    if (freeShipping) msg += `🚚 *GRATIS ONGKIR!*\n\n`;
    msg += `Terima kasih! 🙏`;

    const url = `https://wa.me/${waTarget}?text=${encodeURIComponent(msg)}`;
    const waWindow = window.open(url, '_blank');

    setSaving(true);
    try {
      await createOrderRecord();
    } catch (err) {
      console.error('Error creating WhatsApp order:', err);
      alert('Pesanan terkirim ke WhatsApp, tetapi belum tersimpan ke Manajemen Pesanan. Cek konfigurasi toko atau coba lagi.');
      setSaving(false);
      return;
    }

    onClearCart();
    setName(''); setPhone(''); setAddress(''); setLandmark('');
    setLat(null); setLng(null);
    setShowForm(false);
    setSaving(false);
    waWindow?.focus();
    onClose();
  };

  const handleCreateOrder = async () => {
    if (!name.trim() || !phone.trim() || !address.trim() || !customerId || !orderStoreId) return;
    setSaving(true);

    try {
      await createOrderRecord(customerId);

      setOrderSuccess(true);
      onClearCart();
      setName(''); setPhone(''); setAddress(''); setLandmark('');
      setLat(null); setLng(null);

      // Auto close after 3 seconds
      setTimeout(() => {
        setOrderSuccess(false);
        setShowForm(false);
        onClose();
      }, 3000);
    } catch (err) {
      console.error('Error creating order:', err);
      alert('Gagal membuat pesanan.');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[90vh] overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-padang-100 bg-gradient-to-r from-padang-50 to-gold-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-padang-600 to-spice-600 rounded-xl flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-padang-900">Keranjang</h3>
              <p className="text-sm text-padang-600">{totalItems} item</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-padang-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-padang-700" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {cart.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-16 h-16 text-padang-200 mx-auto mb-4" />
              <p className="text-padang-700/50 font-medium">Keranjang masih kosong</p>
              <p className="text-padang-700/40 text-sm mt-1">Pilih menu favorit Anda</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex items-center gap-4 bg-padang-50/50 rounded-xl p-3 border border-padang-100">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-padang-900 text-sm truncate">{item.name}</h4>
                  <p className="text-spice-600 font-bold text-sm">{formatPrice(item.price)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => onUpdateQty(item.id, -1)} className="w-7 h-7 flex items-center justify-center bg-white border border-padang-200 rounded-lg hover:bg-padang-100 transition-colors">
                    <Minus className="w-3 h-3 text-padang-700" />
                  </button>
                  <span className="font-bold text-padang-900 w-6 text-center text-sm">{item.quantity}</span>
                  <button onClick={() => onUpdateQty(item.id, 1)} className="w-7 h-7 flex items-center justify-center bg-white border border-padang-200 rounded-lg hover:bg-padang-100 transition-colors">
                    <Plus className="w-3 h-3 text-padang-700" />
                  </button>
                </div>
                <div className="text-right min-w-[80px]">
                  <p className="font-bold text-padang-900 text-sm">{formatPrice(item.price * item.quantity)}</p>
                </div>
                <button onClick={() => onRemove(item.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="border-t border-padang-100 p-5 bg-gradient-to-r from-padang-50 to-gold-50">
            {orderSuccess ? (
              <div className="text-center py-4 animate-fade-in">
                <CheckCircle className="w-16 h-16 text-leaf-500 mx-auto mb-3" />
                <h3 className="font-display text-lg font-bold text-padang-900">Pesanan Berhasil! 🎉</h3>
                <p className="text-padang-600 text-sm mt-1">Pesanan Anda sedang diproses</p>
              </div>
            ) : !showForm ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-display text-lg font-bold text-padang-900">Total</span>
                  <span className="font-display text-xl font-bold text-spice-600">{formatPrice(total)}</span>
                </div>
                {freeShipping && (
                  <div className="bg-leaf-50 border border-leaf-200 text-leaf-700 text-xs font-medium px-3 py-2 rounded-lg mb-3 text-center">
                    🚚 GRATIS ONGKIR untuk semua pesanan antar!
                  </div>
                )}
                <button onClick={() => setShowForm(true)} className="w-full bg-gradient-to-r from-padang-600 to-spice-600 text-white font-bold py-3.5 rounded-xl hover:shadow-lg hover:shadow-padang-600/30 transition-all flex items-center justify-center gap-2">
                  {customerId ? (
                    <>
                      <Send className="w-5 h-5" /> Pesan Sekarang
                    </>
                  ) : (
                    <>
                      <MessageCircle className="w-5 h-5" /> Pesan via WhatsApp
                    </>
                  )}
                </button>
              </>
            ) : (
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                <div>
                  <label className="block text-sm font-semibold text-padang-800 mb-1">Nama Pemesan</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Masukkan nama Anda" className="w-full px-4 py-2.5 border border-padang-200 rounded-xl focus:ring-2 focus:ring-padang-500 focus:border-padang-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-padang-800 mb-1">No. WhatsApp</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="08xx-xxxx-xxxx" className="w-full px-4 py-2.5 border border-padang-200 rounded-xl focus:ring-2 focus:ring-padang-500 focus:border-padang-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-padang-800 mb-1">
                    <MapPin className="w-3.5 h-3.5 text-padang-600" /> Alamat Pengiriman
                  </label>
                  <AddressMap
                    address={address}
                    onAddressChange={setAddress}
                    onLocationChange={(newLat, newLng) => { setLat(newLat); setLng(newLng); }}
                  />
                  <textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="Jl. Contoh No. 123, RT/RW, Kelurahan, Kecamatan" rows={2} className="mt-2 w-full px-4 py-2.5 border border-padang-200 rounded-xl focus:ring-2 focus:ring-padang-500 focus:border-padang-500 outline-none text-sm resize-none" />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-padang-800 mb-1">
                    <Home className="w-3.5 h-3.5 text-padang-600" /> Patokan Rumah
                  </label>
                  <input type="text" value={landmark} onChange={e => setLandmark(e.target.value)} placeholder="Contoh: Sebelah masjid, depan warung biru" className="w-full px-4 py-2.5 border border-padang-200 rounded-xl focus:ring-2 focus:ring-padang-500 focus:border-padang-500 outline-none text-sm" />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="font-bold text-padang-900">Total: <span className="text-spice-600">{formatPrice(total)}</span></span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowForm(false)} className="flex-1 border border-padang-200 text-padang-700 font-semibold py-3 rounded-xl hover:bg-padang-50 transition-colors text-sm">
                    Kembali
                  </button>
                  {customerId ? (
	                    <button
	                      onClick={handleCreateOrder}
	                      disabled={!name.trim() || !phone.trim() || !address.trim() || !orderStoreId || saving}
	                      className="flex-1 bg-gradient-to-r from-padang-600 to-spice-600 text-white font-bold py-3 rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
	                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {saving ? 'Memproses...' : 'Kirim Pesanan'}
                    </button>
                  ) : (
	                    <button
	                      onClick={handleSendWA}
	                      disabled={!name.trim() || !phone.trim() || !address.trim() || !orderStoreId || saving}
	                      className="flex-1 bg-gradient-to-r from-leaf-600 to-leaf-700 text-white font-bold py-3 rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
	                    >
	                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
	                      {saving ? 'Menyimpan...' : 'Kirim via WA'}
	                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
