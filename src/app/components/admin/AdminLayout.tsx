import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { LayoutDashboard, Users, Receipt, ArrowDownRight, Settings, LogOut, UserCheck, Menu } from 'lucide-react';
import { Logo } from '../Logo';
import { useAuthContext } from '../../../context/AuthProvider';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';
import { useState } from 'react';

interface AdminLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function AdminLayout({ title, subtitle, children }: AdminLayoutProps) {
  const navigate = useNavigate();
  const { logout } = useAuthContext();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleNavigate = () => {
    setMobileMenuOpen(false);
  };

  const navItems = [
    { id: 'overview', icon: LayoutDashboard, label: 'Overview', path: '/admin' },
    { id: 'users', icon: Users, label: 'User Management', path: '/admin/users' },
    { id: 'transactions', icon: Receipt, label: 'Transactions', path: '/admin/transactions' },
    { id: 'deposits', icon: ArrowDownRight, label: 'Deposits', path: '/admin/deposits' },
    { id: 'settings', icon: Settings, label: 'Settings', path: '/admin/settings' },
  ];

  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-[#00b388] flex items-center justify-center">
            <Logo innerClassName="text-white" className="w-5 h-5" />
          </div>
          <h1 className="text-lg tracking-tight font-semibold">Chimehubs</h1>
        </div>
        <p className="text-xs text-muted-foreground ml-10">Admin Command Center</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              onClick={onNavigate}
              className={({ isActive }) =>
                `w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-[#00b388] text-white shadow-lg shadow-[#00b388]/20'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-accent">
          <div className="w-10 h-10 rounded-full bg-[#00b388] flex items-center justify-center">
            <UserCheck className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate font-semibold">Admin User</p>
            <p className="text-xs text-muted-foreground truncate">support@chimafinance.com</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 mt-3 p-3 text-sm text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      <motion.aside
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="hidden lg:block lg:w-72 border-r border-border bg-card"
      >
        <SidebarContent />
      </motion.aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <button
                    className="lg:hidden w-10 h-10 rounded-lg border border-border flex items-center justify-center hover:bg-accent transition-colors"
                    title="Open admin menu"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-72">
                  <SidebarContent onNavigate={handleNavigate} />
                </SheetContent>
              </Sheet>

              <div className="min-w-0">
                <h2 className="text-xl font-semibold truncate">{title}</h2>
                {subtitle && <p className="text-sm text-muted-foreground truncate">{subtitle}</p>}
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-accent transition-colors text-sm"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}


