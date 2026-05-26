import { useEffect, useRef, useState } from 'react'
import { useFetcher } from 'react-router'
import { postNovoCliente } from '~/services/clientes'
import { requireAuth, requireAdmin } from '~/services/session.server'
import type { Route } from './+types/clientes'

export const loader = async ({ request }: Route.LoaderArgs) => {
  await requireAuth(request);
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
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-12 col-md-6">
          <div className="border border-secondary p-4 rounded">
            <h3 className="text-secondary mb-3">Cadastro de Cliente</h3>

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
              <div className="mb-3">
                <h6>Nome Completo:</h6>
                <input
                  className="form-control"
                  type="text"
                  name="nome"
                  placeholder="Ex.: Denis Silva de Sousa"
                  maxLength={30}
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <h6>Telefone:</h6>
                <div className="input-group">
                  <span className="input-group-text">+55</span>
                  <input
                    className="form-control"
                    type="tel"
                    name="telefone"
                    placeholder="(51) 99864-7511"
                    value={telefone}
                    onChange={handlePhoneChange}
                    maxLength={15}
                    required
                  />
                </div>
              </div>

              <div className="mb-3">
                <h6>Endereço Padrão:</h6>
                <input
                  className="form-control"
                  type="text"
                  name="endereco"
                  placeholder="Não obrigatório agora — Ex.: Rua José Bonifário, 1345"
                  maxLength={100}
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                />
              </div>

              <div className="mb-3">
                <h6>Endereço de Entrega:</h6>
                <input
                  className="form-control"
                  type="text"
                  name="enderecoEntrega"
                  placeholder="Não obrigatório agora — Ex.: Av. Indústrias, 79, São Leopoldo"
                  maxLength={300}
                  value={enderecoEntrega}
                  onChange={(e) => setEnderecoEntrega(e.target.value)}
                />
              </div>

              <div className="mb-3">
                <h6>Endereço de Retirada:</h6>
                <input
                  className="form-control"
                  type="text"
                  name="enderecoRetirada"
                  placeholder="Não obrigatório agora — Ex.: Rua Camaleão, 345, Porto Alegre"
                  maxLength={300}
                  value={enderecoRetirada}
                  onChange={(e) => setEnderecoRetirada(e.target.value)}
                />
              </div>

              <div className="d-grid">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={fetcher.state !== 'idle'}
                >
                  {fetcher.state !== 'idle' ? 'Salvando...' : 'Criar'}
                </button>
              </div>
            </fetcher.Form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Clientes
