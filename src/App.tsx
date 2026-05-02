import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Login from './pages/Login';
import Register from './pages/Register';
import CustomerLogin from './pages/CustomerLogin';
import CustomerRegister from './pages/CustomerRegister';
import LandingPage from './pages/LandingPage';
import Layout from './components/Layout';
import CustomerLayout from './components/CustomerLayout';
import Dashboard from './pages/Dashboard';
import Materials from './pages/Materials';
import Products from './pages/Products';
import Sales from './pages/Sales';
import Waste from './pages/Waste';
import UserApproval from './pages/UserApproval';
import ManageUsers from './pages/ManageUsers';
import ManageStores from './pages/ManageStores';
import ManageMenus from './pages/ManageMenus';
import StoreSettings from './pages/StoreSettings';
import AdminOrders from './pages/AdminOrders';
import CustomerDashboard from './pages/CustomerDashboard';
import CustomerOrders from './pages/CustomerOrders';
import ManageBanners from './pages/ManageBanners';
import PullToRefresh from './components/PullToRefresh';
import { Loader2 } from 'lucide-react';
import { APP_VERSION } from './version';

function AppContent() {
    const { user, loading, signOut, isCustomer } = useAuth();
    const [currentPage, setCurrentPage] = useState(() => localStorage.getItem('currentPage') || 'home');
    const [authPage, setAuthPage] = useState<'login' | 'register' | 'customer-login' | 'customer-register' | 'kasir-login' | 'kasir-register'>('customer-login');

    // Hidden kasir login: listen for "kasir" typed on homepage
    const [kasirBuffer, setKasirBuffer] = useState('');

    const handleKasirCheat = useCallback((e: KeyboardEvent) => {
        if (currentPage !== 'home') return;
        // Only track lowercase letters
        const char = e.key.toLowerCase();
        if (char.length !== 1 || !/[a-z]/.test(char)) {
            setKasirBuffer('');
            return;
        }
        
        const newBuffer = (kasirBuffer + char).slice(-5); // keep last 5 chars
        setKasirBuffer(newBuffer);
        
        if (newBuffer === 'kasir') {
            triggerKasirCheat();
            setKasirBuffer('');
        }
    }, [currentPage, kasirBuffer]);

    const triggerKasirCheat = () => {
        setAuthPage('kasir-login');
        setCurrentPage('login');
    };

    useEffect(() => {
        window.addEventListener('keydown', handleKasirCheat);
        return () => window.removeEventListener('keydown', handleKasirCheat);
    }, [handleKasirCheat]);

    // Update theme-color meta tag and HTML background based on current page
    useEffect(() => {
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            if (currentPage === 'home') {
                metaThemeColor.setAttribute('content', '#411507'); // padang-950
                document.documentElement.style.backgroundColor = '#411507';
            } else if (isCustomer()) {
                metaThemeColor.setAttribute('content', '#ffffff');
                document.documentElement.style.backgroundColor = '#ffffff';
            } else {
                const isDark = document.documentElement.classList.contains('dark');
                metaThemeColor.setAttribute('content', isDark ? '#1e293b' : '#ffffff');
                document.documentElement.style.backgroundColor = isDark ? '#1e293b' : '#ffffff';
            }
        }
    }, [currentPage, user]);

    useEffect(() => {
        const checkVersion = async () => {
            try {
                // Prevent infinite reload loops if update fails
                if (sessionStorage.getItem('isUpdatingVersion')) {
                    sessionStorage.removeItem('isUpdatingVersion');
                    return;
                }

                const response = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
                const data = await response.json();
                
                if (data.version && data.version !== APP_VERSION) {
                    console.log(`New version detected: ${data.version} (current: ${APP_VERSION}). Updating...`);
                    
                    // Mark that we are attempting to update
                    sessionStorage.setItem('isUpdatingVersion', 'true');

                    // 1. Unregister all service workers
                    if ('serviceWorker' in navigator) {
                        const registrations = await navigator.serviceWorker.getRegistrations();
                        for (const registration of registrations) {
                            await registration.unregister();
                        }
                    }

                    // 2. Clear all caches
                    if ('caches' in window) {
                        const cacheNames = await caches.keys();
                        await Promise.all(cacheNames.map(name => caches.delete(name)));
                    }

                    // 3. Hard reload from server
                    window.location.reload();
                }
            } catch (err) {
                console.error('Failed to check version:', err);
            }
        };

        // Check on mount
        checkVersion();

        // Also check every 30 minutes if the app is left open
        const interval = setInterval(checkVersion, 30 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    // When user logs in as customer, redirect to customer dashboard
    useEffect(() => {
        if (user && isCustomer() && (currentPage === 'login' || currentPage === 'home')) {
            setCurrentPage('customer-dashboard');
        } else if (user && !isCustomer() && (currentPage === 'login' || currentPage === 'home')) {
            setCurrentPage('dashboard');
        }
    }, [user]);

    // Persist current page
    useEffect(() => {
        if (currentPage !== 'login') {
            localStorage.setItem('currentPage', currentPage);
        }
    }, [currentPage]);

    const renderAdminPage = () => {
        switch (currentPage) {
            case 'dashboard':
                return <Dashboard onNavigate={setCurrentPage} />;
            case 'materials':
                return <Materials />;
            case 'products':
                return <Products />;
            case 'sales':
                return <Sales />;
            case 'waste':
                return <Waste />;
            case 'approval':
                return <UserApproval />;
            case 'manage-users':
                return <ManageUsers />;
            case 'manage-stores':
                return <ManageStores />;
            case 'manage-menus':
                return <ManageMenus />;
            case 'manage-banners':
                return <ManageBanners />;
            case 'store-settings':
                return <StoreSettings />;
            case 'admin-orders':
                return <AdminOrders isHistory={false} />;
            case 'admin-history':
                return <AdminOrders isHistory={true} />;
            default:
                return <Dashboard onNavigate={setCurrentPage} />;
        }
    };

    const renderCustomerPage = () => {
        switch (currentPage) {
            case 'customer-dashboard':
                return <CustomerDashboard />;
            case 'customer-orders':
                return <CustomerOrders isHistory={false} />;
            case 'customer-history':
                return <CustomerOrders isHistory={true} />;
            default:
                return <CustomerDashboard />;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            </div>
        );
    }

    // Landing page (home) — accessible whether logged in or not
    if (currentPage === 'home') {
        return (
            <LandingPage
                user={user}
                onGoToCustomerLogin={() => {
                    setAuthPage('customer-login');
                    setCurrentPage('login');
                }}
                onGoToDashboard={() => {
                    if (user && isCustomer()) {
                        setCurrentPage('customer-dashboard');
                    } else {
                        setCurrentPage('dashboard');
                    }
                }}
                onLogout={signOut}
                onSecretClick={triggerKasirCheat}
            />
        );
    }

    // Not logged in — show login/register pages
    if (!user) {
        // Customer Login
        if (currentPage === 'login' && authPage === 'customer-login') {
            return (
                <CustomerLogin
                    onGoToRegister={() => setAuthPage('customer-register')}
                    onGoToHome={() => setCurrentPage('home')}
                />
            );
        }
        // Customer Register
        if (authPage === 'customer-register') {
            return (
                <CustomerRegister
                    onBackToLogin={() => setAuthPage('customer-login')}
                    onGoToHome={() => setCurrentPage('home')}
                />
            );
        }
        // Kasir (Admin) Login — hidden route
        if (currentPage === 'login' && authPage === 'kasir-login') {
            return (
                <Login
                    onGoToRegister={() => setAuthPage('kasir-register')}
                    onGoToHome={() => setCurrentPage('home')}
                />
            );
        }
        // Kasir (Admin) Register
        if (authPage === 'kasir-register') {
            return (
                <Register
                    onBackToLogin={() => setAuthPage('kasir-login')}
                    onGoToHome={() => setCurrentPage('home')}
                />
            );
        }
        // Fallback: go to home
        setCurrentPage('home');
        return null;
    }

    // Logged in as CUSTOMER — show customer layout
    if (isCustomer()) {
        return (
            <CustomerLayout currentPage={currentPage} onNavigate={setCurrentPage}>
                {renderCustomerPage()}
            </CustomerLayout>
        );
    }

    // Logged in as ADMIN/MEMBER — show admin Layout with HPP KASIR pages
    return (
        <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
            {renderAdminPage()}
        </Layout>
    );
}

function App() {
    const handleRefresh = async () => {
        // Clear session storage flag to allow version update checks again if needed
        sessionStorage.removeItem('isUpdatingVersion');
        window.location.reload();
    };

    return (
        <ThemeProvider>
            <PullToRefresh onRefresh={handleRefresh}>
                <AppContent />
            </PullToRefresh>
        </ThemeProvider>
    );
}

export default App;
