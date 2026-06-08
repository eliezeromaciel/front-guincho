import { useEffect, useRef, useState } from 'react';
import { useFetcher, Link, useLoaderData } from 'react-router';
import { requireAdmin } from '~/services/session.server';
import { postNovoFuncionario, getFuncionarios, updateFuncionario, deleteFuncionario } from '~/services/funcionarios.server';
import type { Route } from './+types/cadastro-usuario';

export const meta = () => [{ title: 'Cadastrar Usuário — GuinchoFácil' }];

export const loader = async ({ request }: Route.LoaderArgs) => {
  await requireAdmin(request);
  const funcionarios = await getFuncionarios();
  return { funcionarios };
};

export const action = async ({ request }: Route.ActionArgs) => {
  await requireAdmin(request);
  const formData = await request.formData();
  const intent = formData.get('intent') as string;

  if (intent === 'criar') {
    const nome = (formData.get('nome') as string)?.trim();
    const email = (formData.get('email') as string)?.trim();
    const senha = formData.get('senha') as string;
    const roleRaw = formData.get('role');
    const motoristaRaw = formData.get('motorista');

    const ROLES_VALIDOS = ['admin', 'readonly'] as const;
    const MOTORISTAS_VALIDOS = ['A', 'B', 'C', 'none'] as const;

    if (!ROLES_VALIDOS.includes(roleRaw as any)) return { ok: false as const, error: 'Perfil de acesso inválido.' };
    if (!MOTORISTAS_VALIDOS.includes(motoristaRaw as any)) return { ok: false as const, error: 'Designação de caminhão inválida.' };

    const role = roleRaw as 'admin' | 'readonly';
    const motorista = motoristaRaw as 'A' | 'B' | 'C' | 'none';

    if (!nome || nome.length < 3 || nome.length > 50) return { ok: false as const, error: 'Nome deve ter entre 3 e 50 caracteres.' };
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !EMAIL_RE.test(email)) return { ok: false as const, error: 'Endereço de e-mail inválido.' };
    if (!senha || senha.length < 8) return { ok: false as const, error: 'A senha deve conter no mínimo 8 caracteres.' };

    const result = await postNovoFuncionario(nome, email, senha, role, motorista);
    if (!result.ok) return { ok: false as const, error: result.error };

    return { ok: true as const, action: 'criado' };
  }

  if (intent === 'edit-usuario') {
    const uid = formData.get('uid') as string;
    const campo = formData.get('campo') as string;
    const valor = (formData.get('valor') as string).trim();

    if (!uid || !campo || !valor) return { ok: false as const, error: 'Dados inválidos.' };

    let camposUpdate: Record<string, any> = {};

    if (campo === 'nome') {
      if (valor.length < 3 || valor.length > 50) return { ok: false as const, error: 'Nome inválido.' };
      camposUpdate.nome = valor;
    } else if (campo === 'role') {
      if (!['admin', 'readonly'].includes(valor)) return { ok: false as const, error: 'Perfil inválido.' };
      camposUpdate.role = valor;
    } else if (campo === 'motorista') {
      if (!['A', 'B', 'C', 'none'].includes(valor)) return { ok: false as const, error: 'Caminhão inválido.' };
      camposUpdate.motorista = valor;
    } else {
      return { ok: false as const, error: 'Campo não permitido para edição rápida.' };
    }

    const result = await updateFuncionario(uid, camposUpdate);
    if (!result.ok) return { ok: false as const, error: 'Erro ao atualizar funcionário.' };
    return { ok: true as const, action: 'editado' };
  }

  if (intent === 'delete-usuario') {
    const uid = formData.get('uid') as string;
    if (!uid) return { ok: false as const, error: 'ID inválido.' };
    const result = await deleteFuncionario(uid);
    if (!result.ok) return { ok: false as const, error: 'Erro ao excluir funcionário.' };
    return { ok: true as const, action: 'deletado' };
  }

  return { ok: false as const, error: 'Ação desconhecida.' };
};

const inlineInputStyle: React.CSSProperties = {
  background: 'hsl(220 16% 20%)',
  color: 'hsl(0 0% 95%)',
  border: '1.5px solid hsl(217 91% 60%)',
  borderRadius: '6px',
  padding: '4px 8px',
  fontSize: '0.8rem',
  width: '100%',
  outline: 'none',
  boxShadow: '0 0 0 3px hsl(217 91% 60% / 0.2)',
};

const inlineSelectStyle: React.CSSProperties = {
  ...inlineInputStyle,
  padding: '3px 6px',
};

type DeleteTarget = {
  uid: string;
  nome: string;
  email: string;
};

