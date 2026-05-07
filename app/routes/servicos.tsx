import { useEffect, useRef, useState } from 'react'
import { useFetcher, useLoaderData } from 'react-router'
import { getClientes, postNovoCliente, patchCliente } from '~/services/clientes'
import { getVeiculos, postNovoVeiculo } from '~/services/veiculos'
import { postNovoServico } from '~/services/servicos'
import type { Route } from './+types/servicos'

type Cliente = {
  id?: string
  nome: string
  telefone?: string
  enderecoRetirada?: string
  enderecoEntrega?: string
}

type Veiculo = {
  id?: string
  placa: string
  modelo?: string
}

export const loader = async () => {
  const clientes = await getClientes()
  const veiculos = await getVeiculos()
  return { clientes, veiculos }
}

export const action = async ({ request }: Route.ActionArgs) => {
  const formData = await request.formData()
  const clienteIdRaw = (formData.get('clienteId') as string) ?? ''
  const clienteNome = formData.get('cliente') as string
  const veiculoIdRaw = (formData.get('veiculoId') as string) ?? ''
  const veiculoPlaca = formData.get('veiculo') as string
  const modeloVeiculo = (formData.get('modeloveiculo') as string) ?? ''
  const valorCobrado = (formData.get('valorCobrado') as string) ?? ''
  const quemRecebe = formData.get('quemRecebe') as string
  const enderecoRetirada = (formData.get('enderecoRetirada') as string) ?? ''
  const enderecoEntrega = (formData.get('enderecoEntrega') as string) ?? ''

  let clienteId = clienteIdRaw
  let veiculoId = veiculoIdRaw

  // 1. Cria cliente se não existir
  if (!clienteId) {
    const novoCliente = await postNovoCliente(clienteNome, enderecoRetirada, enderecoEntrega)
    if (!novoCliente.ok) {
      console.log('[servicos action] erro ao cadastrar cliente:', novoCliente.error)
      return { ok: false as const, error: 'Erro ao cadastrar cliente. Tente novamente.' }
    }
    clienteId = novoCliente.docRef.id
  }

  // 2. Cria veículo se não existir
  if (!veiculoId) {
    if (!veiculoPlaca || veiculoPlaca.length !== 7) {
      return { ok: false as const, error: 'Placa incompleta' }
    }
    const novoVeiculo = await postNovoVeiculo(veiculoPlaca, modeloVeiculo)
    if (!novoVeiculo.ok) {
      console.log('[servicos action] erro ao cadastrar veículo:', novoVeiculo.error)
      return { ok: false as const, error: 'Erro ao cadastrar veículo. Tente novamente.' }
    }
    veiculoId = novoVeiculo.docRef.id
  }

  // 3. Atualiza endereços do cliente
  await patchCliente(clienteId, enderecoRetirada, enderecoEntrega)

  // 4. Cria serviço
  const novoServico = await postNovoServico(clienteId, veiculoId, valorCobrado, quemRecebe, enderecoRetirada, enderecoEntrega)
  if (!novoServico.ok) {
    console.log('[servicos action] erro ao cadastrar serviço:', novoServico.error)
    return { ok: false as const, error: 'Erro ao cadastrar serviço. Tente novamente.' }
  }

  return { ok: true as const }
}

