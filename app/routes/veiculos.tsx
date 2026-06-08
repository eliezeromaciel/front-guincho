import { useEffect, useRef, useState } from 'react'
import { useFetcher, Link, useLoaderData } from 'react-router'
import { postNovoVeiculo, getVeiculos, updateVeiculo, deleteVeiculo } from '~/services/veiculos.server'
import { requireAdmin } from '~/services/session.server'
import type { Route } from './+types/veiculos'

export const loader = async ({ request }: Route.LoaderArgs) => {
  await requireAdmin(request);
  const veiculos = await getVeiculos();
  return { veiculos };
};

export const action = async ({ request }: Route.ActionArgs) => {
  await requireAdmin(request)
  const formData = await request.formData()
  const intent = formData.get('intent') as string

  if (intent === 'criar') {
    const placa = ((formData.get('placa') as string | null) ?? '').trim()
    const modelo = ((formData.get('modelo') as string | null) ?? '').trim()

    if (!modelo || modelo.length > 30)
      return { ok: false as const, error: 'Modelo inválido.' }

    const PLACA_MERCOSUL = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/
    if (!PLACA_MERCOSUL.test(placa)) {
      return { ok: false as const, error: 'Placa inválida.' }
    }

    const result = await postNovoVeiculo(placa, modelo)
    if (!result.ok) {
      return { ok: false as const, error: 'Erro ao cadastrar veículo. Tente novamente.' }
    }
    return { ok: true as const, action: 'criado' }
  }

  if (intent === 'edit-veiculo') {
    const id = formData.get('id') as string;
    const campo = formData.get('campo') as string;
    let valor = (formData.get('valor') as string).trim();

    if (!id || !campo || !valor) return { ok: false as const, error: 'Dados inválidos.' };

    if (campo === 'placa') {
      valor = valor.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const PLACA_MERCOSUL = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;
      if (!PLACA_MERCOSUL.test(valor)) return { ok: false as const, error: 'Placa inválida.' };
    }

    if (campo === 'modelo' && valor.length > 30) {
      return { ok: false as const, error: 'Modelo não pode exceder 30 caracteres.' };
    }

    const result = await updateVeiculo(id, { [campo]: valor });
    if (!result.ok) return { ok: false as const, error: 'Erro ao atualizar veículo.' };
    return { ok: true as const, action: 'editado' };
  }

  if (intent === 'delete-veiculo') {
    const id = formData.get('id') as string;
    if (!id) return { ok: false as const, error: 'ID inválido.' };
    const result = await deleteVeiculo(id);
    if (!result.ok) return { ok: false as const, error: 'Erro ao excluir veículo.' };
    return { ok: true as const, action: 'deletado' };
  }

  return { ok: false as const, error: 'Ação desconhecida.' }
}

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
  placa: string;
  modelo: string;
};

