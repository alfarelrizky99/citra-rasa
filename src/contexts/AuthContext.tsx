import { createContext, useContext, useEffect, useState } from 'react';
import { encryptData, decryptData } from '../lib/crypto';

export interface AuthUser {
    id: string;
    email: string;
    name: string | null;
    role: string;
    status: string;
    store_id: string;
    store_name: string;
}

interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
    signIn: (userData: AuthUser) => void;
    signOut: () => void;
    isAdmin: () => boolean;
    isSuperAdmin: () => boolean;
    isCustomer: () => boolean;
}

const STORAGE_KEY = 'hpp_kasir_user';

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    signIn: () => {},
    signOut: () => {},
    isAdmin: () => false,
    isSuperAdmin: () => false,
    isCustomer: () => false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadUser = async () => {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                try {
                    // Try decrypting (new encrypted format)
                    const decrypted = await decryptData(stored);
                    setUser(JSON.parse(decrypted));
                } catch {
                    // Fallback: try parsing as plain JSON (old format / migration)
                    try {
                        const parsed = JSON.parse(stored);
                        setUser(parsed);
                        // Re-encrypt in new format
                        const encrypted = await encryptData(JSON.stringify(parsed));
                        localStorage.setItem(STORAGE_KEY, encrypted);
                    } catch {
                        console.error('Failed to parse user session');
                        localStorage.removeItem(STORAGE_KEY);
                    }
                }
            }
            setLoading(false);
        };
        loadUser();
    }, []);

    const signIn = async (userData: AuthUser) => {
        setUser(userData);
        try {
            const encrypted = await encryptData(JSON.stringify(userData));
            localStorage.setItem(STORAGE_KEY, encrypted);
        } catch {
            // Fallback to plain (should not happen in modern browsers)
            localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
        }
    };

    const signOut = () => {
        setUser(null);
        localStorage.removeItem(STORAGE_KEY);
    };

    const isAdmin = () => user?.role === 'admin' || user?.role === 'superadmin';
    const isSuperAdmin = () => user?.role === 'superadmin';
    const isCustomer = () => user?.role === 'pelanggan';

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signOut, isAdmin, isSuperAdmin, isCustomer }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
