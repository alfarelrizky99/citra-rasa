import { useState, useEffect } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, X, Receipt, ImageIcon, Truck, Store as StoreIcon, MapPin, User, Phone } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

type Product = Database['public']['Tables']['products']['Row'];

interface POSItem {
    product_id: string;
    name: string;
    price: number;
    quantity: number;
    image_url: string | null;
}

interface POSCashierProps {
    onBack: () => void;
}

export default function POSCashier({ onBack }: POSCashierProps) {
    const { user } = useAuth();
    const { darkMode } = useTheme();
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<POSItem[]>([]);
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('Semua');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [notes, setNotes] = useState('');
    const [orderType, setOrderType] = useState<'dine_in' | 'delivery'>('dine_in');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');
    const [customerLandmark, setCustomerLandmark] = useState('');

    useEffect(() => {
        if (user) fetchProducts();
    }, [user]);

    const fetchProducts = async () => {
        if (!user) return;
        setLoading(true);
        const { data } = await supabase
            .from('products')
            .select('*')
            .eq('store_id', user.store_id)
            .eq('is_active', true)
            .order('category')
            .order('name');
        if (data) setProducts(data);
        setLoading(false);
    };

    const categories = ['Semua', ...new Set(products.map(p => p.category || 'Lainnya'))];

    const filteredProducts = products.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
        const matchCategory = activeCategory === 'Semua' || (p.category || 'Lainnya') === activeCategory;
        return matchSearch && matchCategory;
    });

    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.product_id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.product_id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, {
                product_id: product.id,
                name: product.name,
                price: product.selling_price,
                quantity: 1,
                image_url: product.image_url,
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
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

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

                await supabase.from('material_transactions').insert([{
                    store_id: user!.store_id,
                    material_id: material.id,
                    transaction_type: 'OUT',
                    quantity: materialNeeded,
                    cost_per_unit: material.average_cost,
                    total_cost: materialNeeded * material.average_cost,
                    reference_type: 'SALE',
                    reference_id: saleId,
                }]);
            }
        }
    };

    const handleSave = async () => {
        if (cart.length === 0) return;
        
        // Validate delivery fields
        if (orderType === 'delivery') {
            if (!customerName.trim() || !customerPhone.trim() || !customerAddress.trim()) {
                alert('Mohon lengkapi data pelanggan untuk pesan antar');
                return;
            }
        }
        
        setSaving(true);

        try {
            const saleNumber = `POS-${Date.now()}`;
            const totalAmount = total;

            // Save to sales table (for HPP tracking)
            const { data: saleData, error: saleError } = await supabase
                .from('sales')
                .insert([{
                    store_id: user!.store_id,
                    sale_number: saleNumber,
                    sale_date: new Date().toISOString().split('T')[0],
                    total_amount: totalAmount,
                    notes: notes || (orderType === 'delivery' ? `Pesan Antar - ${customerName}` : 'Transaksi via POS Kasir'),
                }])
                .select()
                .single();

            if (saleError || !saleData) {
                alert('Gagal menyimpan transaksi');
                setSaving(false);
                return;
            }

            let totalHPP = 0;

            for (const item of cart) {
                const actualHPP = await calculateHPPForProduct(item.product_id, item.quantity);
                const margin = item.quantity * item.price - actualHPP;

                await supabase.from('sale_items').insert([{
                    store_id: user!.store_id,
                    sale_id: saleData.id,
                    product_id: item.product_id,
                    quantity: item.quantity,
                    selling_price: item.price,
                    actual_hpp: actualHPP,
                    margin: margin,
                }]);

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

            // For delivery orders, also create an order record with status tracking
            if (orderType === 'delivery') {
                const orderNumber = `ORD-${Date.now()}`;
                const { data: orderData } = await supabase
                    .from('orders')
                    .insert([{
                        store_id: user!.store_id,
                        order_number: orderNumber,
                        order_type: 'delivery',
                        status: 'sedang_dilayani',
                        customer_name: customerName,
                        customer_phone: customerPhone,
                        customer_address: customerAddress,
                        customer_landmark: customerLandmark || null,
                        total_amount: totalAmount,
                        notes: notes || null,
                    }])
                    .select()
                    .single();

                if (orderData) {
                    const orderItems = cart.map(item => ({
                        order_id: orderData.id,
                        product_id: item.product_id,
                        product_name: item.name,
                        quantity: item.quantity,
                        price: item.price,
                    }));
                    await supabase.from('order_items').insert(orderItems);
                }
            } else {
                // For dine-in, also create an order record (for unified order management)
                const orderNumber = `DIN-${Date.now()}`;
                const { data: orderData } = await supabase
                    .from('orders')
                    .insert([{
                        store_id: user!.store_id,
                        order_number: orderNumber,
                        order_type: 'dine_in',
                        status: 'selesai',
                        customer_name: 'Walk-in Customer',
                        customer_phone: '-',
                        total_amount: totalAmount,
                        notes: notes || null,
                    }])
                    .select()
                    .single();

                if (orderData) {
                    const orderItems = cart.map(item => ({
                        order_id: orderData.id,
                        product_id: item.product_id,
                        product_name: item.name,
                        quantity: item.quantity,
                        price: item.price,
                    }));
                    await supabase.from('order_items').insert(orderItems);
                }
            }

            setCart([]);
            setNotes('');
            setCustomerName('');
            setCustomerPhone('');
            setCustomerAddress('');
            setCustomerLandmark('');
            alert(`✅ Transaksi ${orderType === 'delivery' ? 'pesan antar' : 'di tempat'} berhasil disimpan!`);
        } catch (error) {
            console.error('Error saving sale:', error);
            alert('Gagal menyimpan transaksi');
        } finally {
            setSaving(false);
        }
    };

    const getCartQty = (productId: string) => cart.find(i => i.product_id === productId)?.quantity || 0;

    return (
        <div className={`min-h-screen ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
            {/* Top Bar */}
            <div className={`sticky top-0 z-30 px-4 py-3 flex items-center justify-between ${darkMode ? 'bg-slate-800 border-b border-slate-700' : 'bg-white border-b border-slate-200'} shadow-sm`}>
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}>
                        <X size={20} />
                    </button>
                    <div className="flex items-center gap-2">
                        <Receipt size={22} className={darkMode ? 'text-emerald-400' : 'text-emerald-600'} />
                        <h1 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Mode Kasir</h1>
                    </div>
                </div>
                <div className={`px-4 py-1.5 rounded-full text-sm font-bold ${darkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                    {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </div>

            <div className="flex flex-col lg:flex-row h-[calc(100vh-57px)]">
                {/* Left: Product Grid */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Search & Categories */}
                    <div className={`p-4 space-y-3 ${darkMode ? 'bg-slate-800/50' : 'bg-white/50'}`}>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Cari menu..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all ${darkMode ? 'bg-slate-700 text-white border-slate-600 focus:ring-emerald-500 placeholder-slate-400' : 'bg-slate-100 text-slate-900 border-slate-200 focus:ring-emerald-500 placeholder-slate-400'} border focus:outline-none focus:ring-2`}
                            />
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${activeCategory === cat
                                        ? darkMode
                                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                                            : 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
                                        : darkMode
                                            ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Product Grid */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {loading ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <div key={i} className={`h-40 rounded-2xl animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                                {filteredProducts.map(product => {
                                    const qty = getCartQty(product.id);
                                    return (
                                        <button
                                            key={product.id}
                                            onClick={() => addToCart(product)}
                                            className={`relative rounded-2xl overflow-hidden text-left transition-all duration-200 active:scale-95 group ${darkMode
                                                ? 'bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-emerald-500/50'
                                                : 'bg-white hover:shadow-lg border border-slate-200 hover:border-emerald-300'
                                            } ${qty > 0 ? darkMode ? 'ring-2 ring-emerald-500/50' : 'ring-2 ring-emerald-500/30' : ''}`}
                                        >
                                            {/* Product Image */}
                                            <div className="h-24 sm:h-28 overflow-hidden relative">
                                                {product.image_url ? (
                                                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                                ) : (
                                                    <div className={`w-full h-full flex items-center justify-center ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                                                        <ImageIcon size={32} className="text-slate-400" />
                                                    </div>
                                                )}
                                                {qty > 0 && (
                                                    <div className="absolute top-2 right-2 w-7 h-7 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-lg">
                                                        {qty}
                                                    </div>
                                                )}
                                            </div>
                                            {/* Product Info */}
                                            <div className="p-3">
                                                <h3 className={`font-semibold text-sm truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                                    {product.name}
                                                </h3>
                                                <p className={`text-xs mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                    {product.category || 'Lainnya'}
                                                </p>
                                                <p className={`font-bold text-sm mt-1.5 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                                    Rp {product.selling_price.toLocaleString('id-ID')}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Cart / Receipt */}
                <div className={`w-full lg:w-96 flex flex-col border-t lg:border-t-0 lg:border-l ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    {/* Cart Header */}
                    <div className={`p-4 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ShoppingCart size={20} className={darkMode ? 'text-emerald-400' : 'text-emerald-600'} />
                                <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Keranjang</span>
                                {totalItems > 0 && (
                                    <span className="px-2 py-0.5 bg-emerald-500 text-white text-xs font-bold rounded-full">{totalItems}</span>
                                )}
                            </div>
                            {cart.length > 0 && (
                                <button onClick={() => setCart([])} className="text-xs text-red-400 hover:text-red-300 font-medium">
                                    Kosongkan
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Cart Items */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {cart.length === 0 ? (
                            <div className="text-center py-16">
                                <ShoppingCart size={48} className={`mx-auto mb-3 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
                                <p className={`text-sm font-medium ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Tap menu untuk menambah</p>
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.product_id} className={`flex items-center gap-3 p-3 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                                    <div className="flex-1 min-w-0">
                                        <p className={`font-semibold text-sm truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>{item.name}</p>
                                        <p className={`text-xs mt-0.5 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                            Rp {item.price.toLocaleString('id-ID')}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button onClick={() => updateQty(item.product_id, -1)}
                                            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${darkMode ? 'bg-slate-600 hover:bg-slate-500 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}>
                                            <Minus size={14} />
                                        </button>
                                        <span className={`w-7 text-center text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{item.quantity}</span>
                                        <button onClick={() => updateQty(item.product_id, 1)}
                                            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${darkMode ? 'bg-slate-600 hover:bg-slate-500 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}>
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                    <div className="text-right min-w-[70px]">
                                        <p className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                            Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                                        </p>
                                    </div>
                                    <button onClick={() => removeFromCart(item.product_id)} className="p-1 text-red-400 hover:text-red-300">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Cart Footer */}
                    {cart.length > 0 && (
                        <div className={`p-4 border-t space-y-3 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                            {/* Order Type Toggle */}
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => setOrderType('dine_in')}
                                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${orderType === 'dine_in'
                                        ? darkMode
                                            ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
                                            : 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
                                        : darkMode
                                            ? 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                    }`}
                                >
                                    <StoreIcon size={14} /> Beli di Tempat
                                </button>
                                <button
                                    onClick={() => setOrderType('delivery')}
                                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${orderType === 'delivery'
                                        ? darkMode
                                            ? 'bg-orange-500/20 text-orange-400 ring-1 ring-orange-500/30'
                                            : 'bg-orange-100 text-orange-700 ring-1 ring-orange-200'
                                        : darkMode
                                            ? 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                    }`}
                                >
                                    <Truck size={14} /> Pesan Antar
                                </button>
                            </div>

                            {/* Delivery customer fields */}
                            {orderType === 'delivery' && (
                                <div className="space-y-2 animate-fade-in">
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                        <input type="text" placeholder="Nama Pemesan" value={customerName} onChange={e => setCustomerName(e.target.value)}
                                            className={`w-full pl-9 pr-3 py-2 rounded-lg text-sm ${darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-400' : 'bg-slate-100 text-slate-900 border-slate-200 placeholder-slate-400'} border focus:outline-none focus:ring-2 focus:ring-orange-500`} />
                                    </div>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                        <input type="tel" placeholder="No. WhatsApp" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                                            className={`w-full pl-9 pr-3 py-2 rounded-lg text-sm ${darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-400' : 'bg-slate-100 text-slate-900 border-slate-200 placeholder-slate-400'} border focus:outline-none focus:ring-2 focus:ring-orange-500`} />
                                    </div>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-3 text-slate-400" size={14} />
                                        <textarea placeholder="Alamat Pengiriman" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} rows={2}
                                            className={`w-full pl-9 pr-3 py-2 rounded-lg text-sm resize-none ${darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-400' : 'bg-slate-100 text-slate-900 border-slate-200 placeholder-slate-400'} border focus:outline-none focus:ring-2 focus:ring-orange-500`} />
                                    </div>
                                    <input type="text" placeholder="Patokan (opsional)" value={customerLandmark} onChange={e => setCustomerLandmark(e.target.value)}
                                        className={`w-full px-3 py-2 rounded-lg text-sm ${darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-400' : 'bg-slate-100 text-slate-900 border-slate-200 placeholder-slate-400'} border focus:outline-none focus:ring-2 focus:ring-orange-500`} />
                                </div>
                            )}

                            <input
                                type="text"
                                placeholder="Catatan (opsional)"
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                className={`w-full px-3 py-2 rounded-lg text-sm ${darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-400' : 'bg-slate-100 text-slate-900 border-slate-200 placeholder-slate-400'} border focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                            />
                            <div className={`flex justify-between items-center p-3 rounded-xl ${darkMode ? 'bg-emerald-900/30 border border-emerald-800/30' : 'bg-emerald-50 border border-emerald-100'}`}>
                                <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Total</span>
                                <span className={`text-2xl font-bold ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                    Rp {total.toLocaleString('id-ID')}
                                </span>
                            </div>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className={`w-full py-3.5 font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm ${
                                    orderType === 'delivery'
                                        ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:shadow-orange-500/25'
                                        : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:shadow-emerald-500/25'
                                }`}
                            >
                                {saving ? (
                                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                                ) : (
                                    <>
                                        {orderType === 'delivery' ? <Truck size={18} /> : <Receipt size={18} />}
                                        {orderType === 'delivery' ? 'Simpan Pesanan Antar' : 'Simpan Transaksi'}
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
