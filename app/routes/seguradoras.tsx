import { useEffect, useRef, useState } from 'react';
import { useFetcher, useLoaderData, Link } from 'react-router';
import { requireAdmin } from '~/services/session.server';
import { getSeguradoras, postNovaSeguradora, toggleSeguradora } from '~/services/seguradoras.server';
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

  if (intent === 'toggle') {
    const id = formData.get('id') as string;
    const ativa = formData.get('ativa') === 'true';
    if (!id) return { ok: false as const, error: 'ID inválido.' };
    const result = await toggleSeguradora(id, ativa);
    if (!result.ok) {
      return { ok: false as const, error: 'Erro ao atualizar seguradora.' };
    }
    return { ok: true as const, action: ativa ? 'ativada' : 'desativada' };
  }

  return { ok: false as const, error: 'Ação desconhecida.' };
};

export default function Seguradoras() {
  const { seguradoras } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const formRef = useRef<HTMLFormElement>(null);
  const wasSubmitting = useRef(false);
  const [nome, setNome] = useState('');

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

  return (
    <div className="min-vh-100 bg-dark text-white py-5 px-3 d-flex align-items-center justify-content-center">
      <div
        className="w-100 rounded-4 p-4 p-md-5 border border-secondary shadow-lg bg-opacity-75 bg-black"
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

        <h1 className="h3 fw-bold mb-1 text-white">Seguradoras</h1>
        <p className="text-secondary mb-4" style={{ fontSize: '0.95rem' }}>
          Cadastre e gerencie seguradoras e empresas que contratam serviços de guincho.
        </p>

        {/* Formulário de Cadastro */}
        <fetcher.Form ref={formRef} method="post" className="mb-4">
          <input type="hidden" name="intent" value="criar" />
          <div className="d-flex gap-2">
            <input
              type="text"
              name="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="form-control form-control-lg bg-dark text-white border-secondary focus:border-primary text-base min-h-[48px]"
              placeholder="Nome da seguradora (ex: AGV, Protefort...)"
              required
              minLength={2}
              maxLength={60}
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

        {/* Lista de Seguradoras */}
        <h5 className="border-bottom border-secondary pb-2 mb-3 text-light small fw-bold">
          Seguradoras Cadastradas ({seguradoras.length})
        </h5>

        {seguradoras.length === 0 ? (
          <div className="text-center py-5">
            <i className="bi bi-shield-exclamation text-secondary" style={{ fontSize: '2.5rem' }} />
            <p className="text-secondary mt-2 mb-0">Nenhuma seguradora cadastrada ainda.</p>
          </div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {seguradoras.map((s) => (
              <div
                key={s.id}
                className="d-flex align-items-center justify-content-between p-3 rounded-3 border border-secondary"
                style={{
                  background: s.ativa ? 'hsl(220 16% 13%)' : 'hsl(220 16% 10%)',
                  opacity: s.ativa ? 1 : 0.5,
                }}
              >
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                    style={{
                      width: 38, height: 38,
                      background: s.ativa
                        ? 'linear-gradient(135deg, hsl(270 60% 55%), hsl(290 50% 45%))'
                        : 'hsl(220 10% 25%)',
                    }}
                  >
                    <i className="bi bi-shield-check text-white" style={{ fontSize: '1rem' }} />
                  </div>
                  <div>
                    <span className="fw-bold text-light">{s.nome}</span>
                    <span className={`badge ms-2 ${s.ativa ? 'bg-success' : 'bg-secondary'}`}>
                      {s.ativa ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                </div>

                <fetcher.Form method="post">
                  <input type="hidden" name="intent" value="toggle" />
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="ativa" value={s.ativa ? 'false' : 'true'} />
                  <button
                    type="submit"
                    className={`btn btn-sm rounded-pill px-3 ${s.ativa ? 'btn-outline-warning' : 'btn-outline-success'}`}
                    disabled={fetcher.state !== 'idle'}
                  >
                    {s.ativa ? (
                      <><i className="bi bi-pause-circle me-1" /> Desativar</>
                    ) : (
                      <><i className="bi bi-play-circle me-1" /> Ativar</>
                    )}
                  </button>
                </fetcher.Form>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
