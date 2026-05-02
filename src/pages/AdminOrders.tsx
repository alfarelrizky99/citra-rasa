import { useState, useEffect, useRef } from 'react';
import { ClipboardList, Clock, Truck, CheckCircle2, CreditCard, MessageCircle, ChevronDown, ChevronUp, Package, Loader2, MapPin, Phone, User, ArrowRight, X, Edit3 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import ChatWidget from '../components/ChatWidget';
import EditOrderModal from '../components/EditOrderModal';
import { getUnreadChatCounts, type UnreadChatSummary } from '../lib/chat';

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  order_number: string;
  order_type: string;
  status: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
  customer_landmark: string | null;
  customer_lat: number | null;
  customer_lng: number | null;
  total_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  message_count: number;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; color: string; bgColor: string; borderColor: string; darkColor: string; darkBg: string }> = {
  'menunggu_pembayaran': {
    label: 'Menunggu Pembayaran',
    icon: CreditCard,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    darkColor: 'text-amber-400',
    darkBg: 'bg-amber-500/10',
  },
  'sedang_dilayani': {
    label: 'Sedang Dilayani',
    icon: Package,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    darkColor: 'text-blue-400',
    darkBg: 'bg-blue-500/10',
  },
  'dalam_perjalanan': {
    label: 'Dalam Perjalanan',
    icon: Truck,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    darkColor: 'text-orange-400',
    darkBg: 'bg-orange-500/10',
  },
  'selesai': {
    label: 'Selesai',
    icon: CheckCircle2,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    darkColor: 'text-emerald-400',
    darkBg: 'bg-emerald-500/10',
  },
  'dibatalkan': {
    label: 'Dibatalkan',
    icon: X,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    darkColor: 'text-red-400',
    darkBg: 'bg-red-500/10',
  },
};

const STATUS_FLOW = ['menunggu_pembayaran', 'sedang_dilayani', 'dalam_perjalanan', 'selesai'];