const Veiculos = () => {
  const { veiculos } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>()
  const [placa, setPlaca] = useState<string>('')
  const [modelo, setModelo] = useState<string>('')
  const wasSubmitting = useRef(false)

  // Estados de edição
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [originalValue, setOriginalValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Estado de exclusão
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const handlePlacaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let valor: string = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (valor.length > 7) valor = valor.slice(0, 7)

    const padraoMercosul = [
      /^[A-Z]$/, /^[A-Z]$/, /^[A-Z]$/, /^[0-9]$/, /^[A-Z0-9]$/, /^[0-9]$/, /^[0-9]$/,
    ]

    let validValue = ''
    for (let i = 0; i < valor.length; i++) {
      if (padraoMercosul[i].test(valor[i])) {
        validValue += valor[i]
      } else {
        break
      }
    }

    setPlaca(validValue)
  }

  useEffect(() => {
    if (fetcher.state === 'submitting') {
      wasSubmitting.current = true
    }
    if (fetcher.state === 'idle' && wasSubmitting.current) {
      wasSubmitting.current = false
      if (fetcher.data?.ok && fetcher.data.action === 'criado') {
        setPlaca('')
        setModelo('')
        alert('Caminhão cadastrado com sucesso!')
      } else if (fetcher.data && !fetcher.data.ok) {
        alert(`Erro: ${fetcher.data.error}`)
      }
    }
  }, [fetcher.state, fetcher.data])

  // ── Helpers de Edição ──
  const isCellActive = (id: string, field: string) =>
    editingCell?.id === id && editingCell?.field === field;

  const activateEdit = (id: string, field: string, currentValue: string) => {
    setEditingCell({ id, field });
    setEditingValue(currentValue);
    setOriginalValue(currentValue);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditingValue('');
    setOriginalValue('');
  };

  const commitEdit = (id: string, field: string) => {
    if (editingValue.trim() === originalValue.trim()) {
      cancelEdit();
      return;
    }
    const fd = new FormData();
    fd.append('intent', 'edit-veiculo');
    fd.append('id', id);
    fd.append('campo', field);
    fd.append('valor', editingValue);
    fetcher.submit(fd, { method: 'post' });
    cancelEdit();
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const fd = new FormData();
    fd.append('intent', 'delete-veiculo');
    fd.append('id', deleteTarget.id);
    fetcher.submit(fd, { method: 'post' });
    setDeleteTarget(null);
  };

  return (
    <div className="min-vh-100 py-5 px-3 d-flex flex-column align-items-center"
      style={{ background: 'linear-gradient(160deg, hsl(220 20% 5%) 0%, hsl(230 22% 11%) 50%, hsl(260 18% 9%) 100%)' }}
    >
      <div
        className="gf-glass gf-animate-in-up w-100 p-4 p-md-5 mb-4"
        style={{ maxWidth: '600px' }}
      >
        <div className="d-flex align-items-center justify-content-between mb-4">
          <Link to="/cadastros" className="btn btn-outline-light btn-sm rounded-pill px-3">
            <i className="bi bi-arrow-left me-1" /> Voltar
          </Link>
          <h2 className="h4 fw-bold m-0 gf-text-gradient">GuinchoFácil</h2>
        </div>

        <div className="d-flex align-items-center gap-2 mb-1">
          <div
            className="d-inline-flex align-items-center justify-content-center rounded-circle"
            style={{
              width: 40, height: 40,
              background: 'linear-gradient(135deg, hsl(199 89% 48%), hsl(180 70% 45%))',
              boxShadow: '0 4px 12px hsl(199 89% 48% / 0.3)',
            }}
          >
            <i className="bi bi-truck text-white" style={{ fontSize: '1rem' }} />
          </div>
          <h1 className="h3 fw-bold mb-0" style={{ color: 'hsl(0 0% 95%)' }}>Caminhões da Frota</h1>
        </div>
        <p className="text-sm mb-4" style={{ color: 'hsl(220 10% 50%)' }}>
          Cadastre os caminhões guincho que a empresa possui ou vai adquirir.
        </p>

        <fetcher.Form
          method="post"
          className="needs-validation mb-4"
          onSubmit={(e) => {
            if (placa.length !== 7) {
              e.preventDefault()
              alert('Placa incompleta')
            }
          }}
        >
          <input type="hidden" name="intent" value="criar" />
          <h5 className="gf-section-title">Novo Caminhão</h5>

          <div className="row g-3">
            <div className="col-12 col-sm-5">
              <label className="form-label fw-semibold text-sm" style={{ color: 'hsl(0 0% 70%)' }}>
                <i className="bi bi-card-text me-1" /> Placa (Mercosul)
              </label>
              <input
                className="form-control form-control-lg bg-dark gf-input font-mono"
                type="text"
                name="placa"
                placeholder="Ex: ABC8K25"
                maxLength={7}
                value={placa}
                onChange={handlePlacaChange}
                required
                style={{ fontSize: '1.2rem', letterSpacing: '0.15em', textAlign: 'center' }}
              />
            </div>

            <div className="col-12 col-sm-7">
              <label className="form-label fw-semibold text-sm" style={{ color: 'hsl(0 0% 70%)' }}>
                <i className="bi bi-car-front me-1" /> Modelo / Descrição
              </label>
              <input
                className="form-control form-control-lg bg-dark gf-input"
                type="text"
                name="modelo"
                placeholder="Ex: Mercedes Atego"
                maxLength={30}
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="d-grid mt-4">
            <button
              type="submit"
              className="btn btn-lg fw-bold d-flex align-items-center justify-content-center gap-2"
              disabled={fetcher.state !== 'idle'}
              style={{
                background: 'linear-gradient(135deg, hsl(199 89% 48%), hsl(180 70% 45%))',
                border: 'none',
                color: 'white',
                minHeight: 52,
                borderRadius: 8,
                boxShadow: '0 4px 14px hsl(199 89% 48% / 0.35)',
                transition: 'all 250ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              }}
            >
              {fetcher.state !== 'idle' ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                  Salvando...
                </>
              ) : (
                <>
                  <i className="bi bi-plus-lg" />
                  Cadastrar Caminhão
                </>
              )}
            </button>
          </div>
        </fetcher.Form>

        {/* ── LISTAGEM DE VEÍCULOS ── */}
        <h5 className="border-bottom border-secondary pb-2 mb-3 text-light small fw-bold">
          Caminhões Cadastrados ({veiculos.length})
        </h5>
        
        <p className="text-secondary small mb-3" style={{ fontSize: '0.78rem' }}>
          Toque nos dados do caminhão para editar diretamente.
        </p>

        {veiculos.length === 0 ? (
          <div className="text-center py-4">
            <i className="bi bi-inbox text-secondary" style={{ fontSize: '2rem' }} />
            <p className="text-secondary mt-2 mb-0">Nenhum caminhão cadastrado.</p>
          </div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {veiculos.map((v) => (
              <div
                key={v.id}
                className="d-flex align-items-center justify-content-between p-3 rounded-3 border border-secondary"
                style={{ background: 'hsl(220 16% 13%)' }}
              >
                <div className="flex-fill me-3" style={{ overflow: 'hidden' }}>
                  <div className="d-flex flex-column flex-sm-row gap-2 gap-sm-4 align-items-sm-center">
                    
                    {/* Placa Inline */}
                    <div style={{ minWidth: '100px' }}>
                      {isCellActive(v.id, 'placa') ? (
                        <input
                          ref={inputRef}
                          type="text"
                          value={editingValue}
                          style={{ ...inlineInputStyle, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                          onChange={(e) => {
                            let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                            if (val.length > 7) val = val.slice(0, 7);
                            setEditingValue(val);
                          }}
                          onBlur={() => commitEdit(v.id, 'placa')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); commitEdit(v.id, 'placa'); }
                            if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
                          }}
                        />
                      ) : (
                        <span
                          className="fw-bold text-light font-mono"
                          style={{ cursor: 'pointer', padding: '2px 4px', borderRadius: '4px', background: 'hsl(0 0% 100% / 0.05)' }}
                          onClick={() => activateEdit(v.id, 'placa', v.placa)}
                        >
                          <i className="bi bi-123 text-secondary me-1" style={{ fontSize: '0.8rem' }} />
                          {v.placa}
                        </span>
                      )}
                    </div>

                    {/* Modelo Inline */}
                    <div className="flex-fill text-truncate">
                      {isCellActive(v.id, 'modelo') ? (
                        <input
                          ref={inputRef}
                          type="text"
                          value={editingValue}
                          style={inlineInputStyle}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => commitEdit(v.id, 'modelo')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); commitEdit(v.id, 'modelo'); }
                            if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
                          }}
                        />
                      ) : (
                        <span
                          className="text-light text-truncate d-inline-block w-100"
                          style={{ cursor: 'pointer' }}
                          onClick={() => activateEdit(v.id, 'modelo', v.modelo)}
                        >
                          {v.modelo}
                        </span>
                      )}
                    </div>

                  </div>
                </div>

                {/* Excluir */}
                <button
                  className="btn btn-link p-0 flex-shrink-0"
                  style={{ color: 'hsl(0 84% 55%)', opacity: 0.7 }}
                  title="Excluir caminhão"
                  onClick={() => setDeleteTarget({ id: v.id, placa: v.placa, modelo: v.modelo })}
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
                <i className="bi bi-exclamation-triangle-fill text-danger" style={{ fontSize: '1.5rem' }} />
              </div>
            </div>
            <h5 className="text-white fw-bold text-center mb-2">Confirmar Exclusão</h5>
            <p className="text-secondary text-center small mb-1">Você está prestes a excluir este caminhão:</p>
            <div className="text-center mb-4 p-2 rounded-3" style={{ background: 'hsl(0 50% 10%)', border: '1px solid hsl(0 84% 25%)' }}>
              <span className="text-light fw-semibold">{deleteTarget.modelo}</span>
              <br />
              <span className="text-danger fw-bold font-mono">{deleteTarget.placa}</span>
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
  )
}

export default Veiculos
