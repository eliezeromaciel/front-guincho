import { useEffect, useRef, useState } from 'react'
import { useFetcher, useLoaderData } from 'react-router'
import { getClientes, postNovoCliente, patchCliente } from '~/services/clientes'
import { getVeiculos, postNovoVeiculo } from '~/services/veiculos'
import { postNovoServico } from '~/services/servicos'
import { requireAuth, requireAdmin } from '~/services/session.server'
import { adminAuth, adminDb } from '~/services/firebaseAdmin'
import { enviarNotificacaoServidor } from '~/services/webpush.server'
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

type Usuario = {
  uid: string
  displayName: string
}

export const loader = async ({ request }: Route.LoaderArgs) => {
  await requireAuth(request);
  const [clientes, veiculos, funcionariosSnap] = await Promise.all([
    getClientes(),
    getVeiculos(),
    adminDb.collection('funcionarios').get(),
  ]);
  const usuarios: Usuario[] = funcionariosSnap.docs.flatMap((doc) => {
    const data = doc.data() as { nome?: string };
    return data.nome ? [{ uid: doc.id, displayName: data.nome }] : [];
  });
  return { clientes, veiculos, usuarios }
}

export const action = async ({ request }: Route.ActionArgs) => {
  await requireAdmin(request)
  const formData = await request.formData()
  const clienteIdRaw = ((formData.get('clienteId') as string | null) ?? '').trim()
  const clienteNome = ((formData.get('cliente') as string | null) ?? '').trim()
  const veiculoIdRaw = ((formData.get('veiculoId') as string | null) ?? '').trim()
  const veiculoPlaca = ((formData.get('veiculo') as string | null) ?? '').trim()
  const modeloVeiculo = ((formData.get('modeloveiculo') as string | null) ?? '').trim()
  const valorCobradoRaw = ((formData.get('valorCobrado') as string | null) ?? '').trim()
  const quemRecebeUid = ((formData.get('quemRecebeUid') as string | null) ?? '').trim()
  const quemRecebeNome = ((formData.get('quemRecebe') as string | null) ?? '').trim()
  const enderecoRetirada = ((formData.get('enderecoRetirada') as string | null) ?? '').trim()
  const enderecoEntrega = ((formData.get('enderecoEntrega') as string | null) ?? '').trim()

  if (!clienteNome || clienteNome.length > 30)
    return { ok: false as const, error: 'Nome do cliente inválido.' }
  if (!enderecoRetirada || enderecoRetirada.length > 300)
    return { ok: false as const, error: 'Endereço de retirada inválido.' }
  if (!enderecoEntrega || enderecoEntrega.length > 300)
    return { ok: false as const, error: 'Endereço de entrega inválido.' }

  if (!quemRecebeUid || !quemRecebeNome) {
    return { ok: false as const, error: 'Selecione quem receberá o serviço.' }
  }

  let userRecord;
  try {
    userRecord = await adminAuth.getUser(quemRecebeUid)
  } catch {
    return { ok: false as const, error: 'Funcionário inválido.' }
  }
  const quemRecebeNomeVerificado = userRecord.displayName ?? quemRecebeUid

  const valorCobradoNum = parseInt(valorCobradoRaw, 10)
  if (isNaN(valorCobradoNum) || valorCobradoNum <= 0 || valorCobradoNum > 9999) {
    return { ok: false as const, error: 'Valor cobrado inválido.' }
  }

  let clienteId = clienteIdRaw
  let veiculoId = veiculoIdRaw

  if (!clienteId) {
    const novoCliente = await postNovoCliente(clienteNome, undefined, undefined, enderecoEntrega, enderecoRetirada)
    if (!novoCliente.ok) {
      console.log('[servicos action] erro ao cadastrar cliente:', novoCliente.error)
      return { ok: false as const, error: 'Erro ao cadastrar cliente. Tente novamente.' }
    }
    clienteId = novoCliente.docRef.id
  }

  if (!veiculoId) {
    const PLACA_MERCOSUL = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/
    if (!veiculoPlaca || !PLACA_MERCOSUL.test(veiculoPlaca)) {
      return { ok: false as const, error: 'Placa inválida.' }
    }
    const novoVeiculo = await postNovoVeiculo(veiculoPlaca, modeloVeiculo)
    if (!novoVeiculo.ok) {
      console.log('[servicos action] erro ao cadastrar veículo:', novoVeiculo.error)
      return { ok: false as const, error: 'Erro ao cadastrar veículo. Tente novamente.' }
    }
    veiculoId = novoVeiculo.docRef.id
  }

  if (clienteId) {
    const patchResult = await patchCliente(clienteId, enderecoRetirada, enderecoEntrega)
    if (!patchResult?.ok) {
      console.log('[servicos action] erro ao atualizar cliente:', clienteId)
      return { ok: false as const, error: 'Erro ao atualizar dados do cliente.' }
    }
  }

  const novoServico = await postNovoServico(clienteId, veiculoId, valorCobradoNum, quemRecebeNomeVerificado, enderecoRetirada, enderecoEntrega)
  if (!novoServico.ok) {
    console.log('[servicos action] erro ao cadastrar serviço:', novoServico.error)
    return { ok: false as const, error: 'Erro ao cadastrar serviço. Tente novamente.' }
  }

  await enviarNotificacaoServidor(
    quemRecebeUid,
    'Novo serviço atribuído',
    `Cliente: ${clienteNome} — ${enderecoRetirada}`,
  )

  return { ok: true as const }
}

export default function Servicos() {
  const { clientes, veiculos, usuarios } = useLoaderData<typeof loader>()
  const fetcher = useFetcher<typeof action>()
  const wasSubmitting = useRef(false)

  const [clientesFiltrados, setClientesFiltrados] = useState<Cliente[]>([])
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | undefined>()
  const [quemRecebe, setQuemRecebe] = useState<string>('')
  const [quemRecebeUid, setQuemRecebeUid] = useState<string>('')
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
    setQuemRecebeUid('')
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
                if (!quemRecebeUid) {
                  e.preventDefault()
                  alert('Escolha quem irá receber.')
                } else if (!veiculoSelecionado?.id && (!veiculoSelecionado?.placa || veiculoSelecionado.placa.length !== 7)) {
                  e.preventDefault()
                  alert('Placa incompleta')
                }
              }}
            >
              <input type="hidden" name="clienteId" value={clienteSelecionado?.id ?? ''} />
              <input type="hidden" name="veiculoId" value={veiculoSelecionado?.id ?? ''} />
              <input type="hidden" name="quemRecebeUid" value={quemRecebeUid} />

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
                  type="tel"
                  name="valorCobrado"
                  placeholder="ex: 200"
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
                    {(usuarios as Usuario[]).map((u) => (
                      <div
                        key={u.uid}
                        className="p-2 option-hover"
                        onClick={() => {
                          setQuemRecebe(u.displayName)
                          setQuemRecebeUid(u.uid)
                          setShowOptions(false)
                        }}
                      >
                        {u.displayName}
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
