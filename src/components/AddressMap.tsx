import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Search, Loader2, Navigation } from 'lucide-react';

interface AddressMapProps {
  address: string;
  onAddressChange: (address: string) => void;
  onLocationChange?: (lat: number, lng: number) => void;
  autoLocate?: boolean;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface NominatimReverseResult {
  display_name?: string;
  error?: string;
}

interface MapPreviewLocation {
  lat: number;
  lng: number;
  label: string;
}

export default function AddressMap({ onAddressChange, onLocationChange, autoLocate }: AddressMapProps) {
  const [showMap, setShowMap] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [selectedLat, setSelectedLat] = useState<number | null>(null);
  const [selectedLng, setSelectedLng] = useState<number | null>(null);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [previewLocation, setPreviewLocation] = useState<MapPreviewLocation | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: -6.242, lng: 106.474 });
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Search addresses using Nominatim (free OpenStreetMap API)
  const searchAddress = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      setPreviewLocation(null);
      return;
    }
    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=id&limit=5&addressdetails=1`,
        { headers: { 'Accept-Language': 'id' } }
      );
      const data: NominatimResult[] = await response.json();
      setSearchResults(data);
      const firstResult = data[0];
      if (firstResult) {
        const lat = parseFloat(firstResult.lat);
        const lng = parseFloat(firstResult.lon);
        setPreviewLocation({ lat, lng, label: firstResult.display_name });
        setMapCenter({ lat, lng });
        setShowMap(true);
      } else {
        setPreviewLocation(null);
      }
    } catch (error) {
      console.error('Search error:', error);
      setPreviewLocation(null);
    }
    setSearching(false);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const trimmedQuery = searchQuery.trim();
      if (trimmedQuery) {
        searchAddress(trimmedQuery);
      } else {
        setSearchResults([]);
        setPreviewLocation(null);
      }
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, searchAddress]);

  const selectLocation = (result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setSelectedLat(lat);
    setSelectedLng(lng);
    setMapCenter({ lat, lng });
    setShowMap(true);
    setLocationError('');
    setSelectedAddress(result.display_name);
    setLocationAccuracy(null);
    setPreviewLocation(null);
    onAddressChange(result.display_name);
    onLocationChange?.(lat, lng);
    setSearchResults([]);
    setSearchQuery('');
  };


  const getGeolocationErrorMessage = (error: GeolocationPositionError) => {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Izin lokasi ditolak. Aktifkan izin lokasi di browser, lalu coba lagi.';
      case error.POSITION_UNAVAILABLE:
        return 'Lokasi perangkat belum tersedia. Pastikan GPS atau layanan lokasi aktif.';
      case error.TIMEOUT:
        return 'Deteksi lokasi terlalu lama. Coba lagi dalam beberapa detik.';
      default:
        return 'Lokasi belum bisa dideteksi. Coba lagi atau cari alamat manual.';
    }
  };

  const reverseGeocodeLocation = async (lat: number, lng: number) => {
    const fallbackAddress = `Lokasi saya: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;

    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=id`,
        { headers: { 'Accept-Language': 'id' } }
      );

      if (!resp.ok) throw new Error('Reverse geocode failed');

      const data: NominatimReverseResult = await resp.json();
      if (data.display_name) {
        onAddressChange(data.display_name);
        setSelectedAddress(data.display_name);
        return;
      }

      onAddressChange(fallbackAddress);
      setSelectedAddress(fallbackAddress);
      setLocationError('Alamat detail belum ditemukan, koordinat sudah dipakai sebagai lokasi.');
    } catch (error) {
      console.error('Reverse geocode error:', error);
      onAddressChange(fallbackAddress);
      setSelectedAddress(fallbackAddress);
      setLocationError('Alamat dari OpenStreetMap belum bisa dimuat. Koordinat sudah dipakai sebagai lokasi.');
    }
  };

  const getCurrentLocation = () => {
    setShowMap(true);
    setLocationError('');
    setSearchResults([]);
    setPreviewLocation(null);

    if (!navigator.geolocation) {
      setLocationError('Browser ini belum mendukung deteksi lokasi.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setSelectedLat(lat);
        setSelectedLng(lng);
        setMapCenter({ lat, lng });
        setLocationAccuracy(pos.coords.accuracy);
        onLocationChange?.(lat, lng);

        await reverseGeocodeLocation(lat, lng);
        setLocating(false);
      },
      (err) => {
        console.error('Geolocation error:', err);
        setLocationError(getGeolocationErrorMessage(err));
        setLocating(false);
      },
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 12000 }
    );
  };

  const hasAutoLocated = useRef(false);
  useEffect(() => {
    if (autoLocate && !hasAutoLocated.current) {
      hasAutoLocated.current = true;
      getCurrentLocation();
    }
  }, [autoLocate]);

  const activeLat = previewLocation?.lat ?? selectedLat ?? mapCenter.lat;
  const activeLng = previewLocation?.lng ?? selectedLng ?? mapCenter.lng;
  const hasActivePoint = previewLocation !== null || (selectedLat !== null && selectedLng !== null);
  const pointLabel = previewLocation ? 'Preview hasil pencarian' : 'Titik pengiriman';
  const pointAddress = previewLocation?.label ?? selectedAddress;
  const bboxPadding = hasActivePoint ? { lat: 0.0015, lng: 0.0025 } : { lat: 0.006, lng: 0.01 };
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${activeLng - bboxPadding.lng},${activeLat - bboxPadding.lat},${activeLng + bboxPadding.lng},${activeLat + bboxPadding.lat}&layer=mapnik${hasActivePoint ? `&marker=${activeLat},${activeLng}` : ''}`;

  return (
    <div className="space-y-2">
      {/* Address search bar */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-padang-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowMap(true)}
              placeholder="Cari alamat di peta..."
              className="w-full pl-9 pr-3 py-2 border border-padang-200 rounded-xl focus:ring-2 focus:ring-padang-500 focus:border-padang-500 outline-none text-sm"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-padang-400 animate-spin" />
            )}
          </div>
          <button
            type="button"
            onClick={getCurrentLocation}
            disabled={locating}
            className={`flex items-center gap-1 px-3 py-2 rounded-xl transition-colors text-xs font-medium ${
              locating
                ? 'bg-padang-600 text-white cursor-wait'
                : 'bg-padang-100 text-padang-700 hover:bg-padang-200'
            }`}
            title="Gunakan lokasi saat ini"
          >
            {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{locating ? 'Mencari...' : 'Lokasi Saya'}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowMap(!showMap)}
            className={`flex items-center gap-1 px-3 py-2 rounded-xl transition-colors text-xs font-medium ${
              showMap 
                ? 'bg-padang-600 text-white' 
                : 'bg-padang-100 text-padang-700 hover:bg-padang-200'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Peta</span>
          </button>
        </div>

        {/* Search results dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-padang-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
            {searchResults.map((result) => (
              <button
                key={result.place_id}
                type="button"
                onClick={() => selectLocation(result)}
                className="w-full text-left px-4 py-2.5 hover:bg-padang-50 border-b border-padang-50 last:border-0 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-padang-500 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-padang-800 leading-relaxed">{result.display_name}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      {locationError && (
        <p className="text-xs text-spice-600 leading-relaxed">
          {locationError}
        </p>
      )}

      {/* Map embed */}
      {showMap && (
        <div className="rounded-xl overflow-hidden border border-padang-200 shadow-sm animate-fade-in">
          <iframe
            src={mapUrl}
            width="100%"
            height="200"
            style={{ border: 0 }}
            loading="lazy"
            title="Pilih lokasi pengiriman"
            className="w-full"
          />
          {hasActivePoint && (
            <div className="bg-padang-50 px-3 py-2 flex items-start gap-2 border-t border-padang-100">
              <MapPin className="w-3.5 h-3.5 text-padang-600 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 space-y-0.5">
                <p className="text-xs font-semibold text-padang-800">
                  {pointLabel}: {activeLat.toFixed(6)}, {activeLng.toFixed(6)}
                </p>
                {pointAddress && (
                  <p className="text-[11px] text-padang-700 leading-relaxed line-clamp-2">
                    {pointAddress}
                  </p>
                )}
                {previewLocation ? (
                  <p className="text-[11px] text-gold-700">
                    Pilih hasil pencarian untuk mengunci titik ini.
                  </p>
                ) : locationAccuracy !== null && (
                  <p className="text-[11px] text-padang-600">
                    Akurasi perangkat sekitar {Math.round(locationAccuracy)} meter.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
