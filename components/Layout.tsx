import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { LogOut, LayoutDashboard, Settings, CreditCard, ShieldCheck, LineChart, Server } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const NavItem = ({ to, icon: Icon, label, active }: { to: string; icon: any; label: string; active: boolean }) => (
  <Link
    to={to}
    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
      active 
        ? 'bg-brand-50 text-brand-700' 
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`}
  >
    <Icon className={`w-5 h-5 ${active ? 'text-brand-600' : 'text-gray-400'}`} />
    {label}
  </Link>
);

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) return <>{children}</>;

  const isCustomer = user.role === UserRole.CUSTOMER;
  const isAdmin = user.role === UserRole.ADMIN;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 flex flex-col fixed md:relative z-20 h-full">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2 font-bold text-2xl text-brand-500">
            <span>KOSMA</span>
          </div>
          <div className="mt-2 text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded inline-block">
            {isAdmin ? 'ADMIN AREA' : 'CUSTOMER AREA'}
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {isCustomer && (
            <>
              <NavItem to="/dashboard" icon={LayoutDashboard} label="Overview" active={location.pathname === '/dashboard'} />
              <NavItem to="/dashboard/subscription" icon={CreditCard} label="Subscription" active={location.pathname === '/dashboard/subscription'} />
            </>
          )}

          {isAdmin && (
            <>
              <NavItem to="/admin" icon={LayoutDashboard} label="Dashboard" active={location.pathname === '/admin'} />
              <NavItem to="/admin/users" icon={ShieldCheck} label="Users & Licenses" active={location.pathname === '/admin/users'} />
              <NavItem to="/admin/marketing" icon={LineChart} label="Marketing Insights" active={location.pathname === '/admin/marketing'} />
              <NavItem to="/admin/system" icon={Server} label="System Health" active={location.pathname === '/admin/system'} />
            </>
          )}

          <div className="pt-4 mt-4 border-t border-gray-100">
             <NavItem 
                to={isCustomer ? "/dashboard/settings" : "/admin/settings"} 
                icon={Settings} 
                label="Settings" 
                active={location.pathname.includes('settings')} 
             />
          </div>
        </nav>

        <div className="p-4 border-t border-gray-200 bg-gray-50 md:bg-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold">
              {user.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};