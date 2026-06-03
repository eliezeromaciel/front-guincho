import { useEffect, useRef, useState } from 'react';
import { useFetcher, Link } from 'react-router';
import { requireAdmin } from '~/services/session.server';
import { postNovoFuncionario } from '~/services/funcionarios.server';
import type { Route } from './+types/cadastro-usuario';

export const meta = () => [{ title: 'Cadastrar Usuário — GuinchoFácil' }];

export const loader = async ({ request }: Route.LoaderArgs) => {
  await requireAdmin(request);
  return {};
};

export const action = async ({ request }: Route.ActionArgs) => {
  await requireAdmin(request);
  const formData = await request.formData();
  const nome = (formData.get('nome') as string)?.trim();
  const email = (formData.get('email') as string)?.trim();
  const senha = formData.get('senha') as string;
  const roleRaw = formData.get('role');
  const motoristaRaw = formData.get('motorista');

  const ROLES_VALIDOS = ['admin', 'readonly'] as const;
  const MOTORISTAS_VALIDOS = ['A', 'B', 'C', 'none'] as const;

  if (!ROLES_VALIDOS.includes(roleRaw as any)) {
    return { ok: false as const, error: 'Perfil de acesso inválido.' };
  }
  if (!MOTORISTAS_VALIDOS.includes(motoristaRaw as any)) {
    return { ok: false as const, error: 'Designação de caminhão inválida.' };
  }

  const role = roleRaw as 'admin' | 'readonly';
  const motorista = motoristaRaw as 'A' | 'B' | 'C' | 'none';

  if (!nome || nome.length < 3 || nome.length > 50) {
    return { ok: false as const, error: 'Nome deve ter entre 3 e 50 caracteres.' };
  }
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !EMAIL_RE.test(email)) {
    return { ok: false as const, error: 'Endereço de e-mail inválido.' };
  }
  if (!senha || senha.length < 8) {
    return { ok: false as const, error: 'A senha deve conter no mínimo 8 caracteres.' };
  }

  const result = await postNovoFuncionario(nome, email, senha, role, motorista);
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }

  return { ok: true as const };
};

export default function CadastroUsuario() {
  const fetcher = useFetcher<typeof action>();
  const formRef = useRef<HTMLFormElement>(null);
  const [role, setRole] = useState<'admin' | 'readonly'>('readonly');
  const wasSubmitting = useRef(false);

  useEffect(() => {
    if (fetcher.state === 'submitting') {
      wasSubmitting.current = true;
    }
    if (fetcher.state === 'idle' && wasSubmitting.current) {
      wasSubmitting.current = false;
      if (fetcher.data?.ok) {
        alert('Novo usuário cadastrado com sucesso!');
        formRef.current?.reset();
        setRole('readonly');
      } else if (fetcher.data && !fetcher.data.ok) {
        alert(`Erro: ${fetcher.data.error}`);
      }
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <div className="min-vh-100 bg-dark text-white py-5 px-3 d-flex align-items-center justify-content-center">
      <div 
        className="w-100 rounded-4 p-4 p-md-5 border border-secondary shadow-lg bg-opacity-75 bg-black" 
        style={{ maxWidth: '600px', backdropFilter: 'blur(10px)' }}
      >
        <div className="d-flex align-items-center justify-content-between mb-4">
          <Link to="/" className="btn btn-outline-light btn-sm rounded-pill px-3">
            <i className="bi bi-arrow-left me-1"></i> Voltar
          </Link>
          <h2 className="h4 fw-bold m-0 text-gradient bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
            GuinchoFácil
          </h2>
        </div>

        <h1 className="h3 fw-bold mb-1 text-white">Cadastrar Funcionário</h1>
        <p className="text-secondary mb-4" style={{ fontSize: '0.95rem' }}>
          Registre novos motoristas ou administradores de forma segura.
        </p>

        <fetcher.Form ref={formRef} method="post" className="needs-validation">
          <div className="mb-3">
            <label className="form-label fw-semibold text-light">Nome Completo</label>
            <input
              type="text"
              name="nome"
              className="form-control form-control-lg bg-dark text-white border-secondary focus:border-primary text-base min-h-[48px]"
              placeholder="Ex: Daniel Silva"
              required
              minLength={3}
              maxLength={50}
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold text-light">E-mail</label>
            <input
              type="email"
              name="email"
              className="form-control form-control-lg bg-dark text-white border-secondary focus:border-primary text-base min-h-[48px]"
              placeholder="Ex: daniel@guinchofacil.com"
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold text-light">Senha Provisória</label>
            <input
              type="password"
              name="senha"
              className="form-control form-control-lg bg-dark text-white border-secondary focus:border-primary text-base min-h-[48px]"
              placeholder="No mínimo 8 caracteres"
              required
              minLength={8}
            />
          </div>

          <div className="row">
            <div className="col-12 col-md-6 mb-3">
              <label className="form-label fw-semibold text-light">Perfil de Acesso</label>
              <select
                name="role"
                className="form-select form-select-lg bg-dark text-white border-secondary focus:border-primary text-base min-h-[48px]"
                value={role}
                onChange={(e) => setRole(e.target.value as 'admin' | 'readonly')}
                required
              >
                <option value="readonly">Apenas Leitor / Motorista</option>
                <option value="admin">Administrador (Permissão Total)</option>
              </select>
            </div>

            <div className="col-12 col-md-6 mb-3">
              <label className="form-label fw-semibold text-light">Designação de Caminhão</label>
              <select
                name="motorista"
                className="form-select form-select-lg bg-dark text-white border-secondary focus:border-primary text-base min-h-[48px]"
                required
                defaultValue="none"
              >
                {role === 'readonly' ? (
                  <>
                    <option value="A">Motorista A (Gabriel)</option>
                    <option value="B">Motorista B (Daniel)</option>
                    <option value="C">Motorista C (Novo Caminhão)</option>
                  </>
                ) : null}
                <option value="none">Nenhum / Apenas Administrativo</option>
              </select>
            </div>
          </div>

          {fetcher.data && !fetcher.data.ok ? (
            <div className="alert alert-danger py-2 px-3 mb-3 border-0 bg-danger bg-opacity-25 text-danger rounded-3" role="alert">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {fetcher.data.error}
            </div>
          ) : null}

          <div className="d-grid mt-4">
            <button
              type="submit"
              className="btn btn-primary btn-lg fw-bold rounded-3 min-h-[48px]"
              disabled={fetcher.state !== 'idle'}
            >
              {fetcher.state !== 'idle' ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Salvando no Firebase...
                </>
              ) : (
                'Cadastrar Funcionário'
              )}
            </button>
          </div>
        </fetcher.Form>
      </div>
    </div>
  );
}
