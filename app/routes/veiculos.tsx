import { useEffect, useRef, useState } from 'react'
import { useFetcher, Link } from 'react-router'
import { postNovoVeiculo } from '~/services/veiculos.server'
import { requireAdmin } from '~/services/session.server'
import type { Route } from './+types/veiculos'

export const loader = async ({ request }: Route.LoaderArgs) => {
  await requireAdmin(request);
  return {};
};

export const action = async ({ request }: Route.ActionArgs) => {
  await requireAdmin(request)
  const formData = await request.formData()
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
    console.log('[veiculos action] erro:', result.error)
    return { ok: false as const, error: 'Erro ao cadastrar veículo. Tente novamente.' }
  }
  return { ok: true as const }
}

const Veiculos = () => {
  const fetcher = useFetcher<typeof action>()
  const [placa, setPlaca] = useState<string>('')
  const [modelo, setModelo] = useState<string>('')
  const wasSubmitting = useRef(false)

  const handlePlacaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let valor: string = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (valor.length > 7) valor = valor.slice(0, 7)

    const padraoMercosul = [
      /^[A-Z]$/,
      /^[A-Z]$/,
      /^[A-Z]$/,
      /^[0-9]$/,
      /^[A-Z0-9]$/,
      /^[0-9]$/,
      /^[0-9]$/,
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
      if (fetcher.data?.ok) {
        setPlaca('')
        setModelo('')
        alert('Veículo cadastrado com sucesso')
      } else if (fetcher.data && !fetcher.data.ok) {
        alert(`Erro ao cadastrar o veículo: ${fetcher.data.error}`)
      }
    }
  }, [fetcher.state, fetcher.data])

  return (
    <div className="min-vh-100 py-5 px-3 d-flex align-items-center justify-content-center"
      style={{ background: 'linear-gradient(160deg, hsl(220 20% 5%) 0%, hsl(230 22% 11%) 50%, hsl(260 18% 9%) 100%)' }}
    >
      <div
        className="gf-glass gf-animate-in-up w-100 p-4 p-md-5"
        style={{ maxWidth: '520px' }}
      >
        <div className="d-flex align-items-center justify-content-between mb-4">
          <Link to="/" className="btn btn-outline-light btn-sm rounded-pill px-3">
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
          <h1 className="h3 fw-bold mb-0" style={{ color: 'hsl(0 0% 95%)' }}>Cadastro de Veículos</h1>
        </div>
        <p className="text-sm mb-4" style={{ color: 'hsl(220 10% 50%)' }}>
          Registre placas e modelos dos veículos guinchados.
        </p>

        <fetcher.Form
          method="post"
          className="needs-validation"
          onSubmit={(e) => {
            if (placa.length !== 7) {
              e.preventDefault()
              alert('Placa incompleta')
            }
          }}
        >
          <h5 className="gf-section-title">Dados do Veículo</h5>

          <div className="mb-3">
            <label className="form-label fw-semibold text-sm" style={{ color: 'hsl(0 0% 70%)' }}>
              <i className="bi bi-card-text me-1" /> Placa (Padrão Mercosul)
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
            <div className="text-xs mt-1" style={{ color: 'hsl(220 10% 40%)' }}>
              {placa.length}/7 caracteres • Formato: AAA0A00
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold text-sm" style={{ color: 'hsl(0 0% 70%)' }}>
              <i className="bi bi-car-front me-1" /> Modelo / Descrição
            </label>
            <input
              className="form-control form-control-lg bg-dark gf-input"
              type="text"
              name="modelo"
              placeholder="Ex: Kadett cinza, Hornet preta"
              maxLength={30}
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
              required
            />
          </div>

          {fetcher.data && !fetcher.data.ok ? (
            <div className="alert alert-danger py-2 px-3 mb-3 border-0 rounded-3 gf-animate-scale"
              style={{ background: 'hsl(0 84% 55% / 0.12)', color: 'hsl(0 84% 68%)' }}
            >
              <i className="bi bi-exclamation-triangle-fill me-2" />
              <span className="text-sm fw-semibold">{fetcher.data.error}</span>
            </div>
          ) : null}

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
                  <i className="bi bi-truck" />
                  Cadastrar Veículo
                </>
              )}
            </button>
          </div>
        </fetcher.Form>
      </div>
    </div>
  )
}

export default Veiculos
