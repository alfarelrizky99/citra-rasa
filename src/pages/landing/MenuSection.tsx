import { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import ImageWithSkeleton from '../../components/ImageWithSkeleton';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  storeId?: string;
}

interface MenuSectionProps {
  storeId: string;
  cart: CartItem[];
  onAddToCart: (item: CartItem) => void;
  onRemoveFromCart: (id: string) => void;
}

interface Product {
  id: string;
  store_id?: string;
  name: string;
  description: string | null;
  selling_price: number;
  category: string | null;
  image_url: string | null;
  is_active: boolean;
}



function formatPrice(price: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
}

const categoryImages: Record<string, string> = {
  rendang: 'https://images.pexels.com/photos/6287527/pexels-photo-6287527.jpeg?auto=compress&cs=tinysrgb&w=600',
  'lauk-pauk': 'https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg?auto=compress&cs=tinysrgb&w=600',
  lauk: 'https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg?auto=compress&cs=tinysrgb&w=600',
  sayur: 'https://images.pexels.com/photos/1640774/pexels-photo-1640774.jpeg?auto=compress&cs=tinysrgb&w=600',
  sambal: 'https://images.pexels.com/photos/736367/pexels-photo-736367.jpeg?auto=compress&cs=tinysrgb&w=600',
  minuman: 'https://images.pexels.com/photos/5946631/pexels-photo-5946631.jpeg?auto=compress&cs=tinysrgb&w=600',
  default: 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600',
};

const categoryIcons: Record<string, string> = {
  rendang: '🥩', 'lauk-pauk': '🍗', lauk: '🍗', sayur: '🥬', sayuran: '🥬',
  sambal: '🌶️', minuman: '🥤', nasi: '🍚', semua: '🍽️', default: '🍽️',
};

function getImage(category: string | null) {
  const key = (category || '').toLowerCase();
  return categoryImages[key] || categoryImages.default;
}

function getIcon(category: string | null) {
  const key = (category || '').toLowerCase();
  return categoryIcons[key] || categoryIcons.default;
}

function MenuCard({ item, index, cartQty, onAdd, onRemove }: {
  item: Product; index: number; cartQty: number;
  onAdd: () => void; onRemove: () => void;
}) {
  return (
    <div className="menu-card group animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
      <div className="relative h-48 sm:h-56 overflow-hidden">
        <ImageWithSkeleton 
          src={item.image_url || getImage(item.category)} 
          alt={item.name} 
          className="w-full h-full group-hover:scale-110" 
        />
        <div className="absolute bottom-0 left-0 right-0 z-20 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-500">
          {cartQty > 0 ? (
            <div className="flex items-center justify-center gap-3 bg-white rounded-xl py-2 shadow-lg">
              <button onClick={onRemove} className="w-8 h-8 flex items-center justify-center bg-spice-100 text-spice-600 rounded-lg hover:bg-spice-200 transition-colors">
                <Minus className="w-4 h-4" />
              </button>
              <span className="font-bold text-padang-900 text-lg min-w-[2rem] text-center">{cartQty}</span>
              <button onClick={onAdd} className="w-8 h-8 flex items-center justify-center bg-padang-100 text-padang-600 rounded-lg hover:bg-padang-200 transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button onClick={onAdd} className="w-full bg-gold-400 text-padang-950 font-semibold py-2.5 rounded-xl hover:bg-gold-300 transition-colors flex items-center justify-center gap-2 text-sm">
              <ShoppingCart className="w-4 h-4" /> Tambah ke Keranjang
            </button>
          )}
        </div>
        {cartQty > 0 && (
          <div className="absolute top-3 left-3 z-20 bg-padang-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1">
            <ShoppingCart className="w-3 h-3" /> {cartQty}
          </div>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-display text-lg font-bold text-padang-900 group-hover:text-padang-700 transition-colors">{item.name}</h3>
          <span className="text-spice-600 font-bold text-sm whitespace-nowrap bg-spice-50 px-3 py-1 rounded-full">{formatPrice(item.selling_price)}</span>
        </div>
        <p className="text-padang-700/70 text-sm leading-relaxed line-clamp-2">{item.description || 'Menu spesial Citra Rasa'}</p>
      </div>
    </div>
  );
}

export default function MenuSection({ storeId, cart, onAddToCart, onRemoveFromCart }: MenuSectionProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, [storeId]);

  const fetchProducts = async () => {
    setLoading(true);
    let query = supabase.from('products').select('id, store_id, name, description, selling_price, category, image_url, is_active').eq('is_active', true).order('category').order('name');
    if (storeId) query = query.eq('store_id', storeId);
    let { data } = await query;

    // If no products found with the given storeId, try fetching from all stores
    if ((!data || data.length === 0) && storeId) {
      const { data: allData } = await supabase
        .from('products')
        .select('id, store_id, name, description, selling_price, category, image_url, is_active')
        .eq('is_active', true)
        .order('category')
        .order('name');
      data = allData;
    }

    if (data) {
      setProducts(data);
      const cats = [...new Set(data.map(p => p.category || 'Lainnya'))];
      setCategories(['Semua', ...cats]);
    }
    setLoading(false);
  };

  const filteredProducts = activeCategory === 'Semua' ? products : products.filter(p => (p.category || 'Lainnya') === activeCategory);
  const getCartQty = (id: string) => cart.find(c => c.id === id)?.quantity || 0;

  if (loading) {
    return (
      <section id="menu" className="py-20 sm:py-28 bg-gradient-to-b from-padang-50 to-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-padang-200 rounded w-48 mx-auto" />
            <div className="h-4 bg-padang-100 rounded w-72 mx-auto" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
              {[1, 2, 3].map(i => <div key={i} className="h-72 bg-padang-100 rounded-2xl" />)}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return (
      <section id="menu" className="py-20 sm:py-28 bg-gradient-to-b from-padang-50 to-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="section-title-landing">Menu <span className="text-spice-600">Kami</span></h2>
          <p className="text-padang-700/70 mt-4">Menu sedang dipersiapkan. Nantikan segera!</p>
        </div>
      </section>
    );
  }

  return (
    <section id="menu" className="py-20 sm:py-28 bg-gradient-to-b from-padang-50 to-white relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-padang-200 to-transparent" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14 animate-slide-up">
          <span className="inline-block text-padang-600 font-semibold text-sm tracking-widest uppercase mb-3">Menu Pilihan</span>
          <h2 className="section-title-landing">Cita Rasa <span className="text-spice-600">Autentik</span></h2>
          <p className="section-subtitle-landing max-w-xl mx-auto">Setiap hidangan diracik dengan resep turun-temurun dan rempah pilihan</p>
          <div className="spice-divider" />
        </div>

        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-12">
          {categories.map((cat) => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${activeCategory === cat
                ? 'bg-gradient-to-r from-padang-600 to-spice-600 text-white shadow-lg shadow-padang-600/25 scale-105'
                : 'bg-white text-padang-700 hover:bg-padang-100 border border-padang-200 hover:border-padang-300'}`}>
              <span>{getIcon(cat)}</span> {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filteredProducts.map((item, i) => (
            <MenuCard key={item.id} item={item} index={i} cartQty={getCartQty(item.id)}
              onAdd={() => onAddToCart({ id: item.id, name: item.name, price: item.selling_price, quantity: 1, category: item.category || '', storeId: item.store_id })}
              onRemove={() => onRemoveFromCart(item.id)} />
          ))}
        </div>
      </div>
    </section>
  );
}
