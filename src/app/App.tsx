import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from '../features/landing/Landing';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './components/user/Dashboard';
import AddMoney from './components/user/AddMoney';
import SendMoney from './components/user/SendMoney';
import Activity from './components/user/Activity';
import Savings from './components/user/Savings';
import Profile from './components/user/Profile';
import Cards from './components/user/Cards';
import Chat from './components/user/Chat';
import Withdraw from '../features/withdraw/Withdraw';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminUsers from './components/admin/AdminUsers';
import AdminTransactions from './components/admin/AdminTransactions';
import AdminDeposits from './components/admin/AdminDeposits';
import AdminSettings from './components/admin/AdminSettings';
import InstallPrompt from './components/pwa/InstallPrompt';
import About from '../pages/About';
import PrivacyPolicy from '../pages/PrivacyPolicy';
import Terms from '../pages/Terms';
import Contact from '../pages/Contact';
import Features from '../pages/Features';
import Security from '../pages/Security';
import Pricing from '../pages/Pricing';
import MobileApp from '../pages/MobileApp';
import Careers from '../pages/Careers';
import Press from '../pages/Press';
import Blog from '../pages/Blog';
import Compliance from '../pages/Compliance';
import Licenses from '../pages/Licenses';
import HelpCenter from '../pages/HelpCenter';
import SystemStatus from '../pages/SystemStatus';
import Faqs from '../pages/Faqs';
import { ProtectedRoute, AdminRoute } from '../routes/ProtectedRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/features" element={<Features />} />
        <Route path="/security" element={<Security />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/mobile-app" element={<MobileApp />} />
        <Route path="/about" element={<About />} />
        <Route path="/careers" element={<Careers />} />
        <Route path="/press" element={<Press />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/compliance" element={<Compliance />} />
        <Route path="/licenses" element={<Licenses />} />
        <Route path="/help-center" element={<HelpCenter />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/system-status" element={<SystemStatus />} />
        <Route path="/faqs" element={<Faqs />} />

        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* User Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/add-money"
          element={
            <ProtectedRoute>
              <AddMoney />
            </ProtectedRoute>
          }
        />
        <Route
          path="/send-money"
          element={
            <ProtectedRoute>
              <SendMoney />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/withdraw"
          element={
            <ProtectedRoute>
              <Withdraw />
            </ProtectedRoute>
          }
        />
        <Route
          path="/activity"
          element={
            <ProtectedRoute>
              <Activity />
            </ProtectedRoute>
          }
        />
        <Route
          path="/savings"
          element={
            <ProtectedRoute>
              <Savings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/cards"
          element={
            <ProtectedRoute>
              <Cards />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <AdminUsers />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/transactions"
          element={
            <AdminRoute>
              <AdminTransactions />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/deposits"
          element={
            <AdminRoute>
              <AdminDeposits />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <AdminRoute>
              <AdminSettings />
            </AdminRoute>
          }
        />

        {/* Default Route */}
        <Route path="/*" element={<Navigate to="/" />} />
      </Routes>
      <InstallPrompt />
    </BrowserRouter>
  );
}