export default function AdminOrders({ isHistory = false }: { isHistory?: boolean }) {
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'dine_in' | 'delivery'>('all');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [chatOrderId, setChatOrderId] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [chatNotice, setChatNotice] = useState<UnreadChatSummary | null>(null);
  const previousUnreadTotalRef = useRef(0);
  const unreadInitializedRef = useRef(false);

  useEffect(() => {
    if (!user) return;

    fetchOrders();

    const ordersChannel = supabase
      .channel('admin_orders_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `store_id=eq.${user.store_id}`,
        },
        (payload) => {
          console.log('Change received!', payload);
          fetchOrders();
        }
      )
      .subscribe();

    const orderItemsChannel = supabase
      .channel('admin_order_items_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_items',
        },
        (payload) => {
          console.log('Order item change received!', payload);
          // For simplicity, re-fetch all orders if any order_item changes.
          // A more granular update would involve checking if the changed item belongs to the current store's orders.
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(orderItemsChannel);
    };
  }, [user]);

  const fetchOrders = async (silent = false) => {
    if (!user) return;
    if (!silent && orders.length === 0) setLoading(true);
    const { data: ordersData } = await supabase
      .from('orders')
      .select('*')
      .eq('store_id', user.store_id)
      .order('created_at', { ascending: false });

    if (ordersData) {
      const orderIds = ordersData.map((order) => order.id);
      const { counts: unreadCounts, latestByOrder } = await getUnreadChatCounts(orderIds, user.id);
      const unreadTotal = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
      const latestUnread = Object.values(latestByOrder).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];

      if (unreadInitializedRef.current && unreadTotal > previousUnreadTotalRef.current && latestUnread && latestUnread.order_id !== chatOrderId) {
        setChatNotice(latestUnread);
        window.setTimeout(() => setChatNotice(null), 5000);
      }
      unreadInitializedRef.current = true;
      previousUnreadTotalRef.current = unreadTotal;

      const ordersWithItems: Order[] = [];
      for (const order of ordersData) {
        const { data: items } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', order.id);
        ordersWithItems.push({ ...order, items: items || [], message_count: unreadCounts[order.id] || 0 });
      }
      setOrders(ordersWithItems);
    }
    setLoading(false);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingStatus(orderId);
    try {
      await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .eq('store_id', user!.store_id);
      await fetchOrders(true);
    } catch (err) {
      console.error('Error updating status:', err);
    }
    setUpdatingStatus(null);
  };

  const getNextStatus = (currentStatus: string) => {
    const idx = STATUS_FLOW.indexOf(currentStatus);
    return idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
  };

  const tabs = isHistory ? [
    { id: 'all', label: 'Semua Riwayat' },
    { id: 'selesai', label: 'Selesai' },
    { id: 'dibatalkan', label: 'Batal' },
  ] : [
    { id: 'all', label: 'Semua Aktif' },
    { id: 'menunggu_pembayaran', label: 'Menunggu' },
    { id: 'sedang_dilayani', label: 'Diproses' },
    { id: 'dalam_perjalanan', label: 'Dikirim' },
    { id: 'selesai', label: 'Selesai (Baru)' },
    { id: 'dibatalkan', label: 'Batal (Baru)' },
  ];

  const now = Date.now();
  const filteredByHistory = orders.filter(o => {
    const updatedDate = new Date(o.updated_at).getTime();
    const daysDiff = (now - updatedDate) / (1000 * 60 * 60 * 24);
    
    const isCompleted = o.status === 'selesai';
    const isCancelled = o.status === 'dibatalkan';
    
    // History includes ALL completed and cancelled orders
    const isHistoryOrder = isCompleted || isCancelled;
    
    // BUT we delete (hide) them if they are too old
    const isTooOld = (isCompleted && daysDiff > 7) || (isCancelled && daysDiff > 3);
    
    if (isTooOld) return false; // Hide completely
    
    return isHistory ? isHistoryOrder : !isHistoryOrder;
  });

  const tabsWithCount = tabs.map(t => ({
    ...t,
    count: t.id === 'all' ? filteredByHistory.length : filteredByHistory.filter(o => o.status === t.id).length
  }));

  const filteredOrders = filteredByHistory.filter(o => {
    const matchTab = activeTab === 'all' || o.status === activeTab;
    const matchType = typeFilter === 'all' || o.order_type === typeFilter;
    return matchTab && matchType;
  });

  return (
    <div className="space-y-6">
      {chatNotice && (
        <div className={`fixed right-4 top-4 z-[90] w-[calc(100vw-2rem)] max-w-sm rounded-2xl border p-4 shadow-2xl ${
          darkMode ? 'border-blue-500/30 bg-slate-800 text-white' : 'border-blue-100 bg-white text-slate-900'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${
              darkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-50 text-blue-600'
            }`}>
              <MessageCircle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">Chat baru dari {chatNotice.sender_name}</p>
              <p className={`mt-0.5 line-clamp-2 text-xs ${darkMode ? 'text-slate-300' : 'text-slate-500'}`}>
                {chatNotice.attachment_url ? 'Mengirim gambar bukti pembayaran' : chatNotice.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setChatNotice(null)}
              className={`rounded-lg p-1 ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
              title="Tutup notifikasi"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            {isHistory ? 'Riwayat Pesanan' : 'Manajemen Pesanan'}
          </h1>
          <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {filteredByHistory.length} total pesanan {isHistory ? 'diarsipkan' : 'aktif'}
          </p>
        </div>

        {/* Type filter */}
        <div className="flex gap-2">
          {[
            { id: 'all' as const, label: 'Semua', icon: '📋' },
            { id: 'dine_in' as const, label: 'Dine-in', icon: '🍽️' },
            { id: 'delivery' as const, label: 'Delivery', icon: '🛵' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setTypeFilter(f.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                typeFilter === f.id
                  ? darkMode
                    ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
                    : 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
                  : darkMode
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.icon} {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {tabsWithCount.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? darkMode
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                  : 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
                : darkMode
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
            <span className={`text-xs ${activeTab === tab.id ? 'text-white/70' : darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Orders */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className={`w-8 h-8 animate-spin ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-20">
          <div className={`w-20 h-20 ${darkMode ? 'bg-slate-700' : 'bg-slate-100'} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
            <ClipboardList className={`w-10 h-10 ${darkMode ? 'text-slate-500' : 'text-slate-300'}`} />
          </div>
          <h3 className={`text-lg font-bold mb-1 ${darkMode ? 'text-white' : 'text-slate-700'}`}>Tidak ada pesanan</h3>
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Pesanan dengan filter ini kosong</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.menunggu_pembayaran;
            const Icon = config.icon;
            const isExpanded = expandedOrder === order.id;
            const nextStatus = getNextStatus(order.status);
            const nextConfig = nextStatus ? STATUS_CONFIG[nextStatus] : null;

            return (
              <div key={order.id} className={`rounded-2xl border overflow-hidden transition-all ${
                darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
              } ${isExpanded ? 'shadow-lg' : 'shadow-sm hover:shadow-md'}`}>
                {/* Header */}
                <button
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${darkMode ? config.darkBg : config.bgColor}`}>
                      <Icon className={`w-5 h-5 ${darkMode ? config.darkColor : config.color}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>#{order.order_number}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${darkMode ? config.darkBg + ' ' + config.darkColor : config.bgColor + ' ' + config.color}`}>
                          {config.label}
                        </span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          order.order_type === 'delivery'
                            ? darkMode ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600'
                            : darkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'
                        }`}>
                          {order.order_type === 'delivery' ? '🛵 Pesan Antar' : '🍽️ Di Tempat'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {order.customer_name} • {formatDate(order.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {order.message_count > 0 && (
                      <span className="bg-spice-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                        {order.message_count}
                      </span>
                    )}
                    <span className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>{formatPrice(order.total_amount)}</span>
                    {isExpanded ? <ChevronUp className={`w-4 h-4 ${darkMode ? 'text-slate-400' : 'text-slate-400'}`} /> : <ChevronDown className={`w-4 h-4 ${darkMode ? 'text-slate-400' : 'text-slate-400'}`} />}
                  </div>
                </button>

                {/* Expanded */}
                {isExpanded && (
                  <div className={`px-5 pb-5 border-t pt-4 space-y-4 animate-fade-in ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                    {/* Customer info */}
                    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                        <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="text-sm">{order.customer_name}</span>
                      </div>
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                        <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="text-sm">{order.customer_phone}</span>
                      </div>
                      {order.customer_address && (
                        <div className={`flex items-start gap-2 px-3 py-2 rounded-lg sm:col-span-2 ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                          <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <span className="text-sm">{order.customer_address}</span>
                            {order.customer_landmark && (
                              <span className={`block text-xs mt-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                Patokan: {order.customer_landmark}
                              </span>
                            )}
                          </div>
                          {order.customer_lat && order.customer_lng && (
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${order.customer_lat},${order.customer_lng}&travelmode=driving&dir_action=navigate`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-xs font-bold transition-colors"
                              title="Buka Navigasi Maps"
                            >
                              📍 Navigasi
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Items */}
                    <div className="space-y-2">
                      <h4 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Detail Pesanan</h4>
                      {order.items.map((item) => (
                        <div key={item.id} className={`flex items-center justify-between rounded-xl px-4 py-2.5 ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                          <div>
                            <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>{item.product_name}</span>
                            <span className={`text-xs ml-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>x{item.quantity}</span>
                          </div>
                          <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{formatPrice(item.price * item.quantity)}</span>
                        </div>
                      ))}
                      <div className={`flex items-center justify-between pt-2 border-t ${darkMode ? 'border-slate-600' : 'border-slate-200'}`}>
                        <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Total</span>
                        <span className={`font-bold text-lg ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{formatPrice(order.total_amount)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      {!isHistory && order.status !== 'dibatalkan' && order.status !== 'selesai' && (
                        <button
                          onClick={() => setEditingOrder(order)}
                          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${
                            darkMode
                              ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          <Edit3 className="w-4 h-4" /> Edit Menu
                        </button>
                      )}
                      {/* Update status button */}
                      {nextStatus && nextConfig && order.status !== 'dibatalkan' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, nextStatus)}
                          disabled={updatingStatus === order.id}
                          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${
                            darkMode
                              ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                          } disabled:opacity-50`}
                        >
                          {updatingStatus === order.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <ArrowRight className="w-4 h-4" />
                              {nextConfig.label}
                            </>
                          )}
                        </button>
                      )}

                      {order.status === 'menunggu_pembayaran' && (
                        <button
                          onClick={() => {
                            if (window.confirm('Apakah Anda yakin ingin membatalkan pesanan ini?')) {
                              updateOrderStatus(order.id, 'dibatalkan');
                            }
                          }}
                          disabled={updatingStatus === order.id}
                          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                            darkMode
                              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                              : 'bg-red-50 text-red-600 hover:bg-red-100'
                          } disabled:opacity-50`}
                          title="Batalkan Pesanan"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}

                      {/* Chat button */}
                      <button
                        onClick={() => setChatOrderId(order.id)}
                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                          darkMode
                            ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        <MessageCircle className="w-4 h-4" />
                        Chat
                        {order.message_count > 0 && (
                          <span className="bg-white/20 text-xs font-bold px-1.5 py-0.5 rounded-full">{order.message_count}</span>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Chat Widget */}
      {chatOrderId && (
        <ChatWidget
          orderId={chatOrderId}
          isOpen={true}
          onClose={() => setChatOrderId(null)}
          onReadChange={() => fetchOrders(orders.length === 0)}
        />
      )}

      {editingOrder && user && (
        <EditOrderModal
          isOpen={true}
          onClose={() => setEditingOrder(null)}
          orderId={editingOrder.id}
          storeId={user.store_id}
          currentItems={editingOrder.items}
          onSave={() => fetchOrders(orders.length === 0)}
        />
      )}
    </div>
  );
}
