import { useEffect, useRef, useState } from 'react'
import { useFetcher, Link } from 'react-router'
import { postNovoCliente } from '~/services/clientes'
import { requireAdmin } from '~/services/session.server'
import type { Route } from './+types/clientes'

export const loader = async ({ request }: Route.LoaderArgs) => {
  await requireAdmin(request);
  return {};
};

export const action = async ({ request }: Route.ActionArgs) => {
  await requireAdmin(request)
  const formData = await request.formData()
  const nome = ((formData.get('nome') as string | null) ?? '').trim()
  const telefone = ((formData.get('telefone') as string | null) ?? '').trim()
  const endereco = ((formData.get('endereco') as string | null) ?? '').trim()
  const enderecoEntrega = ((formData.get('enderecoEntrega') as string | null) ?? '').trim()
  const enderecoRetirada = ((formData.get('enderecoRetirada') as string | null) ?? '').trim()

  if (!nome || nome.length > 30)
    return { ok: false as const, error: 'Nome inválido.' }
  if (!telefone || telefone.length > 20)
    return { ok: false as const, error: 'Telefone inválido.' }
  if (endereco.length > 100)
    return { ok: false as const, error: 'Endereço padrão inválido.' }
  if (enderecoEntrega.length > 300)
    return { ok: false as const, error: 'Endereço de entrega inválido.' }
  if (enderecoRetirada.length > 300)
    return { ok: false as const, error: 'Endereço de retirada inválido.' }

  const result = await postNovoCliente(nome, telefone, endereco, enderecoEntrega, enderecoRetirada)
  if (!result.ok) {
    console.log('[clientes action] erro:', result.error)
    return { ok: false as const, error: 'Erro ao cadastrar cliente. Tente novamente.' }
  }
  return { ok: true as const }
}