export default function CadastroUsuario() {
  const { funcionarios } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const formRef = useRef<HTMLFormElement>(null);
  const [role, setRole] = useState<'admin' | 'readonly'>('readonly');
  const wasSubmitting = useRef(false);

  // Estados de edição
  const [editingCell, setEditingCell] = useState<{ uid: string; field: string } | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [originalValue, setOriginalValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);

  // Estado de exclusão
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  useEffect(() => {
    if (fetcher.state === 'submitting') {
      wasSubmitting.current = true;
    }
    if (fetcher.state === 'idle' && wasSubmitting.current) {
      wasSubmitting.current = false;
      if (fetcher.data?.ok && fetcher.data.action === 'criado') {
        alert('Novo usuário cadastrado com sucesso!');
        formRef.current?.reset();
        setRole('readonly');
      } else if (fetcher.data && !fetcher.data.ok) {
        alert(`Erro: ${fetcher.data.error}`);
      }
    }
  }, [fetcher.state, fetcher.data]);

  // ── Helpers de Edição ──
  const isCellActive = (uid: string, field: string) =>
    editingCell?.uid === uid && editingCell?.field === field;

  const activateEdit = (uid: string, field: string, currentValue: string) => {
    setEditingCell({ uid, field });
    setEditingValue(currentValue);
    setOriginalValue(currentValue);
    setTimeout(() => {
      inputRef.current?.focus();
      selectRef.current?.focus();
    }, 50);
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditingValue('');
    setOriginalValue('');
  };

  const commitEdit = (uid: string, field: string) => {
    if (editingValue.trim() === originalValue.trim()) {
      cancelEdit();
      return;
    }
    const fd = new FormData();
    fd.append('intent', 'edit-usuario');
    fd.append('uid', uid);
    fd.append('campo', field);
    fd.append('valor', editingValue);
    fetcher.submit(fd, { method: 'post' });
    cancelEdit();
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const fd = new FormData();
    fd.append('intent', 'delete-usuario');
    fd.append('uid', deleteTarget.uid);
    fetcher.submit(fd, { method: 'post' });
    setDeleteTarget(null);
  };

  return (
    <div className="min-vh-100 py-5 px-3 d-flex flex-column align-items-center"
      style={{ background: 'linear-gradient(160deg, hsl(220 20% 5%) 0%, hsl(230 22% 11%) 50%, hsl(260 18% 9%) 100%)' }}
    >
      <div 
        className="w-100 rounded-4 p-4 p-md-5 border border-secondary shadow-lg bg-opacity-75 bg-black mb-4" 
        style={{ maxWidth: '650px', backdropFilter: 'blur(10px)' }}
      >
        <div className="d-flex align-items-center justify-content-between mb-4">
          <Link to="/cadastros" className="btn btn-outline-light btn-sm rounded-pill px-3">
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

        <fetcher.Form ref={formRef} method="post" className="needs-validation mb-5">
          <input type="hidden" name="intent" value="criar" />
          
          <div className="mb-3">
            <label className="form-label fw-semibold text-light">Nome Completo</label>
            <input
              type="text"
              name="nome"
              className="form-control form-control-lg bg-dark text-white border-secondary focus:border-primary text-base min-h-[48px]"
              placeholder="Ex: Daniel Silva"
              required minLength={3} maxLength={50}
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
              required minLength={8}
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
                    <option value="A">Caminhão A</option>
                    <option value="B">Caminhão B</option>
                    <option value="C">Caminhão C</option>
                  </>
                ) : null}
                <option value="none">Nenhum</option>
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

        {/* ── LISTAGEM DE USUÁRIOS ── */}
        <h5 className="border-bottom border-secondary pb-2 mb-3 text-light small fw-bold">
          Funcionários Cadastrados ({funcionarios.length})
        </h5>
        <p className="text-secondary small mb-3" style={{ fontSize: '0.78rem' }}>
          Toque no Nome, Perfil ou Caminhão para editar. E-mail não pode ser editado.
        </p>

        {funcionarios.length === 0 ? (
          <div className="text-center py-4">
            <i className="bi bi-people text-secondary" style={{ fontSize: '2rem' }} />
            <p className="text-secondary mt-2 mb-0">Nenhum funcionário cadastrado.</p>
          </div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {funcionarios.map((f) => (
              <div
                key={f.uid}
                className="d-flex flex-column p-3 rounded-3 border border-secondary"
                style={{ background: 'hsl(220 16% 13%)' }}
              >
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div className="d-flex align-items-center gap-2 flex-fill">
                    <i className="bi bi-person-circle text-secondary" style={{ fontSize: '1.5rem' }} />
                    <div className="flex-fill">
                      {/* Nome Inline */}
                      {isCellActive(f.uid, 'nome') ? (
                        <input
                          ref={inputRef}
                          type="text"
                          value={editingValue}
                          style={inlineInputStyle}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => commitEdit(f.uid, 'nome')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); commitEdit(f.uid, 'nome'); }
                            if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
                          }}
                        />
                      ) : (
                        <span
                          className="fw-bold text-light d-block"
                          style={{ cursor: 'pointer' }}
                          onClick={() => activateEdit(f.uid, 'nome', f.displayName)}
                        >
                          {f.displayName}
                        </span>
                      )}
                      <span className="text-secondary small d-block">{f.email}</span>
                    </div>
                  </div>
                  <button
                    className="btn btn-link p-0 flex-shrink-0 align-self-start"
                    style={{ color: 'hsl(0 84% 55%)', opacity: 0.7 }}
                    title="Excluir funcionário"
                    onClick={() => setDeleteTarget({ uid: f.uid, nome: f.displayName, email: f.email })}
                  >
                    <i className="bi bi-trash3" style={{ fontSize: '1.1rem' }} />
                  </button>
                </div>

                <div className="d-flex align-items-center gap-2 mt-1">
                  {/* Perfil Inline */}
                  {isCellActive(f.uid, 'role') ? (
                    <select
                      ref={selectRef}
                      value={editingValue}
                      style={{ ...inlineSelectStyle, width: 'auto' }}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => commitEdit(f.uid, 'role')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); commitEdit(f.uid, 'role'); }
                        if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
                      }}
                    >
                      <option value="admin">Administrador</option>
                      <option value="readonly">Leitor / Motorista</option>
                    </select>
                  ) : (
                    <span
                      className={`badge ${f.role === 'admin' ? 'bg-primary' : 'bg-secondary'}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => activateEdit(f.uid, 'role', f.role)}
                    >
                      {f.role === 'admin' ? 'Admin' : 'Leitor'}
                    </span>
                  )}

                  {/* Motorista Inline */}
                  {isCellActive(f.uid, 'motorista') ? (
                    <select
                      ref={selectRef}
                      value={editingValue}
                      style={{ ...inlineSelectStyle, width: 'auto' }}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => commitEdit(f.uid, 'motorista')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); commitEdit(f.uid, 'motorista'); }
                        if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
                      }}
                    >
                      <option value="none">Nenhum Caminhão</option>
                      <option value="A">Caminhão A</option>
                      <option value="B">Caminhão B</option>
                      <option value="C">Caminhão C</option>
                    </select>
                  ) : (
                    <span
                      className={`badge ${f.motorista !== 'none' ? 'bg-success' : 'bg-dark border border-secondary'}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => activateEdit(f.uid, 'motorista', f.motorista)}
                    >
                      {f.motorista !== 'none' ? `Caminhão ${f.motorista}` : 'Sem Caminhão'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* ── MODAL DE CONFIRMAÇÃO DE EXCLUSÃO ── */}
      {deleteTarget && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
            backdropFilter: 'blur(4px)',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null); }}
        >
          <div
            style={{
              background: 'hsl(220 18% 12%)', border: '1px solid hsl(0 84% 40%)',
              borderRadius: '16px', padding: '1.5rem', maxWidth: '360px', width: '100%',
              boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
            }}
          >
            <div className="text-center mb-3">
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'hsl(0 84% 20%)', border: '2px solid hsl(0 84% 40%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                <i className="bi bi-person-x-fill text-danger" style={{ fontSize: '1.5rem' }} />
              </div>
            </div>
            <h5 className="text-white fw-bold text-center mb-2">Confirmar Exclusão</h5>
            <p className="text-secondary text-center small mb-1">Você está prestes a excluir o usuário abaixo <strong>(inclusive o login dele)</strong>:</p>
            <div className="text-center mb-4 p-2 rounded-3" style={{ background: 'hsl(0 50% 10%)', border: '1px solid hsl(0 84% 25%)' }}>
              <span className="text-light fw-semibold">{deleteTarget.nome}</span>
              <br />
              <span className="text-danger fw-bold">{deleteTarget.email}</span>
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn-secondary flex-fill rounded-pill fw-semibold" onClick={() => setDeleteTarget(null)}>
                Cancelar
              </button>
              <button
                className="btn flex-fill rounded-pill fw-bold"
                style={{ background: 'linear-gradient(135deg, hsl(0 84% 45%), hsl(0 70% 35%))', color: '#fff', border: 'none' }}
                onClick={confirmDelete}
                disabled={fetcher.state !== 'idle'}
              >
                {fetcher.state !== 'idle'
                  ? <><span className="spinner-border spinner-border-sm me-1" /> Excluindo...</>
                  : <><i className="bi bi-trash3 me-1" /> Confirmar</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
