import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from '../features/landing/Landing';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './components/user/Dashboard';
import AddMoney from './components/user/AddMoney';
import Activity from './components/user/Activity';
import Savings from './components/user/Savings';
import Profile from './components/user/Profile';
import Cards from './components/user/Cards';
import Chat from './components/user/Chat';
import PayBills from './components/user/PayBills';
import Betting from './components/user/Betting';
import Cashback from './components/user/Cashback';
import Loan from './components/user/Loan';
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
import { ProtectedRoute } from '../routes/ProtectedRoute';

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
              <Navigate to="/dashboard/withdraw" replace />
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
        <Route
          path="/dashboard/pay-bills"
          element={
            <ProtectedRoute>
              <PayBills />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/betting"
          element={
            <ProtectedRoute>
              <Betting />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/cashback"
          element={
            <ProtectedRoute>
              <Cashback />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/loan"
          element={
            <ProtectedRoute>
              <Loan />
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={<AdminDashboard />}
        />
        <Route
          path="/admin/users"
          element={<AdminUsers />}
        />
        <Route
          path="/admin/transactions"
          element={<AdminTransactions />}
        />
        <Route
          path="/admin/deposits"
          element={<AdminDeposits />}
        />
        <Route
          path="/admin/settings"
          element={<AdminSettings />}
        />

        {/* Default Route */}
        <Route path="/*" element={<Navigate to="/" />} />
      </Routes>
      <InstallPrompt />
    </BrowserRouter>
  );
}
