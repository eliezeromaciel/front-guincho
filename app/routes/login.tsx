import { useFetcher } from 'react-router';
import { redirect } from 'react-router';
import { validarECriarSessao, verificarSessao } from '~/services/session.server';
import type { Route } from './+types/login';

export const meta = () => [{ title: 'Login — GuinchoFácil' }];

export const loader = async ({ request }: Route.LoaderArgs) => {
  if (await verificarSessao(request)) throw redirect('/');
  return {};
};

export const action = async ({ request }: Route.ActionArgs) => {
  const formData = await request.formData();
  const email = (formData.get('email') as string)?.trim();
  const senha = formData.get('senha') as string;

  const apiKey = process.env.FIREBASE_WEB_API_KEY;
  if (!apiKey) return { ok: false as const, error: 'Configuração do servidor incompleta.' };

  const resposta = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: senha, returnSecureToken: true }),
    },
  );

  if (!resposta.ok) {
    console.log('[login] falha na autenticação Firebase — status:', resposta.status);
    return { ok: false as const, error: 'E-mail ou senha incorretos.' };
  }

  const { idToken } = (await resposta.json()) as { idToken: string };
  const resultado = await validarECriarSessao(idToken);
  if (!resultado.ok) return { ok: false as const, error: resultado.error };
  return redirect('/', { headers: { 'Set-Cookie': resultado.cookieHeader } });
};

export default function Login() {
  const fetcher = useFetcher<typeof action>();
  const erro = fetcher.data && !fetcher.data.ok ? fetcher.data.error : null;

  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center px-3"
      style={{
        background: 'linear-gradient(160deg, hsl(220 20% 5%) 0%, hsl(230 22% 11%) 50%, hsl(260 18% 9%) 100%)',
      }}
    >
      {/* Background decorative blurs */}
      <div style={{
        position: 'fixed', top: '-15%', left: '-10%', width: '450px', height: '450px',
        borderRadius: '50%', background: 'radial-gradient(circle, hsl(217 91% 55% / 0.08), transparent 70%)',
        filter: 'blur(60px)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed', bottom: '-20%', right: '-10%', width: '500px', height: '500px',
        borderRadius: '50%', background: 'radial-gradient(circle, hsl(265 83% 57% / 0.06), transparent 70%)',
        filter: 'blur(80px)', pointerEvents: 'none',
      }} />

      <div
        className="gf-glass gf-animate-in-up w-100 p-4 p-sm-5"
        style={{ maxWidth: 420 }}
      >
        {/* Brand Identity */}
        <div className="text-center mb-4">
          <div
            className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3 gf-animate-float"
            style={{
              width: 64, height: 64,
              background: 'linear-gradient(135deg, hsl(217 91% 55%), hsl(265 83% 57%))',
              boxShadow: '0 8px 24px hsl(217 91% 55% / 0.3)',
            }}
          >
            <i className="bi bi-truck text-white" style={{ fontSize: '1.6rem' }} />
          </div>
          <h1 className="h3 fw-bold gf-text-gradient mb-1">GuinchoFácil</h1>
          <p className="text-sm mb-0" style={{ color: 'hsl(220 10% 50%)' }}>
            Acesso ao painel de gestão
          </p>
        </div>

        <fetcher.Form method="post">
          <div className="mb-3">
            <label className="form-label fw-semibold text-sm" style={{ color: 'hsl(0 0% 70%)' }}>
              E-mail
            </label>
            <div className="position-relative">
              <i
                className="bi bi-envelope position-absolute"
                style={{ left: 14, top: '50%', transform: 'translateY(-50%)', color: 'hsl(220 10% 40%)', fontSize: '0.95rem' }}
              />
              <input
                className="form-control form-control-lg bg-dark gf-input"
                type="email"
                name="email"
                autoComplete="email"
                autoFocus
                required
                placeholder="voce@guinchofacil.com"
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label fw-semibold text-sm" style={{ color: 'hsl(0 0% 70%)' }}>
              Senha
            </label>
            <div className="position-relative">
              <i
                className="bi bi-shield-lock position-absolute"
                style={{ left: 14, top: '50%', transform: 'translateY(-50%)', color: 'hsl(220 10% 40%)', fontSize: '0.95rem' }}
              />
              <input
                className="form-control form-control-lg bg-dark gf-input"
                type="password"
                name="senha"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          </div>

          {erro && (
            <div className="alert alert-danger py-2 px-3 mb-3 border-0 text-center rounded-3 gf-animate-scale"
              style={{ background: 'hsl(0 84% 55% / 0.12)', color: 'hsl(0 84% 68%)' }}
            >
              <i className="bi bi-exclamation-triangle-fill me-2" />
              <span className="text-sm fw-semibold">{erro}</span>
            </div>
          )}

          <div className="d-grid">
            <button
              type="submit"
              className="btn btn-lg fw-bold gf-btn-primary d-flex align-items-center justify-content-center gap-2"
              disabled={fetcher.state !== 'idle'}
              style={{ minHeight: 52, fontSize: '1.05rem' }}
            >
              {fetcher.state !== 'idle' ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                  Autenticando...
                </>
              ) : (
                <>
                  <i className="bi bi-box-arrow-in-right" />
                  Acessar Painel
                </>
              )}
            </button>
          </div>
        </fetcher.Form>

        <p className="text-center mt-4 mb-0" style={{ color: 'hsl(220 10% 35%)', fontSize: '0.72rem' }}>
          © 2026 GuinchoFácil · Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}
