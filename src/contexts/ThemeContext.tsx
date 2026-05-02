import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export const THEME_COLORS: Record<string, { name: string; primary: string; primaryHover: string; gradient: string; sidebar: string; sidebarHover: string; accent: string; badge: string }> = {
    blue: {
        name: 'Biru',
        primary: '#3b82f6',
        primaryHover: '#2563eb',
        gradient: 'from-blue-600 to-cyan-600',
        sidebar: 'from-slate-900 to-slate-800',
        sidebarHover: 'from-blue-400 to-cyan-400',
        accent: '#06b6d4',
        badge: 'shadow-blue-500/30',
    },
    emerald: {
        name: 'Hijau',
        primary: '#10b981',
        primaryHover: '#059669',
        gradient: 'from-emerald-600 to-teal-600',
        sidebar: 'from-slate-900 to-slate-800',
        sidebarHover: 'from-emerald-400 to-teal-400',
        accent: '#14b8a6',
        badge: 'shadow-emerald-500/30',
    },
    purple: {
        name: 'Ungu',
        primary: '#8b5cf6',
        primaryHover: '#7c3aed',
        gradient: 'from-purple-600 to-indigo-600',
        sidebar: 'from-slate-900 to-slate-800',
        sidebarHover: 'from-purple-400 to-indigo-400',
        accent: '#6366f1',
        badge: 'shadow-purple-500/30',
    },
    rose: {
        name: 'Merah Muda',
        primary: '#f43f5e',
        primaryHover: '#e11d48',
        gradient: 'from-rose-600 to-pink-600',
        sidebar: 'from-slate-900 to-slate-800',
        sidebarHover: 'from-rose-400 to-pink-400',
        accent: '#ec4899',
        badge: 'shadow-rose-500/30',
    },
    amber: {
        name: 'Kuning',
        primary: '#f59e0b',
        primaryHover: '#d97706',
        gradient: 'from-amber-600 to-orange-600',
        sidebar: 'from-slate-900 to-slate-800',
        sidebarHover: 'from-amber-400 to-orange-400',
        accent: '#f97316',
        badge: 'shadow-amber-500/30',
    },
    slate: {
        name: 'Abu-abu',
        primary: '#64748b',
        primaryHover: '#475569',
        gradient: 'from-slate-600 to-gray-600',
        sidebar: 'from-slate-900 to-slate-800',
        sidebarHover: 'from-slate-400 to-gray-400',
        accent: '#6b7280',
        badge: 'shadow-slate-500/30',
    },
};

interface ThemeContextType {
    darkMode: boolean;
    themeColor: string;
    toggleDarkMode: () => void;
    setThemeColor: (color: string) => void;
    theme: typeof THEME_COLORS['blue'];
}

const ThemeContext = createContext<ThemeContextType>({
    darkMode: false,
    themeColor: 'blue',
    toggleDarkMode: () => {},
    setThemeColor: () => {},
    theme: THEME_COLORS.blue,
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    const [darkMode, setDarkMode] = useState(false);
    const [themeColor, setThemeColorState] = useState('blue');

    // Load preferences from user on mount
    useEffect(() => {
        if (user) {
            // Load from localStorage first for instant rendering
            const stored = localStorage.getItem('hpp_kasir_prefs');
            if (stored) {
                try {
                    const prefs = JSON.parse(stored);
                    setDarkMode(prefs.dark_mode ?? false);
                    setThemeColorState(prefs.theme_color ?? 'blue');
                } catch { /* ignore */ }
            }

            // Then sync from DB
            supabase
                .from('users')
                .select('dark_mode, theme_color')
                .eq('id', user.id)
                .single()
                .then(({ data }) => {
                    if (data) {
                        setDarkMode(data.dark_mode);
                        setThemeColorState(data.theme_color);
                        localStorage.setItem('hpp_kasir_prefs', JSON.stringify(data));
                    }
                });
        }
    }, [user]);

    // Apply dark mode class to <html>
    useEffect(() => {
        document.documentElement.classList.toggle('dark', darkMode);
    }, [darkMode]);

    // Apply CSS variables for theme color
    useEffect(() => {
        const t = THEME_COLORS[themeColor] || THEME_COLORS.blue;
        document.documentElement.style.setProperty('--color-primary', t.primary);
        document.documentElement.style.setProperty('--color-primary-hover', t.primaryHover);
        document.documentElement.style.setProperty('--color-accent', t.accent);
    }, [themeColor]);

    const persistPrefs = useCallback(async (dm: boolean, tc: string) => {
        if (!user) return;
        localStorage.setItem('hpp_kasir_prefs', JSON.stringify({ dark_mode: dm, theme_color: tc }));
        await supabase.from('users').update({ dark_mode: dm, theme_color: tc }).eq('id', user.id);
    }, [user]);

    const toggleDarkMode = useCallback(() => {
        setDarkMode((prev) => {
            const next = !prev;
            persistPrefs(next, themeColor);
            return next;
        });
    }, [themeColor, persistPrefs]);

    const setThemeColor = useCallback((color: string) => {
        setThemeColorState(color);
        persistPrefs(darkMode, color);
    }, [darkMode, persistPrefs]);

    const theme = THEME_COLORS[themeColor] || THEME_COLORS.blue;

    return (
        <ThemeContext.Provider value={{ darkMode, themeColor, toggleDarkMode, setThemeColor, theme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