const Clientes = () => {
  const fetcher = useFetcher<typeof action>()
  const [nome, setNome] = useState<string>('')
  const [telefone, setTelefone] = useState<string>('')
  const [endereco, setEndereco] = useState<string>('')
  const [enderecoEntrega, setEnderecoEntrega] = useState<string>('')
  const [enderecoRetirada, setEnderecoRetirada] = useState<string>('')
  const wasSubmitting = useRef(false)

  const formatPhoneNumber = (value: string): string => {
    const phoneNumber: string = value.replace(/\D/g, '')
    if (phoneNumber.length === 0) return ''
    if (phoneNumber.length <= 10) {
      return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2, 6)}${phoneNumber.length > 6 ? '-' + phoneNumber.slice(6) : ''}`
    } else {
      return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2, 7)}-${phoneNumber.slice(7, 11)}`
    }
  }

  const handlePhoneChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTelefone(formatPhoneNumber(event.target.value))
  }

  useEffect(() => {
    if (fetcher.state === 'submitting') {
      wasSubmitting.current = true
    }
    if (fetcher.state === 'idle' && wasSubmitting.current) {
      wasSubmitting.current = false
      if (fetcher.data?.ok) {
        setNome('')
        setTelefone('')
        setEndereco('')
        setEnderecoEntrega('')
        setEnderecoRetirada('')
        alert('Cliente cadastrado com sucesso!')
      } else if (fetcher.data && !fetcher.data.ok) {
        alert(`Erro ao cadastrar cliente: ${fetcher.data.error}`)
      }
    }
  }, [fetcher.state, fetcher.data])

  return (
    <div className="min-vh-100 py-5 px-3 d-flex align-items-center justify-content-center"
      style={{ background: 'linear-gradient(160deg, hsl(220 20% 5%) 0%, hsl(230 22% 11%) 50%, hsl(260 18% 9%) 100%)' }}
    >
      <div
        className="gf-glass gf-animate-in-up w-100 p-4 p-md-5"
        style={{ maxWidth: '600px' }}
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
              background: 'linear-gradient(135deg, hsl(142 71% 40%), hsl(160 60% 45%))',
              boxShadow: '0 4px 12px hsl(142 71% 40% / 0.3)',
            }}
          >
            <i className="bi bi-people-fill text-white" style={{ fontSize: '1rem' }} />
          </div>
          <div>
            <h1 className="h3 fw-bold mb-0" style={{ color: 'hsl(0 0% 95%)' }}>Cadastro de Cliente</h1>
          </div>
        </div>
        <p className="text-sm mb-4" style={{ color: 'hsl(220 10% 50%)' }}>
          Registre contatos e endereços para autocompletar em serviços futuros.
        </p>

        <fetcher.Form
          method="post"
          className="needs-validation"
          onSubmit={(e) => {
            if (telefone.length !== 15) {
              e.preventDefault()
              alert('O telefone do cliente não está completo')
            }
          }}
        >
          <h5 className="gf-section-title">Dados Pessoais</h5>

          <div className="mb-3">
            <label className="form-label fw-semibold text-sm" style={{ color: 'hsl(0 0% 70%)' }}>
              <i className="bi bi-person me-1" /> Nome Completo
            </label>
            <input
              className="form-control form-control-lg bg-dark gf-input"
              type="text"
              name="nome"
              placeholder="Ex: Denis Silva de Sousa"
              maxLength={30}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold text-sm" style={{ color: 'hsl(0 0% 70%)' }}>
              <i className="bi bi-telephone me-1" /> Telefone
            </label>
            <div className="input-group">
              <span
                className="input-group-text fw-bold"
                style={{
                  background: 'hsl(220 15% 16%)',
                  border: '1.5px solid hsl(220 12% 20%)',
                  borderRight: 'none',
                  color: 'hsl(220 10% 55%)',
                  borderRadius: '8px 0 0 8px',
                }}
              >
                +55
              </span>
              <input
                className="form-control form-control-lg bg-dark gf-input"
                type="tel"
                name="telefone"
                placeholder="(51) 99864-7511"
                value={telefone}
                onChange={handlePhoneChange}
                maxLength={15}
                required
                style={{ borderRadius: '0 8px 8px 0' }}
              />
            </div>
          </div>

          <h5 className="gf-section-title mt-4">Endereços (Opcional)</h5>

          <div className="mb-3">
            <label className="form-label fw-semibold text-sm" style={{ color: 'hsl(0 0% 70%)' }}>
              <i className="bi bi-house me-1" /> Endereço Padrão
            </label>
            <input
              className="form-control form-control-lg bg-dark gf-input"
              type="text"
              name="endereco"
              placeholder="Ex: Rua José Bonifário, 1345"
              maxLength={100}
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
            />
          </div>

          <div className="row">
            <div className="col-12 col-md-6 mb-3">
              <label className="form-label fw-semibold text-sm" style={{ color: 'hsl(0 0% 70%)' }}>
                <i className="bi bi-flag me-1" /> Endereço de Entrega
              </label>
              <input
                className="form-control form-control-lg bg-dark gf-input"
                type="text"
                name="enderecoEntrega"
                placeholder="Ex: Av. Indústrias, 79"
                maxLength={300}
                value={enderecoEntrega}
                onChange={(e) => setEnderecoEntrega(e.target.value)}
              />
            </div>
            <div className="col-12 col-md-6 mb-3">
              <label className="form-label fw-semibold text-sm" style={{ color: 'hsl(0 0% 70%)' }}>
                <i className="bi bi-geo-alt me-1" /> Endereço de Retirada
              </label>
              <input
                className="form-control form-control-lg bg-dark gf-input"
                type="text"
                name="enderecoRetirada"
                placeholder="Ex: Rua Camaleão, 345"
                maxLength={300}
                value={enderecoRetirada}
                onChange={(e) => setEnderecoRetirada(e.target.value)}
              />
            </div>
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
                background: 'linear-gradient(135deg, hsl(142 71% 40%), hsl(160 60% 45%))',
                border: 'none',
                color: 'white',
                minHeight: 52,
                borderRadius: 8,
                boxShadow: '0 4px 14px hsl(142 71% 40% / 0.35)',
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
                  <i className="bi bi-person-plus-fill" />
                  Cadastrar Cliente
                </>
              )}
            </button>
          </div>
        </fetcher.Form>
      </div>
    </div>
  )
}

export default Clientes
