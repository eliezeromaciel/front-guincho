import { useEffect, useRef, useState } from 'react';
import { useFetcher, useLoaderData, Link } from 'react-router';
import { requireAdmin } from '~/services/session.server';
import { getSeguradoras, postNovaSeguradora, updateSeguradora, deleteSeguradora } from '~/services/seguradoras.server';
import type { Route } from './+types/seguradoras';

export const meta = () => [{ title: 'Seguradoras — GuinchoFácil' }];

export const loader = async ({ request }: Route.LoaderArgs) => {
  await requireAdmin(request);
  const seguradoras = await getSeguradoras();
  return { seguradoras };
};

export const action = async ({ request }: Route.ActionArgs) => {
  await requireAdmin(request);
  const formData = await request.formData();
  const intent = formData.get('intent') as string;

  if (intent === 'criar') {
    const nome = ((formData.get('nome') as string) ?? '').trim();
    if (!nome || nome.length < 2 || nome.length > 60) {
      return { ok: false as const, error: 'Nome deve ter entre 2 e 60 caracteres.' };
    }
    const result = await postNovaSeguradora(nome);
    if (!result.ok) {
      return { ok: false as const, error: 'Erro ao cadastrar seguradora.' };
    }
    return { ok: true as const, action: 'criada' };
  }

  if (intent === 'edit-seguradora') {
    const id = formData.get('id') as string;
    const nome = ((formData.get('nome') as string) ?? '').trim();
    if (!id) return { ok: false as const, error: 'ID inválido.' };
    if (!nome || nome.length < 2 || nome.length > 60) {
      return { ok: false as const, error: 'Nome inválido.' };
    }
    const result = await updateSeguradora(id, nome);
    if (!result.ok) return { ok: false as const, error: 'Erro ao atualizar seguradora.' };
    return { ok: true as const, action: 'editada' };
  }

  if (intent === 'delete-seguradora') {
    const id = formData.get('id') as string;
    if (!id) return { ok: false as const, error: 'ID inválido.' };
    const result = await deleteSeguradora(id);
    if (!result.ok) return { ok: false as const, error: 'Erro ao excluir seguradora.' };
    return { ok: true as const, action: 'deletada' };
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

type DeleteTarget = {
  id: string;
  nome: string;
};

export default function Seguradoras() {
  const { seguradoras } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const formRef = useRef<HTMLFormElement>(null);
  const wasSubmitting = useRef(false);
  const [nome, setNome] = useState('');

  // Estados de edição
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [originalValue, setOriginalValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Estado de exclusão
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  useEffect(() => {
    if (fetcher.state === 'submitting') {
      wasSubmitting.current = true;
    }
    if (fetcher.state === 'idle' && wasSubmitting.current) {
      wasSubmitting.current = false;
      if (fetcher.data?.ok && fetcher.data.action === 'criada') {
        setNome('');
      } else if (fetcher.data && !fetcher.data.ok) {
        alert(`Erro: ${fetcher.data.error}`);
      }
    }
  }, [fetcher.state, fetcher.data]);

  // ── Helpers de Edição ──
  const activateEdit = (id: string, currentValue: string) => {
    setEditingId(id);
    setEditingValue(currentValue);
    setOriginalValue(currentValue);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingValue('');
    setOriginalValue('');
  };

  const commitEdit = (id: string) => {
    if (editingValue.trim() === originalValue.trim()) {
      cancelEdit();
      return;
    }
    const fd = new FormData();
    fd.append('intent', 'edit-seguradora');
    fd.append('id', id);
    fd.append('nome', editingValue);
    fetcher.submit(fd, { method: 'post' });
    cancelEdit();
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const fd = new FormData();
    fd.append('intent', 'delete-seguradora');
    fd.append('id', deleteTarget.id);
    fetcher.submit(fd, { method: 'post' });
    setDeleteTarget(null);
  };

  return (
    <div className="min-vh-100 bg-dark text-white py-5 px-3 d-flex align-items-center justify-content-center">
      <div
        className="w-100 rounded-4 p-4 p-md-5 border border-secondary shadow-lg bg-opacity-75 bg-black mb-4"
        style={{ maxWidth: '600px', backdropFilter: 'blur(10px)' }}
      >
        <div className="d-flex align-items-center justify-content-between mb-4">
          <Link to="/cadastros" className="btn btn-outline-light btn-sm rounded-pill px-3">
            <i className="bi bi-arrow-left me-1" /> Voltar
          </Link>
          <h2 className="h4 fw-bold m-0" style={{ color: 'hsl(270 60% 65%)' }}>
            GuinchoFácil
          </h2>
        </div>

        <div className="d-flex align-items-center gap-2 mb-1">
          <div
            className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
            style={{
              width: 40, height: 40,
              background: 'linear-gradient(135deg, hsl(270 60% 55%), hsl(290 50% 45%))',
              boxShadow: '0 4px 12px hsl(270 60% 55% / 0.3)',
            }}
          >
            <i className="bi bi-shield-check text-white" style={{ fontSize: '1rem' }} />
          </div>
          <h1 className="h3 fw-bold m-0 text-white">Seguradoras</h1>
        </div>
        <p className="text-secondary mb-4" style={{ fontSize: '0.95rem' }}>
          Cadastre e gerencie seguradoras e empresas que contratam serviços de guincho.
        </p>

        {/* Formulário de Cadastro */}
        <fetcher.Form ref={formRef} method="post" className="mb-5">
          <input type="hidden" name="intent" value="criar" />
          <h5 className="gf-section-title">Nova Seguradora</h5>
          <div className="d-flex flex-column flex-sm-row gap-2">
            <input
              type="text"
              name="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="form-control form-control-lg bg-dark text-white border-secondary focus:border-primary text-base min-h-[48px]"
              placeholder="Nome (ex: AGV, Protefort...)"
              required minLength={2} maxLength={60}
            />
            <button
              type="submit"
              className="btn btn-lg fw-bold rounded-3 flex-shrink-0 px-4"
              style={{ background: 'linear-gradient(135deg, hsl(270 60% 55%), hsl(290 50% 45%))', color: '#fff', border: 'none' }}
              disabled={fetcher.state !== 'idle'}
            >
              {fetcher.state !== 'idle' ? (
                <span className="spinner-border spinner-border-sm" />
              ) : (
                <><i className="bi bi-plus-lg me-1" /> Cadastrar</>
              )}
            </button>
          </div>
        </fetcher.Form>

        {/* ── LISTA DE SEGURADORAS ── */}
        <h5 className="border-bottom border-secondary pb-2 mb-3 text-light small fw-bold">
          Seguradoras Cadastradas ({seguradoras.length})
        </h5>
        <p className="text-secondary small mb-3" style={{ fontSize: '0.78rem' }}>
          Toque no nome da seguradora para editar diretamente.
        </p>

        {seguradoras.length === 0 ? (
          <div className="text-center py-4">
            <i className="bi bi-shield-exclamation text-secondary" style={{ fontSize: '2.5rem' }} />
            <p className="text-secondary mt-2 mb-0">Nenhuma seguradora cadastrada.</p>
          </div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {seguradoras.map((s) => (
              <div
                key={s.id}
                className="d-flex align-items-center justify-content-between p-3 rounded-3 border border-secondary"
                style={{ background: 'hsl(220 16% 13%)' }}
              >
                <div className="d-flex align-items-center gap-3 flex-fill">
                  <div
                    className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                    style={{ width: 38, height: 38, background: 'linear-gradient(135deg, hsl(270 60% 55%), hsl(290 50% 45%))' }}
                  >
                    <i className="bi bi-shield-check text-white" style={{ fontSize: '1rem' }} />
                  </div>
                  
                  {/* Nome Inline */}
                  <div className="flex-fill">
                    {editingId === s.id ? (
                      <input
                        ref={inputRef}
                        type="text"
                        value={editingValue}
                        style={inlineInputStyle}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={() => commitEdit(s.id as string)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); commitEdit(s.id as string); }
                          if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
                        }}
                      />
                    ) : (
                      <span
                        className="fw-bold text-light d-block"
                        style={{ cursor: 'pointer' }}
                        onClick={() => activateEdit(s.id as string, s.nome)}
                      >
                        {s.nome}
                      </span>
                    )}
                  </div>
                </div>

                {/* Excluir */}
                <button
                  className="btn btn-link p-0 flex-shrink-0 ms-3"
                  style={{ color: 'hsl(0 84% 55%)', opacity: 0.7 }}
                  title="Excluir seguradora"
                  onClick={() => setDeleteTarget({ id: s.id as string, nome: s.nome })}
                >
                  <i className="bi bi-trash3" style={{ fontSize: '1.1rem' }} />
                </button>
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
                <i className="bi bi-shield-x text-danger" style={{ fontSize: '1.5rem' }} />
              </div>
            </div>
            <h5 className="text-white fw-bold text-center mb-2">Confirmar Exclusão</h5>
            <p className="text-secondary text-center small mb-1">Você está prestes a excluir esta seguradora:</p>
            <div className="text-center mb-4 p-2 rounded-3" style={{ background: 'hsl(0 50% 10%)', border: '1px solid hsl(0 84% 25%)' }}>
              <span className="text-light fw-bold">{deleteTarget.nome}</span>
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