export default function Servicos() {
  const { clientes, veiculos } = useLoaderData<typeof loader>()
  const fetcher = useFetcher<typeof action>()
  const wasSubmitting = useRef(false)

  const [clientesFiltrados, setClientesFiltrados] = useState<Cliente[]>([])
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | undefined>()
  const [quemRecebe, setQuemRecebe] = useState<string>('')
  const [showOptions, setShowOptions] = useState(false)
  const [veiculosFiltrados, setVeiculosFiltrados] = useState<Veiculo[]>([])
  const [veiculoSelecionado, setVeiculoSelecionado] = useState<Veiculo | undefined>()
  const [modeloVeiculo, setModeloVeiculo] = useState<string>('')
  const [enderecoRetirada, setEnderecoRetirada] = useState<string>('')
  const [enderecoEntrega, setEnderecoEntrega] = useState<string>('')

  const handleChangeInputNome = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor: string = e.target.value
    const valorLowerCase: string = valor.toLowerCase()
    setClienteSelecionado({ nome: valor })
    const filtraClientes = (clientes as Cliente[]).filter((elem) =>
      (elem.nome ?? '').toLowerCase().includes(valorLowerCase)
    )
    setClientesFiltrados(filtraClientes)
  }

  const handleChangeInputPlaca = (e: React.ChangeEvent<HTMLInputElement>) => {
    let valorPlaca: string = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (valorPlaca.length > 7) valorPlaca = valorPlaca.slice(0, 7)

    const padraoMercosul = [
      /^[A-Z]$/,
      /^[A-Z]$/,
      /^[A-Z]$/,
      /^[0-9]$/,
      /^[A-Z0-9]$/,
      /^[0-9]$/,
      /^[0-9]$/,
    ]

    let placaValidada = ''
    for (let i = 0; i < valorPlaca.length; i++) {
      if (padraoMercosul[i].test(valorPlaca[i])) {
        placaValidada += valorPlaca[i]
      } else {
        break
      }
    }

    setVeiculoSelecionado({ placa: placaValidada })
    const filtraPlacas = (veiculos as Veiculo[]).filter((elem) => elem.placa.includes(placaValidada))
    setVeiculosFiltrados(filtraPlacas)
    setModeloVeiculo('')
  }

  const listaQuemRecebe = ['Daniel', 'Gabriel']

  const handleClienteSelected = (elem: Cliente) => {
    setClienteSelecionado(elem)
    setClientesFiltrados([])
    setEnderecoRetirada(elem.enderecoRetirada ?? '')
  }

  const handlePlacaSelected = (elem: Veiculo) => {
    setVeiculoSelecionado(elem)
    setVeiculosFiltrados([])
    setModeloVeiculo(elem.modelo ?? '')
  }

  const handleChangeModeloVeiculo = (e: React.ChangeEvent<HTMLInputElement>) => {
    setModeloVeiculo(e.target.value)
  }

  const handleChangeEnderecoRetirada = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEnderecoRetirada(e.target.value)
  }

  const handleChangeEnderecoEntrega = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEnderecoEntrega(e.target.value)
  }

  const resetarFormulario = () => {
    setClienteSelecionado({ nome: '' })
    setClientesFiltrados([])
    setQuemRecebe('')
    setVeiculosFiltrados([])
    setVeiculoSelecionado({ placa: '' })
    setModeloVeiculo('')
    setEnderecoRetirada('')
    setEnderecoEntrega('')
  }

  useEffect(() => {
    if (fetcher.state === 'submitting') {
      wasSubmitting.current = true
    }
    if (fetcher.state === 'idle' && wasSubmitting.current) {
      wasSubmitting.current = false
      if (fetcher.data?.ok) {
        alert('Serviço criado com sucesso!')
        resetarFormulario()
      } else if (fetcher.data && !fetcher.data.ok) {
        alert(`Erro: ${fetcher.data.error}`)
      }
    }
  }, [fetcher.state, fetcher.data])

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="border border-secondary p-4 rounded">
            <h3 className="d-flex justify-content-center text-secondary mb-3">Novo Serviço</h3>

            <fetcher.Form
              method="post"
              className="needs-validation"
              onSubmit={(e) => {
                if (quemRecebe.length <= 0) {
                  e.preventDefault()
                  alert('Escolha quem irá receber.')
                } else if (!veiculoSelecionado?.id && (!veiculoSelecionado?.placa || veiculoSelecionado.placa.length !== 7)) {
                  e.preventDefault()
                  alert('Placa incompleta')
                }
              }}
            >
              {/* IDs ocultos — preenchidos quando o usuário seleciona do autocomplete */}
              <input type="hidden" name="clienteId" value={clienteSelecionado?.id ?? ''} />
              <input type="hidden" name="veiculoId" value={veiculoSelecionado?.id ?? ''} />

              {/* cliente label */}
              <div className="mb-3">
                <h6>Nome Completo:</h6>
              </div>

              {/* cliente */}
              <div className="mb-3">
                <input
                  className="form-control"
                  type="text"
                  name="cliente"
                  placeholder="ex: Érico Veríssimo"
                  maxLength={30}
                  required
                  value={clienteSelecionado?.nome}
                  onChange={handleChangeInputNome}
                  onBlur={() => setTimeout(() => setClientesFiltrados([]), 200)}
                />
                <ul className="list-group position-absolute shadow" style={{ zIndex: 1000 }}>
                  {clientesFiltrados.length > 0
                    ? clientesFiltrados.map((elem, index) => (
                        <li
                          key={index}
                          className="list-group-item list-group-item-action"
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleClienteSelected(elem)}
                        >
                          {elem.nome}
                        </li>
                      ))
                    : null}
                </ul>
              </div>

              {/* placa veículo label */}
              <div className="mb-3">
                <h6>Placa do veículo:</h6>
              </div>

              {/* placa veículo */}
              <div className="mb-3">
                <input
                  className="form-control"
                  type="text"
                  name="veiculo"
                  placeholder="ex: ABC-8K25"
                  maxLength={7}
                  required
                  value={veiculoSelecionado?.placa}
                  onChange={handleChangeInputPlaca}
                  onBlur={() => setTimeout(() => setVeiculosFiltrados([]), 200)}
                />
                <ul className="list-group position-absolute shadow" style={{ zIndex: 1000 }}>
                  {veiculosFiltrados.length > 0
                    ? veiculosFiltrados.map((elem, index) => (
                        <li
                          key={index}
                          className="list-group-item list-group-item-action"
                          style={{ cursor: 'pointer' }}
                          onClick={() => handlePlacaSelected(elem)}
                        >
                          {elem.placa}
                        </li>
                      ))
                    : null}
                </ul>
              </div>

              {/* modelo veículo label */}
              <div className="mb-3">
                <h6>Modelo do veículo:</h6>
              </div>

              {/* modelo veículo */}
              <div className="mb-3">
                <input
                  className="form-control"
                  type="text"
                  name="modeloveiculo"
                  placeholder="ex: ford ka azul"
                  maxLength={30}
                  required
                  value={modeloVeiculo}
                  onChange={handleChangeModeloVeiculo}
                />
              </div>

              {/* valor cobrado label */}
              <div className="mb-3">
                <h6>Valor Cobrado:</h6>
              </div>

              {/* valor cobrado */}
              <div className="mb-3">
                <input
                  className="form-control"
                  type="text"
                  name="valorCobrado"
                  placeholder="ex: 200,00"
                  maxLength={4}
                  required
                  onInput={(e) => {
                    const target = e.currentTarget
                    let valor = target.value.replace(/\D/g, '').slice(0, 4)
                    if (valor.length > 1 && valor.startsWith('0')) {
                      valor = valor.replace(/^0+/, '')
                    }
                    target.value = valor
                  }}
                />
              </div>

              {/* recebedor label */}
              <div className="mb-3">
                <h6>Quem receberá valor:</h6>
              </div>

              {/* recebedor valor */}
              <div className="mb-3">
                <input
                  className="form-control"
                  type="text"
                  name="quemRecebe"
                  placeholder="clique para escolher"
                  maxLength={30}
                  required
                  value={quemRecebe}
                  readOnly
                  onClick={() => setShowOptions(!showOptions)}
                  onBlur={() => setTimeout(() => setShowOptions(false), 100)}
                />
                <span
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '38px',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                  onClick={() => setShowOptions(!showOptions)}
                >
                  ▼
                </span>
                {showOptions && (
                  <div
                    className="border rounded bg-white"
                    style={{
                      position: 'absolute',
                      zIndex: 10,
                      width: '100%',
                      marginTop: '2px',
                      maxHeight: '160px',
                      overflowY: 'auto',
                      cursor: 'pointer',
                    }}
                  >
                    {listaQuemRecebe.map((item, index) => (
                      <div
                        key={index}
                        className="p-2 option-hover"
                        onClick={() => {
                          setQuemRecebe(item)
                          setShowOptions(false)
                        }}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* endereço retirada label */}
              <div className="mb-3">
                <h6>Endereço para Retirada:</h6>
              </div>

              {/* endereço para retirada */}
              <div className="mb-3">
                <input
                  className="form-control"
                  type="text"
                  name="enderecoRetirada"
                  placeholder="ex: Rua Camaleão, 345, bairro Jardim, Porto Alegre"
                  maxLength={300}
                  required
                  value={enderecoRetirada}
                  onChange={handleChangeEnderecoRetirada}
                />
              </div>

              {/* endereço de entrega label */}
              <div className="mb-3">
                <h6>Endereço de Entrega:</h6>
              </div>

              {/* endereço de entrega */}
              <div className="mb-3">
                <input
                  className="form-control"
                  type="text"
                  name="enderecoEntrega"
                  placeholder="ex: Av. Indústrias, 79, centro, São Leopoldo"
                  maxLength={300}
                  required
                  value={enderecoEntrega}
                  onChange={handleChangeEnderecoEntrega}
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
