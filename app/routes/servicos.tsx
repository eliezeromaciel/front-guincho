import { useEffect, useRef, useState } from 'react';
import { useFetcher, useLoaderData, Link } from 'react-router';
import { getClientes, postNovoCliente, patchCliente } from '~/services/clientes';
import { getVeiculos, postNovoVeiculo } from '~/services/veiculos';
import { postNovoServico, getServicos } from '~/services/servicos';
import { requireAdmin } from '~/services/session.server';
import { getFuncionarios, verificarFuncionarioExiste } from '~/services/funcionarios';
import { enviarNotificacaoServidor } from '~/services/webpush.server';
import type { Route } from './+types/servicos';

type Cliente = {
  id?: string;
  nome: string;
  telefone?: string;
  enderecoRetirada?: string;
  enderecoEntrega?: string;
};

type Veiculo = {
  id?: string;
  placa: string;
  modelo?: string;
};

type Funcionario = {
  uid: string;
  displayName: string;
  role: 'admin' | 'readonly';
  motorista: 'A' | 'B' | 'C' | 'none';
};

export const meta = () => [{ title: 'Novo Serviço — GuinchoFácil' }];

export const loader = async ({ request }: Route.LoaderArgs) => {
  await requireAdmin(request);
  const [clientes, veiculos, usuarios, servicos] = await Promise.all([
    getClientes(),
    getVeiculos(),
    getFuncionarios(),
    getServicos(),
  ]);
  return { clientes, veiculos, usuarios, servicos };
};

export const action = async ({ request }: Route.ActionArgs) => {
  await requireAdmin(request);
  const formData = await request.formData();
  
  const clienteIdRaw = ((formData.get('clienteId') as string | null) ?? '').trim();
  const clienteNome = ((formData.get('cliente') as string | null) ?? '').trim();
  const clienteTelefone = ((formData.get('clienteTelefone') as string | null) ?? '').trim();
  
  const veiculoIdRaw = ((formData.get('veiculoId') as string | null) ?? '').trim();
  const veiculoPlaca = ((formData.get('veiculo') as string | null) ?? '').trim();
  const detalhesVeiculo = ((formData.get('detalhesVeiculo') as string | null) ?? '').trim();
  const valorCobradoRaw = ((formData.get('valorCobrado') as string | null) ?? '').trim();
  
  const quemRecebeUid = ((formData.get('quemRecebeUid') as string | null) ?? '').trim();
  const motoristaUid = ((formData.get('motoristaUid') as string | null) ?? '').trim();
  
  const enderecoRetirada = ((formData.get('enderecoRetirada') as string | null) ?? '').trim();
  const enderecoEntrega = ((formData.get('enderecoEntrega') as string | null) ?? '').trim();

  if (!clienteNome || clienteNome.length > 50) {
    return { ok: false as const, error: 'Nome do cliente inválido.' };
  }
  if (clienteTelefone && clienteTelefone.length > 20) {
    return { ok: false as const, error: 'Telefone inválido.' };
  }
  if (!enderecoRetirada || enderecoRetirada.length > 300) {
    return { ok: false as const, error: 'Endereço de retirada inválido.' };
  }
  if (!enderecoEntrega || enderecoEntrega.length > 300) {
    return { ok: false as const, error: 'Endereço de entrega inválido.' };
  }
  if (!quemRecebeUid) {
    return { ok: false as const, error: 'Selecione quem receberá o valor.' };
  }
  if (!motoristaUid) {
    return { ok: false as const, error: 'Selecione o motorista para a guinchada.' };
  }

  // Busca nomes do Firestore — não confia nos hidden fields do formulário
  const { adminDb } = await import('~/services/firebaseAdmin');
  const [motoristaDoc, receptorDoc] = await Promise.all([
    adminDb.collection('funcionarios').doc(motoristaUid).get(),
    adminDb.collection('funcionarios').doc(quemRecebeUid).get(),
  ]);
  if (!motoristaDoc.exists) {
    return { ok: false as const, error: 'Motorista selecionado não encontrado.' };
  }
  if (!receptorDoc.exists) {
    return { ok: false as const, error: 'Receptor do valor não encontrado.' };
  }
  const motoristaNome = (motoristaDoc.data() as { nome?: string })?.nome ?? '';
  const quemRecebeNome = (receptorDoc.data() as { nome?: string })?.nome ?? '';

  const valorCobradoNum = parseInt(valorCobradoRaw, 10);
  if (isNaN(valorCobradoNum) || valorCobradoNum <= 0 || valorCobradoNum > 99999) {
    return { ok: false as const, error: 'Valor cobrado inválido.' };
  }

  let clienteId = clienteIdRaw;
  let veiculoId = veiculoIdRaw;

  // 1. Cadastra cliente se não existir
  if (!clienteId) {
    const novoCliente = await postNovoCliente(clienteNome, clienteTelefone || undefined, undefined, enderecoEntrega, enderecoRetirada);
    if (!novoCliente.ok) {
      return { ok: false as const, error: 'Erro ao cadastrar novo cliente.' };
    }
    clienteId = novoCliente.docRef.id;
  }

  // 2. Cadastra veículo se não existir
  if (!veiculoId) {
    const PLACA_MERCOSUL = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;
    if (!veiculoPlaca || !PLACA_MERCOSUL.test(veiculoPlaca)) {
      return { ok: false as const, error: 'Placa do veículo inválida. Use o formato ABC8K25.' };
    }
    const novoVeiculo = await postNovoVeiculo(veiculoPlaca, detalhesVeiculo);
    if (!novoVeiculo.ok) {
      return { ok: false as const, error: 'Erro ao cadastrar novo veículo.' };
    }
    veiculoId = novoVeiculo.docRef.id;
  }

  // 3. Atualizar endereços de referência no cliente
  if (clienteId) {
    await patchCliente(clienteId, enderecoRetirada, enderecoEntrega);
  }

  // 4. Cadastra o Serviço
  const novoServico = await postNovoServico(
    clienteId,
    veiculoId,
    veiculoPlaca,
    valorCobradoNum,
    quemRecebeNome,
    quemRecebeUid,
    enderecoRetirada,
    enderecoEntrega,
    motoristaUid,
    motoristaNome,
    detalhesVeiculo
  );

  if (!novoServico.ok) {
    return { ok: false as const, error: 'Erro ao cadastrar serviço no Firestore.' };
  }

  // 5. Enviar Notificação Web Push para o Motorista Escolhido
  try {
    await enviarNotificacaoServidor(
      motoristaUid,
      'Novo serviço de guincho!',
      `Veículo: ${detalhesVeiculo} (${veiculoPlaca}) — De: ${enderecoRetirada}`
    );
  } catch (err) {
    console.log('[servicos action] falha ao enviar notificação push:', err);
  }

  return { ok: true as const };
};

