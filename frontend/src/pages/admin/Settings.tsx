import { useAuth } from '../../contexts/AuthContext';

export function AdminSettings() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-broth-900">Configurações</h1>
        <p className="text-sm text-broth-700">Informações da sua conta de administrador</p>
      </div>

      <div className="max-w-md rounded-2xl bg-white p-5 shadow-card">
        <dl className="flex flex-col gap-3 text-sm">
          <div>
            <dt className="font-semibold text-broth-900">Nome</dt>
            <dd className="text-broth-700">{user?.name}</dd>
          </div>
          <div>
            <dt className="font-semibold text-broth-900">E-mail</dt>
            <dd className="text-broth-700">{user?.email}</dd>
          </div>
          <div>
            <dt className="font-semibold text-broth-900">Perfil</dt>
            <dd className="text-broth-700">{user?.role}</dd>
          </div>
        </dl>
        <p className="mt-4 rounded-xl bg-broth-800/5 p-3 text-xs text-broth-700">
          Para alterar a senha ou os dados do administrador, atualize as variáveis <code>ADMIN_EMAIL</code> e{' '}
          <code>ADMIN_PASSWORD</code> no arquivo <code>.env</code> do backend e rode o seed novamente.
        </p>
      </div>
    </div>
  );
}
