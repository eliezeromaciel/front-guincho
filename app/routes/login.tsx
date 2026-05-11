import { useFetcher } from 'react-router';
import { redirect } from 'react-router';
import { criarCookieSessao, verificarSessao } from '~/services/session.server';
import type { Route } from './+types/login';

export const meta = () => [{ title: 'Login — GuinchoFácil' }];

export const loader = async ({ request }: Route.LoaderArgs) => {
  if (await verificarSessao(request)) throw redirect('/');
  return {};
};

export const action = async ({ request }: Route.ActionArgs) => {
  const formData = await request.formData();
  const login = (formData.get('login') as string)?.trim();
  const senha = (formData.get('senha') as string)?.trim();

  if (login !== process.env.APP_LOGIN || senha !== process.env.APP_PASSWORD) {
    return { ok: false as const, error: 'Login ou senha incorretos.' };
  }

  const cookieHeader = await criarCookieSessao();
  return redirect('/', { headers: { 'Set-Cookie': cookieHeader } });
};

export default function Login() {
  const fetcher = useFetcher<typeof action>();
  const erro = fetcher.data && !fetcher.data.ok ? fetcher.data.error : null;

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-dark-subtle">
      <div className="bg-white rounded-3 shadow-lg p-4 mx-3 w-100" style={{ maxWidth: 380 }}>
        <h1 className="h4 fw-bold text-center mb-1">GuinchoFácil</h1>
        <p className="text-secondary text-center mb-4" style={{ fontSize: '0.9rem' }}>
          Acesso restrito
        </p>

        <fetcher.Form method="post">
          <div className="mb-3">
            <label className="form-label fw-semibold">Login</label>
            <input
              className="form-control form-control-lg"
              type="text"
              name="login"
              autoComplete="username"
              autoFocus
              required
            />
          </div>

          <div className="mb-4">
            <label className="form-label fw-semibold">Senha</label>
            <input
              className="form-control form-control-lg"
              type="password"
              name="senha"
              autoComplete="current-password"
              required
            />
          </div>

          {erro && (
            <p className="text-danger small mb-3 text-center">{erro}</p>
          )}

          <div className="d-grid">
            <button
              type="submit"
              className="btn btn-primary btn-lg fw-semibold"
              disabled={fetcher.state !== 'idle'}
            >
              {fetcher.state !== 'idle' ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </fetcher.Form>
      </div>
    </div>
  );
}
