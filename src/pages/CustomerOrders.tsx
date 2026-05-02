import { useState, useEffect, useRef } from 'react';
import { ClipboardList, Clock, Truck, CheckCircle2, CreditCard, MessageCircle, ChevronDown, ChevronUp, Package, Loader2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import ChatWidget from '../components/ChatWidget';
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
  total_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; color: string; bgColor: string; borderColor: string }> = {
  'menunggu_pembayaran': {
    label: 'Menunggu Pembayaran',
    icon: CreditCard,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  'sedang_dilayani': {
    label: 'Sedang Dilayani',
    icon: Package,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  'dalam_perjalanan': {
    label: 'Dalam Perjalanan',
    icon: Truck,
    color: 'text-padang-600',
    bgColor: 'bg-padang-50',
    borderColor: 'border-padang-200',
  },
  'selesai': {
    label: 'Selesai',
    icon: CheckCircle2,
    color: 'text-leaf-600',
    bgColor: 'bg-leaf-50',
    borderColor: 'border-leaf-200',
  },
  'dibatalkan': {
    label: 'Dibatalkan',
    icon: X,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
};

const STATUS_STEPS = ['menunggu_pembayaran', 'sedang_dilayani', 'dalam_perjalanan', 'selesai'];

function StatusTracker({ currentStatus }: { currentStatus: string }) {
  const currentIdx = STATUS_STEPS.indexOf(currentStatus);

  return (
    <div className="flex items-center justify-between relative py-2">
      {/* Line */}
      <div className="absolute top-1/2 left-6 right-6 h-0.5 bg-padang-200 -translate-y-1/2" />
      <div
        className="absolute top-1/2 left-6 h-0.5 bg-gradient-to-r from-leaf-500 to-padang-500 -translate-y-1/2 transition-all duration-500"
        style={{ width: `${Math.max(0, (currentIdx / (STATUS_STEPS.length - 1)) * (100 - 12))}%` }}
      />

      {STATUS_STEPS.map((step, idx) => {
        const config = STATUS_CONFIG[step];
        const Icon = config.icon;
        const isCompleted = idx <= currentIdx;
        const isCurrent = idx === currentIdx;

        return (
          <div key={step} className="relative z-10 flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              isCompleted
                ? isCurrent
                  ? 'bg-gradient-to-br from-padang-500 to-spice-500 shadow-lg shadow-padang-500/30 ring-4 ring-padang-200'
                  : 'bg-leaf-500'
                : 'bg-padang-200'
            }`}>
              <Icon className={`w-3.5 h-3.5 ${isCompleted ? 'text-white' : 'text-padang-400'}`} />
            </div>
            <span className={`text-[10px] mt-1.5 font-medium text-center max-w-[70px] leading-tight ${isCurrent ? 'text-padang-700 font-bold' : isCompleted ? 'text-leaf-600' : 'text-padang-400'}`}>
              {config.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function CustomerOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [chatOrderId, setChatOrderId] = useState<string | null>(null);
  const [messageCounts, setMessageCounts] = useState<Record<string, number>>({});
  const [chatNotice, setChatNotice] = useState<UnreadChatSummary | null>(null);
  const previousUnreadTotalRef = useRef(0);
  const unreadInitializedRef = useRef(false);

  useEffect(() => {
    if (!user) return;

    fetchOrders();

    const ordersChannel = supabase
      .channel('customer_orders_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `customer_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Change received!', payload);
          fetchOrders();
        }
      )
      .subscribe();

    const orderItemsChannel = supabase
      .channel('customer_order_items_channel')
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
          // A more granular update would involve checking if the changed item belongs to the current user's orders.
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(orderItemsChannel);
    };
  }, [user]);

  const fetchOrders = async () => {
    if (!user) return;
    setLoading(true);
    const { data: ordersData } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false });

    if (ordersData) {
      const ordersWithItems: Order[] = [];
      for (const order of ordersData) {
        const { data: items } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', order.id);
        ordersWithItems.push({ ...order, items: items || [] });
      }
      setOrders(ordersWithItems);

      const orderIds = ordersData.map((order) => order.id);
      const { counts, latestByOrder } = await getUnreadChatCounts(orderIds, user.id);
      const unreadTotal = Object.values(counts).reduce((sum, count) => sum + count, 0);
      const latestUnread = Object.values(latestByOrder).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];

      if (unreadInitializedRef.current && unreadTotal > previousUnreadTotalRef.current && latestUnread && latestUnread.order_id !== chatOrderId) {
        setChatNotice(latestUnread);
        window.setTimeout(() => setChatNotice(null), 5000);
      }
      unreadInitializedRef.current = true;
      previousUnreadTotalRef.current = unreadTotal;
      setMessageCounts(counts);
    }
    setLoading(false);
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm('Apakah Anda yakin ingin membatalkan pesanan ini?')) return;
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'dibatalkan', updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) throw error;
      fetchOrders();
    } catch (error) {
      console.error('Error canceling order:', error);
      alert('Gagal membatalkan pesanan');
    }
  };

  const tabs = [
    { id: 'all', label: 'Semua' },
    { id: 'menunggu_pembayaran', label: 'Menunggu' },
    { id: 'sedang_dilayani', label: 'Diproses' },
    { id: 'dalam_perjalanan', label: 'Dikirim' },
    { id: 'selesai', label: 'Selesai' },
    { id: 'dibatalkan', label: 'Batal' },
  ];

  const filteredOrders = activeTab === 'all' ? orders : orders.filter(o => o.status === activeTab);

  return (
    <div className="space-y-6">
      {chatNotice && (
        <div className="fixed right-4 top-4 z-[90] w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-padang-100 bg-white p-4 text-padang-900 shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-padang-50 text-padang-600">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">Chat baru dari {chatNotice.sender_name}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-padang-500">
                {chatNotice.attachment_url ? 'Mengirim gambar bukti pembayaran' : chatNotice.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setChatNotice(null)}
              className="rounded-lg p-1 hover:bg-padang-50"
              title="Tutup notifikasi"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-padang-900">
          Pesanan <span className="text-spice-600">Saya</span>
        </h1>
        <p className="text-padang-600/70 text-sm mt-1">Pantau status pesanan Anda secara real-time</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-padang-600 to-spice-600 text-white shadow-md shadow-padang-600/20'
                : 'bg-white text-padang-700 border border-padang-200 hover:bg-padang-50'
            }`}
          >
            {tab.label}
            {tab.id !== 'all' && (
              <span className="ml-1.5 text-xs opacity-70">
                ({orders.filter(o => o.status === tab.id).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-padang-400 animate-spin" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-padang-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="w-10 h-10 text-padang-300" />
          </div>
          <h3 className="font-display text-lg font-bold text-padang-700 mb-1">Belum ada pesanan</h3>
          <p className="text-padang-500 text-sm">Pesanan Anda akan muncul di sini</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.menunggu_pembayaran;
            const Icon = config.icon;
            const isExpanded = expandedOrder === order.id;

            return (
              <div key={order.id} className={`bg-white rounded-2xl border ${config.borderColor} shadow-sm hover:shadow-md transition-all overflow-hidden`}>
                {/* Order header */}
                <button
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 ${config.bgColor} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${config.color}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-padang-900 text-sm">#{order.order_number}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${config.bgColor} ${config.color}`}>
                          {config.label}
                        </span>
                        {order.order_type === 'delivery' && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-padang-100 text-padang-600">
                            🛵 Pesan Antar
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-padang-500 mt-0.5">{formatDate(order.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {(messageCounts[order.id] || 0) > 0 && (
                      <span className="bg-spice-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                        {messageCounts[order.id]}
                      </span>
                    )}
                    <span className="font-bold text-padang-900 text-sm">{formatPrice(order.total_amount)}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-padang-400" /> : <ChevronDown className="w-4 h-4 text-padang-400" />}
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-padang-100 pt-4 space-y-4 animate-fade-in">
                    {/* Status tracker */}
                    {order.order_type === 'delivery' && order.status !== 'dibatalkan' && (
                      <StatusTracker currentStatus={order.status} />
                    )}

                    {/* Items */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-padang-800">Detail Pesanan</h4>
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between bg-padang-50/50 rounded-xl px-4 py-2.5">
                          <div>
                            <span className="text-sm font-medium text-padang-900">{item.product_name}</span>
                            <span className="text-xs text-padang-500 ml-2">x{item.quantity}</span>
                          </div>
                          <span className="text-sm font-bold text-padang-800">{formatPrice(item.price * item.quantity)}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between pt-2 border-t border-padang-200">
                        <span className="font-bold text-padang-900">Total</span>
                        <span className="font-bold text-spice-600 text-lg">{formatPrice(order.total_amount)}</span>
                      </div>
                    </div>

                    {/* Address */}
                    {order.customer_address && (
                      <div className="bg-padang-50 rounded-xl p-3">
                        <p className="text-xs font-semibold text-padang-600 mb-1">📍 Alamat Pengiriman</p>
                        <p className="text-sm text-padang-800">{order.customer_address}</p>
                      </div>
                    )}

                    {/* Chat button */}
                    <button
                      onClick={() => setChatOrderId(order.id)}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-padang-600 to-spice-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all text-sm"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Chat dengan Toko
                      {(messageCounts[order.id] || 0) > 0 && (
                        <span className="bg-gold-400 text-padang-950 text-xs font-bold px-2 py-0.5 rounded-full ml-1">
                          {messageCounts[order.id]}
                        </span>
                      )}
                    </button>
                    {order.status === 'menunggu_pembayaran' && (
                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 text-red-600 font-semibold rounded-xl border border-red-200 hover:bg-red-100 transition-all text-sm"
                      >
                        <X className="w-4 h-4" />
                        Batalkan Pesanan
                      </button>
                    )}
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
          isOpen={!!chatOrderId}
          onClose={() => {
            setChatOrderId(null);
            fetchOrders();
          }}
          onReadChange={fetchOrders}
        />
      )}
    </div>
  );
}
