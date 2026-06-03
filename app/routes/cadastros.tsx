import { Link } from 'react-router';
import { requireAdmin } from '~/services/session.server';
import type { Route } from './+types/cadastros';

export const loader = async ({ request }: Route.LoaderArgs) => {
  await requireAdmin(request);
  return {};
};

export default function Cadastros() {
  return (
    <div
      className="min-vh-100 py-5 px-3 d-flex align-items-center justify-content-center"
      style={{ background: 'linear-gradient(160deg, hsl(220 20% 5%) 0%, hsl(230 22% 11%) 50%, hsl(260 18% 9%) 100%)' }}
    >
      <div className="w-100" style={{ maxWidth: '520px' }}>

        <div className="d-flex align-items-center justify-content-between mb-5">
          <Link to="/" className="btn btn-outline-light btn-sm rounded-pill px-3">
            <i className="bi bi-arrow-left me-1" /> Voltar
          </Link>
          <h2 className="h4 fw-bold m-0 gf-text-gradient">GuinchoFácil</h2>
        </div>

        <h1 className="h3 fw-bold text-white mb-1">Cadastros</h1>
        <p className="text-secondary mb-5">Escolha o que deseja cadastrar.</p>

        <div className="d-flex flex-column gap-3">
          <Link to="/novousuario" className="card-link">
            <div className="gf-card hover-glow hover-scale d-flex align-items-center gap-4 p-4" style={{ background: 'hsl(220 16% 13%)' }}>
              <div
                className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                style={{
                  width: 52, height: 52,
                  background: 'linear-gradient(135deg, hsl(45 96% 53%), hsl(32 95% 50%))',
                  boxShadow: '0 4px 12px hsl(45 96% 53% / 0.3)',
                }}
              >
                <i className="bi bi-person-badge text-dark" style={{ fontSize: '1.4rem' }} />
              </div>
              <div>
                <h3 className="h5 fw-bold text-white mb-1">Motorista</h3>
                <p className="text-secondary small mb-0">Crie novos logins administrativos e de motoristas.</p>
              </div>
              <i className="bi bi-chevron-right text-secondary ms-auto" />
            </div>
          </Link>

          <Link to="/veiculos" className="card-link">
            <div className="gf-card hover-glow hover-scale d-flex align-items-center gap-4 p-4" style={{ background: 'hsl(220 16% 13%)' }}>
              <div
                className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                style={{
                  width: 52, height: 52,
                  background: 'linear-gradient(135deg, hsl(199 89% 48%), hsl(180 70% 45%))',
                  boxShadow: '0 4px 12px hsl(199 89% 48% / 0.3)',
                }}
              >
                <i className="bi bi-truck text-white" style={{ fontSize: '1.4rem' }} />
              </div>
              <div>
                <h3 className="h5 fw-bold text-white mb-1">Caminhão da Frota</h3>
                <p className="text-secondary small mb-0">Cadastre os caminhões guincho da empresa.</p>
              </div>
              <i className="bi bi-chevron-right text-secondary ms-auto" />
            </div>
          </Link>
        </div>

      </div>
    </div>
  );
}
