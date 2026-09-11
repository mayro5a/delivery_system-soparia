import { useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  Soup,
  ToggleLeft,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Spinner } from '../components/ui/Spinner';

const navItems = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/orders', label: 'Pedidos', icon: ClipboardList },
  { to: '/admin/products', label: 'Cardápio', icon: Package },
  { to: '/admin/availability', label: 'Disponibilidade', icon: ToggleLeft },
  { to: '/admin/settings', label: 'Configurações', icon: Settings },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/admin/login');
  }

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 py-6">
        <Link to="/admin/dashboard" className="flex items-center gap-2">
          <Soup size={20} strokeWidth={2} className="text-brand-400" aria-hidden="true" />
          <span className="font-display text-lg font-semibold text-white">Soparia da Lê</span>
        </Link>
        {user && <p className="mt-1 truncate text-xs text-cream-200/60">{user.name}</p>}
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                isActive ? 'bg-brand-600 text-white' : 'text-cream-200/80 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-cream-200/80 hover:bg-white/10 hover:text-white"
        >
          <LogOut size={20} />
          Sair
        </button>
      </div>
    </div>
  );
}

export function AdminLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream-100">
        <Spinner label="Verificando sessão..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="min-h-screen bg-cream-100 md:flex">
      {/* Sidebar desktop */}
      <aside className="hidden w-64 shrink-0 bg-broth-900 md:block">
        <SidebarContent />
      </aside>

      {/* Sidebar mobile (slide-over) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-broth-900 shadow-floating">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Fechar menu"
              className="absolute right-3 top-4 rounded-full p-2 text-white hover:bg-white/10"
            >
              <X size={20} />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-broth-800/10 bg-cream-50/95 px-4 py-3 backdrop-blur md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
            className="rounded-lg p-2 text-broth-800 hover:bg-broth-800/10"
          >
            <Menu size={22} />
          </button>
          <span className="font-display font-bold text-broth-900">Painel Admin</span>
          <span className="w-9" />
        </header>
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