export default function Servicos() {
  const { clientes, veiculos, usuarios, servicos } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const wasSubmitting = useRef(false);

  // States
  const [clientesFiltrados, setClientesFiltrados] = useState<Cliente[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | undefined>();
  const [novoClienteTelefone, setNovoClienteTelefone] = useState<string>('');

  const [veiculosFiltrados, setVeiculosFiltrados] = useState<Veiculo[]>([]);
  const [veiculoSelecionado, setVeiculoSelecionado] = useState<Veiculo | undefined>();
  
  const [detalhesVeiculo, setDetalhesVeiculo] = useState<string>('');
  const [enderecoRetirada, setEnderecoRetirada] = useState<string>('');
  const [enderecoEntrega, setEnderecoEntrega] = useState<string>('');

  const [quemRecebeUid, setQuemRecebeUid] = useState<string>('');
  const [quemRecebeNome, setQuemRecebeNome] = useState<string>('');
  
  const [motoristaUid, setMotoristaUid] = useState<string>('');
  const [motoristaNome, setMotoristaNome] = useState<string>('');

  // Busca Inteligente de Clientes (Nome ou Telefone)
  const handleChangeInputNome = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    const valorClean = valor.toLowerCase();
    
    setClienteSelecionado({ nome: valor });
    setNovoClienteTelefone('');

    if (valorClean.length < 1) {
      setClientesFiltrados([]);
      return;
    }

    const filtered = (clientes as Cliente[]).filter((c) => {
      const nomeMatches = (c.nome ?? '').toLowerCase().includes(valorClean);
      const telefoneClean = (c.telefone ?? '').replace(/\D/g, '');
      const inputDigits = valorClean.replace(/\D/g, '');
      const telefoneMatches = inputDigits !== '' && telefoneClean.includes(inputDigits);
      return nomeMatches || telefoneMatches;
    });

    setClientesFiltrados(filtered);
  };

  // Ao selecionar um cliente
  const handleClienteSelected = (elem: Cliente) => {
    setClienteSelecionado(elem);
    setClientesFiltrados([]);
    setNovoClienteTelefone(elem.telefone ?? '');
    setEnderecoRetirada(elem.enderecoRetirada ?? '');
    setEnderecoEntrega(elem.enderecoEntrega ?? '');
  };

  // Cálculo de histórico e estatísticas do cliente selecionado
  const getClientHistory = () => {
    if (!clienteSelecionado?.id) return null;
    const clientServices = servicos.filter((s) => s.clienteId === clienteSelecionado.id);
    if (clientServices.length === 0) return null;

    const count = clientServices.length;
    const total = clientServices.reduce((sum, s) => sum + s.valorCobrado, 0);
    const avg = total / count;

    return { count, avg };
  };

  const history = getClientHistory();

  // Validação e busca de Placas
  const handleChangeInputPlaca = (e: React.ChangeEvent<HTMLInputElement>) => {
    let valorPlaca = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (valorPlaca.length > 7) valorPlaca = valorPlaca.slice(0, 7);

    const padraoMercosul = [
      /^[A-Z]$/, /^[A-Z]$/, /^[A-Z]$/,
      /^[0-9]$/,
      /^[A-Z0-9]$/,
      /^[0-9]$/, /^[0-9]$/,
    ];

    let placaValidada = '';
    for (let i = 0; i < valorPlaca.length; i++) {
      if (padraoMercosul[i].test(valorPlaca[i])) {
        placaValidada += valorPlaca[i];
      } else {
        break;
      }
    }

    setVeiculoSelecionado({ placa: placaValidada });
    setDetalhesVeiculo('');

    if (placaValidada.length < 1) {
      setVeiculosFiltrados([]);
      return;
    }

    const filtered = (veiculos as Veiculo[]).filter((v) => v.placa.includes(placaValidada));
    setVeiculosFiltrados(filtered);
  };

  const handlePlacaSelected = (elem: Veiculo) => {
    setVeiculoSelecionado(elem);
    setVeiculosFiltrados([]);
    setDetalhesVeiculo(elem.modelo ?? '');
  };

  const resetarFormulario = () => {
    setClienteSelecionado({ nome: '' });
    setClientesFiltrados([]);
    setNovoClienteTelefone('');
    setVeiculosFiltrados([]);
    setVeiculoSelecionado({ placa: '' });
    setDetalhesVeiculo('');
    setEnderecoRetirada('');
    setEnderecoEntrega('');
    setQuemRecebeUid('');
    setQuemRecebeNome('');
    setMotoristaUid('');
    setMotoristaNome('');
  };

  useEffect(() => {
    if (fetcher.state === 'submitting') {
      wasSubmitting.current = true;
    }
    if (fetcher.state === 'idle' && wasSubmitting.current) {
      wasSubmitting.current = false;
      if (fetcher.data?.ok) {
        alert('Serviço criado e motorista notificado via Web Push!');
        resetarFormulario();
      } else if (fetcher.data && !fetcher.data.ok) {
        alert(`Erro: ${fetcher.data.error}`);
      }
    }
  }, [fetcher.state, fetcher.data]);

  // Lista de motoristas da frota ( Gabriel, Daniel, ou motoristas cadastrados )
  const motoristasDisponiveis = (usuarios as Funcionario[]).filter((u) => u.motorista !== 'none' || u.role === 'readonly');

  return (
    <div className="min-vh-100 bg-dark text-white py-5 px-3 d-flex align-items-center justify-content-center">
      <div 
        className="w-100 rounded-4 p-4 p-md-5 border border-secondary shadow-lg bg-opacity-75 bg-black" 
        style={{ maxWidth: '750px', backdropFilter: 'blur(10px)' }}
      >
        <div className="d-flex align-items-center justify-content-between mb-4">
          <Link to="/" className="btn btn-outline-light btn-sm rounded-pill px-3">
            <i className="bi bi-arrow-left me-1"></i> Voltar
          </Link>
          <h2 className="h4 fw-bold m-0 text-gradient bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
            GuinchoFácil
          </h2>
        </div>

        <h1 className="h3 fw-bold mb-1 text-white">Lançar Novo Serviço</h1>
        <p className="text-secondary mb-4" style={{ fontSize: '0.95rem' }}>
          Preencha os dados e o motorista será notificado em tempo real.
        </p>

        <fetcher.Form
          method="post"
          className="needs-validation"
          onSubmit={(e) => {
            if (!motoristaUid) {
              e.preventDefault();
              alert('Por favor, selecione quem fará a guinchada.');
            } else if (!quemRecebeUid) {
              e.preventDefault();
              alert('Por favor, selecione quem receberá o valor do guincho.');
            } else if (!veiculoSelecionado?.id && (!veiculoSelecionado?.placa || veiculoSelecionado.placa.length !== 7)) {
              e.preventDefault();
              alert('Placa do veículo incompleta.');
            }
          }}
        >
          <input type="hidden" name="clienteId" value={clienteSelecionado?.id ?? ''} />
          <input type="hidden" name="veiculoId" value={veiculoSelecionado?.id ?? ''} />
          <input type="hidden" name="quemRecebeUid" value={quemRecebeUid} />
          <input type="hidden" name="quemRecebeNome" value={quemRecebeNome} />
          <input type="hidden" name="motoristaUid" value={motoristaUid} />
          <input type="hidden" name="motoristaNome" value={motoristaNome} />

          {/* Seção Cliente */}
          <h5 className="border-bottom border-secondary pb-2 mb-3 text-primary small fw-bold uppercase tracking-wider">
            Informações do Cliente
          </h5>

          <div className="row">
            <div className="col-12 col-md-8 mb-3 position-relative">
              <label className="form-label fw-semibold text-light">Cliente (Nome ou Telefone)</label>
              <input
                className="form-control form-control-lg bg-dark text-white border-secondary focus:border-primary text-base min-h-[48px]"
                type="text"
                name="cliente"
                placeholder="Busque por nome ou telefone..."
                maxLength={50}
                required
                value={clienteSelecionado?.nome ?? ''}
                onChange={handleChangeInputNome}
                onBlur={() => setTimeout(() => setClientesFiltrados([]), 250)}
              />
              {clientesFiltrados.length > 0 && (
                <ul className="list-group position-absolute w-100 shadow-lg bg-black border border-secondary mt-1 rounded-3 overflow-hidden" style={{ zIndex: 1000 }}>
                  {clientesFiltrados.map((c, idx) => (
                    <li
                      key={idx}
                      className="list-group-item list-group-item-action bg-dark text-white border-secondary p-3 option-hover"
                      style={{ cursor: 'pointer' }}
                      onMouseDown={() => handleClienteSelected(c)}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="fw-bold">{c.nome}</span>
                        <span className="badge bg-secondary font-mono small">{c.telefone || 'Sem tel'}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="col-12 col-md-4 mb-3">
              <label className="form-label fw-semibold text-light">Telefone</label>
              <input
                className="form-control form-control-lg bg-dark text-white border-secondary text-base min-h-[48px]"
                type="tel"
                name="clienteTelefone"
                placeholder="(51) 99999-9999"
                value={novoClienteTelefone}
                onChange={(e) => setNovoClienteTelefone(e.target.value)}
                disabled={!!clienteSelecionado?.id}
              />
            </div>
          </div>

          {/* Histórico do Cliente Recorrente */}
          {history && (
            <div className="alert alert-info border border-info border-opacity-25 bg-info bg-opacity-10 text-info p-3 mb-4 rounded-3 shadow-sm">
              <div className="d-flex align-items-center gap-2 mb-2">
                <i className="bi bi-star-fill text-warning"></i>
                <span className="fw-bold small uppercase">Histórico GuinchoFácil</span>
              </div>
              <p className="mb-0 small leading-relaxed">
                Este cliente já efetuou <strong>{history.count}</strong> serviço(s) anteriormente.
                <br />
                Valor médio cobrado: <strong className="font-mono text-light">R$ {history.avg.toFixed(2)}</strong>.
                <br />
                <span className="text-secondary">Dica: Recomendamos manter valores próximos a R$ {history.avg.toFixed(0)} ou conceder desconto de cliente fiel.</span>
              </p>
            </div>
          )}

          {/* Seção Veículo */}
          <h5 className="border-bottom border-secondary pb-2 mb-3 text-primary small fw-bold uppercase tracking-wider mt-2">
            Detalhes do Veículo
          </h5>

          <div className="row">
            <div className="col-12 col-md-5 mb-3 position-relative">
              <label className="form-label fw-semibold text-light">Placa do Veículo</label>
              <input
                className="form-control form-control-lg bg-dark text-white border-secondary focus:border-primary text-base min-h-[48px] font-mono"
                type="text"
                name="veiculo"
                placeholder="Ex: ABC8K25"
                maxLength={7}
                required
                value={veiculoSelecionado?.placa ?? ''}
                onChange={handleChangeInputPlaca}
                onBlur={() => setTimeout(() => setVeiculosFiltrados([]), 250)}
              />
              {veiculosFiltrados.length > 0 && (
                <ul className="list-group position-absolute w-100 shadow-lg bg-black border border-secondary mt-1 rounded-3 overflow-hidden" style={{ zIndex: 1000 }}>
                  {veiculosFiltrados.map((v, idx) => (
                    <li
                      key={idx}
                      className="list-group-item list-group-item-action bg-dark text-white border-secondary p-3 option-hover"
                      style={{ cursor: 'pointer' }}
                      onMouseDown={() => handlePlacaSelected(v)}
                    >
                      <div className="d-flex justify-content-between">
                        <span className="fw-bold font-mono">{v.placa}</span>
                        <span className="text-secondary small">{v.modelo}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="col-12 col-md-7 mb-3">
              <label className="form-label fw-semibold text-light">Detalhes / Modelo (Cor, Tipo)</label>
              <input
                className="form-control form-control-lg bg-dark text-white border-secondary focus:border-primary text-base min-h-[48px]"
                type="text"
                name="detalhesVeiculo"
                placeholder="Ex: corsa azul, moto hornet preta"
                maxLength={50}
                required
                value={detalhesVeiculo}
                onChange={(e) => setDetalhesVeiculo(e.target.value)}
              />
            </div>
          </div>

          {/* Seção Operação e Cobrança */}
          <h5 className="border-bottom border-secondary pb-2 mb-3 text-primary small fw-bold uppercase tracking-wider mt-2">
            Operação e Cobrança
          </h5>

          <div className="row">
            <div className="col-12 col-md-6 mb-3">
              <label className="form-label fw-semibold text-light">Quem fará a guinchada (Motorista)</label>
              <select
                className="form-select form-select-lg bg-dark text-white border-secondary focus:border-primary text-base min-h-[48px]"
                required
                value={motoristaUid}
                onChange={(e) => {
                  const uid = e.target.value;
                  setMotoristaUid(uid);
                  const name = motoristasDisponiveis.find((m) => m.uid === uid)?.displayName ?? '';
                  setMotoristaNome(name);
                }}
              >
                <option value="">Selecione o motorista...</option>
                {motoristasDisponiveis.map((m) => (
                  <option key={m.uid} value={m.uid}>
                    {m.displayName} {m.motorista !== 'none' ? `(Caminhão ${m.motorista})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-md-6 mb-3">
              <label className="form-label fw-semibold text-light">Quem receberá o valor</label>
              <select
                className="form-select form-select-lg bg-dark text-white border-secondary focus:border-primary text-base min-h-[48px]"
                required
                value={quemRecebeUid}
                onChange={(e) => {
                  const uid = e.target.value;
                  setQuemRecebeUid(uid);
                  const name = (usuarios as Funcionario[]).find((u) => u.uid === uid)?.displayName ?? '';
                  setQuemRecebeNome(name);
                }}
              >
                <option value="">Selecione quem recebe...</option>
                {(usuarios as Funcionario[]).map((u) => (
                  <option key={u.uid} value={u.uid}>
                    {u.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label fw-semibold text-light">Valor Cobrado (R$)</label>
            <input
              className="form-control form-control-lg bg-dark text-white border-secondary focus:border-primary text-base min-h-[48px]"
              type="number"
              name="valorCobrado"
              placeholder="Ex: 250"
              min="1"
              max="99999"
              required
            />
          </div>

          {/* Seção Endereços */}
          <h5 className="border-bottom border-secondary pb-2 mb-3 text-primary small fw-bold uppercase tracking-wider mt-2">
            Rotas / Endereços
          </h5>

          <div className="mb-3">
            <label className="form-label fw-semibold text-light">Endereço de Retirada (Busca)</label>
            <input
              className="form-control form-control-lg bg-dark text-white border-secondary focus:border-primary text-base min-h-[48px]"
              type="text"
              name="enderecoRetirada"
              placeholder="Ex: Rua Camaleão, 345, Porto Alegre"
              maxLength={300}
              required
              value={enderecoRetirada}
              onChange={(e) => setEnderecoRetirada(e.target.value)}
            />
          </div>

          <div className="mb-4">
            <label className="form-label fw-semibold text-light">Endereço de Entrega (Destino)</label>
            <input
              className="form-control form-control-lg bg-dark text-white border-secondary focus:border-primary text-base min-h-[48px]"
              type="text"
              name="enderecoEntrega"
              placeholder="Ex: Av. Indústrias, 79, São Leopoldo"
              maxLength={300}
              required
              value={enderecoEntrega}
              onChange={(e) => setEnderecoEntrega(e.target.value)}
            />
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
                  Criando e Notificando...
                </>
              ) : (
                'Confirmar e Lançar Serviço'
              )}
            </button>
          </div>
        </fetcher.Form>
      </div>
    </div>
  );
}

