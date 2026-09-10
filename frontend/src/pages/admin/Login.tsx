import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { AlertTriangle, Lock, Mail, Soup } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getApiErrorMessage } from '../../services/api';
import { Button } from '../../components/ui/Button';

export function AdminLogin() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-broth-900 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-cream-50 p-8 shadow-floating">
        <div className="mb-6 text-center">
          <Soup size={36} strokeWidth={1.5} className="mx-auto text-brand-500" aria-hidden="true" />
          <h1 className="mt-2 font-display text-2xl font-semibold text-broth-900">Soparia da Lê</h1>
          <p className="text-sm text-broth-700">Painel administrativo</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-semibold text-broth-900">
              E-mail
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-broth-800/20 px-3 py-3 focus-within:border-brand-500">
              <Mail size={18} className="text-broth-700" />
              <input
                id="email"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full outline-none"
                placeholder="admin@sopariadale.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-semibold text-broth-900">
              Senha
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-broth-800/20 px-3 py-3 focus-within:border-brand-500">
              <Lock size={18} className="text-broth-700" />
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <p className="flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertTriangle size={16} /> {error}
            </p>
          )}

          <Button type="submit" size="lg" isLoading={isSubmitting}>
            ENTRAR
          </Button>
        </form>
      </div>
    </div>
  );
}
