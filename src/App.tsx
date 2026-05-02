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
import { Loader2 } from 'lucide-react';

function AppContent() {
    const { user, loading, signOut, isCustomer } = useAuth();
    const [currentPage, setCurrentPage] = useState('home');
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
            setAuthPage('kasir-login');
            setCurrentPage('login');
            setKasirBuffer('');
        }
    }, [currentPage, kasirBuffer]);

    useEffect(() => {
        window.addEventListener('keydown', handleKasirCheat);
        return () => window.removeEventListener('keydown', handleKasirCheat);
    }, [handleKasirCheat]);

    // When user logs in as customer, redirect to customer dashboard
    useEffect(() => {
        if (user && isCustomer() && currentPage === 'login') {
            setCurrentPage('customer-dashboard');
        }
    }, [user]);

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
                return <AdminOrders />;
            default:
                return <Dashboard onNavigate={setCurrentPage} />;
        }
    };

    const renderCustomerPage = () => {
        switch (currentPage) {
            case 'customer-dashboard':
                return <CustomerDashboard />;
            case 'customer-orders':
                return <CustomerOrders />;
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
    return (
        <ThemeProvider>
            <AppContent />
        </ThemeProvider>
    );
}

export default App;
