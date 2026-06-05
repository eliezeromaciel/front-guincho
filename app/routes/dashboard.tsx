import { useState } from 'react';
import { useLoaderData, Link, useFetcher } from 'react-router';
import { requireAdmin } from '~/services/session.server';
import { getServicos } from '~/services/servicos.server';
import { getDespesas } from '~/services/despesas.server';
import type { Route } from './+types/dashboard';

export const meta = () => [{ title: 'Painel Financeiro — GuinchoFácil' }];

export const loader = async ({ request }: Route.LoaderArgs) => {
  await requireAdmin(request);
  const [servicos, despesas] = await Promise.all([
    getServicos(),
    getDespesas(),
  ]);
  return { servicos, despesas };
};

export const action = async ({ request }: Route.ActionArgs) => {
  await requireAdmin(request);
  const formData = await request.formData();
  const intent = formData.get('intent') as string;

  if (intent === 'marcar-recebido') {
    const servicoId = formData.get('servicoId') as string;
    if (!servicoId) return { ok: false as const, error: 'ID inválido.' };
    const { marcarFaturadoRecebido } = await import('~/services/servicos.server');
    const result = await marcarFaturadoRecebido(servicoId);
    if (!result.ok) return { ok: false as const, error: 'Erro ao marcar como recebido.' };
    return { ok: true as const };
  }

  return { ok: false as const, error: 'Ação desconhecida.' };
};

const getJsDate = (ts: any): Date | null => {
  if (!ts) return null;
  if (typeof ts.toDate === 'function') return ts.toDate();
  if (ts.seconds) return new Date(ts.seconds * 1000);
  if (ts._seconds) return new Date(ts._seconds * 1000);
  return new Date(ts);
};

// Formata moeda BRL
const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Mapeamento caminhão → nome para exibição na tabela
const caminhaoNomeMap: Record<string, string> = {
  A: 'Caminhão A',
  B: 'Caminhão B',
  C: 'Caminhão C',
};

type LinhaRelatorio = {
  date: Date;
  motorista: string;
  quemRecebe: string;
  descricao: string;
  valor: number;
  tipo: 'receita' | 'despesa' | 'faturado' | 'faturado-recebido';
  servicoId?: string;
  faturadoStatus?: string;
};

export default function Dashboard() {
  const { servicos, despesas } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const hoje = new Date();
  const [mesSelecionado, setMesSelecionado] = useState(hoje.getMonth());
  const [anoSelecionado, setAnoSelecionado] = useState(hoje.getFullYear());

  // Nomes dos meses
  const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const navegarMes = (delta: number) => {
    let novoMes = mesSelecionado + delta;
    let novoAno = anoSelecionado;
    if (novoMes < 0) { novoMes = 11; novoAno--; }
    if (novoMes > 11) { novoMes = 0; novoAno++; }
    setMesSelecionado(novoMes);
    setAnoSelecionado(novoAno);
  };

  // ==============================
  // MONTAR LINHAS DO RELATÓRIO
  // ==============================
  const linhas: LinhaRelatorio[] = [];

  // 1. SERVIÇOS — receitas diretas e faturados
  servicos.forEach((s) => {
    const sDate = getJsDate(s.finalizedAt || s.createdAt);
    if (!sDate) return;

    const tipo = (s as any).tipoRecebedor || 'motorista';

    if (tipo === 'seguradora') {
      const fStatus = (s as any).faturadoStatus || 'pendente';
      const segNome = (s as any).seguradoraNome || s.receiver || 'Seguradora';

      // Linha do faturado — aparece no mês de criação
      if (sDate.getMonth() === mesSelecionado && sDate.getFullYear() === anoSelecionado) {
        linhas.push({
          date: sDate,
          motorista: s.motoristaNome || '—',
          quemRecebe: `Faturado ${segNome}`,
          descricao: s.detalhesVeiculo || s.placaVeiculo || 'Serviço',
          valor: s.valorCobrado,
          tipo: 'faturado',
          servicoId: s.id,
          faturadoStatus: fStatus,
        });
      }

      // Linha do recebimento — aparece no mês em que foi recebido
      if (fStatus === 'recebido') {
        const recebidoEm = getJsDate((s as any).faturadoRecebidoEm);
        if (recebidoEm && recebidoEm.getMonth() === mesSelecionado && recebidoEm.getFullYear() === anoSelecionado) {
          linhas.push({
            date: recebidoEm,
            motorista: s.motoristaNome || '—',
            quemRecebe: `Fat Recebida ${segNome}`,
            descricao: `Pgto fatura — ${s.detalhesVeiculo || s.placaVeiculo || 'Serviço'}`,
            valor: s.valorCobrado,
            tipo: 'faturado-recebido',
          });
        }
      }
    } else {
      // Receita direta (motorista ou nenhum)
      if (sDate.getMonth() === mesSelecionado && sDate.getFullYear() === anoSelecionado) {
        linhas.push({
          date: sDate,
          motorista: s.motoristaNome || '—',
          quemRecebe: s.receiver || s.motoristaNome || '—',
          descricao: s.detalhesVeiculo || s.placaVeiculo || 'Serviço',
          valor: s.valorCobrado,
          tipo: 'receita',
        });
      }
    }
  });

  // 2. DESPESAS — saídas dos caminhões (diluídas por parcelas)
  despesas.forEach((d) => {
    const baseDate = new Date(d.dataPagamento + 'T12:00:00');
    for (let i = 0; i < d.parcelas; i++) {
      const dParcela = new Date(
        baseDate.getFullYear(),
        baseDate.getMonth() + i,
        baseDate.getDate()
      );
      if (dParcela.getMonth() === mesSelecionado && dParcela.getFullYear() === anoSelecionado) {
        const parcInfo = d.parcelas > 1 ? ` (${i + 1}/${d.parcelas})` : '';
        linhas.push({
          date: dParcela,
          motorista: '—',
          quemRecebe: `${caminhaoNomeMap[d.caminhao] || d.caminhao} SA`,
          descricao: `${d.descricao}${parcInfo}`,
          valor: -d.valorParcela,
          tipo: 'despesa',
        });
      }
    }
  });

  // Ordenar por data
  linhas.sort((a, b) => a.date.getTime() - b.date.getTime());

  // ==============================
  // CÁLCULOS DE RESUMO
  // ==============================

  // Receitas por motorista
  const receitasPorMotorista: Record<string, number> = {};
  const despesasPorCaminhao: Record<string, number> = {};

  linhas.forEach((l) => {
    if (l.tipo === 'receita') {
      receitasPorMotorista[l.motorista] = (receitasPorMotorista[l.motorista] || 0) + l.valor;
    }
    if (l.tipo === 'despesa') {
      const cam = l.quemRecebe.replace(' SA', '');
      despesasPorCaminhao[cam] = (despesasPorCaminhao[cam] || 0) + Math.abs(l.valor);
    }
  });

  const totalReceitas = linhas
    .filter((l) => l.tipo === 'receita' || l.tipo === 'faturado-recebido')
    .reduce((sum, l) => sum + l.valor, 0);

  const totalDespesas = linhas
    .filter((l) => l.tipo === 'despesa')
    .reduce((sum, l) => sum + Math.abs(l.valor), 0);

  const totalFaturadosPendentes = linhas
    .filter((l) => l.tipo === 'faturado' && l.faturadoStatus === 'pendente')
    .reduce((sum, l) => sum + l.valor, 0);

  const totalFaturadosRecebidos = linhas
    .filter((l) => l.tipo === 'faturado-recebido')
    .reduce((sum, l) => sum + l.valor, 0);

  const saldoLiquido = totalReceitas - totalDespesas;

  // Faturados pendentes agrupados por seguradora
  const faturadosPorSeguradora: Record<string, { valor: number; itens: LinhaRelatorio[] }> = {};
  linhas
    .filter((l) => l.tipo === 'faturado' && l.faturadoStatus === 'pendente')
    .forEach((l) => {
      const segNome = l.quemRecebe.replace('Faturado ', '');
      if (!faturadosPorSeguradora[segNome]) faturadosPorSeguradora[segNome] = { valor: 0, itens: [] };
      faturadosPorSeguradora[segNome].valor += l.valor;
      faturadosPorSeguradora[segNome].itens.push(l);
    });

  // Recebidos agrupados
  const recebidosPorSeguradora: Record<string, number> = {};
  linhas
    .filter((l) => l.tipo === 'faturado-recebido')
    .forEach((l) => {
      const segNome = l.quemRecebe.replace('Fat Recebida ', '');
      recebidosPorSeguradora[segNome] = (recebidosPorSeguradora[segNome] || 0) + l.valor;
    });

  return (
    <div className="min-vh-100 py-4 px-3" style={{ background: 'linear-gradient(160deg, hsl(220 20% 5%) 0%, hsl(230 22% 11%) 50%, hsl(260 18% 9%) 100%)', color: 'hsl(0 0% 95%)' }}>
      <div className="container-fluid" style={{ maxWidth: '1400px' }}>
        
        {/* Header */}
        <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between mb-4 gap-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <Link to="/" className="btn btn-outline-light btn-sm rounded-pill px-3">
                <i className="bi bi-arrow-left me-1"></i> Painel Inicial
              </Link>
            </div>
            <h1 className="h2 fw-bold text-white mb-0">Relatórios Financeiros</h1>
            <p className="text-secondary small mb-0">Visualização detalhada tipo planilha — receitas, faturados e despesas.</p>
          </div>

          {/* Seletor de Mês */}
          <div className="d-flex align-items-center gap-2">
            <button
              onClick={() => navegarMes(-1)}
              className="btn btn-dark btn-sm rounded-circle border border-secondary d-flex align-items-center justify-content-center"
              style={{ width: 36, height: 36 }}
            >
              <i className="bi bi-chevron-left" />
            </button>
            <div
              className="px-4 py-2 rounded-3 border border-secondary fw-bold text-center"
              style={{ background: 'hsl(220 16% 13%)', minWidth: '180px' }}
            >
              {nomesMeses[mesSelecionado]} {anoSelecionado}
            </div>
            <button
              onClick={() => navegarMes(1)}
              className="btn btn-dark btn-sm rounded-circle border border-secondary d-flex align-items-center justify-content-center"
              style={{ width: 36, height: 36 }}
            >
              <i className="bi bi-chevron-right" />
            </button>

            {/* Botão Download Excel */}
            <a
              href={`/api/download-relatorio?mes=${mesSelecionado + 1}&ano=${anoSelecionado}`}
              className="btn btn-sm rounded-pill px-3 fw-bold ms-2"
              style={{ background: 'linear-gradient(135deg, hsl(142 71% 40%), hsl(160 60% 35%))', color: '#fff', border: 'none' }}
            >
              <i className="bi bi-file-earmark-excel me-1" /> Baixar Excel
            </a>
          </div>
        </div>

        {/* Cards de Métricas */}
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-4 col-lg-2">
            <div className="gf-metric-card metric-success p-3">
              <span style={{ color: 'hsl(220 10% 55%)' }} className="fw-semibold small d-block mb-1">Total Receitas</span>
              <h4 className="h5 fw-bold mb-0" style={{ color: 'hsl(142 71% 50%)' }}>{fmt(totalReceitas)}</h4>
            </div>
          </div>
          <div className="col-6 col-md-4 col-lg-2">
            <div className="gf-metric-card metric-danger p-3">
              <span style={{ color: 'hsl(220 10% 55%)' }} className="fw-semibold small d-block mb-1">Total Despesas</span>
              <h4 className="h5 fw-bold mb-0" style={{ color: 'hsl(0 84% 60%)' }}>{fmt(totalDespesas)}</h4>
            </div>
          </div>
          <div className="col-6 col-md-4 col-lg-2">
            <div className="gf-metric-card metric-primary p-3">
              <span style={{ color: 'hsl(220 10% 55%)' }} className="fw-semibold small d-block mb-1">Saldo Líquido</span>
              <h4 className="h5 fw-bold mb-0" style={{ color: saldoLiquido >= 0 ? 'hsl(217 91% 60%)' : 'hsl(38 92% 50%)' }}>
                {fmt(saldoLiquido)}
              </h4>
            </div>
          </div>
          <div className="col-6 col-md-4 col-lg-2">
            <div className="gf-metric-card p-3" style={{ borderLeft: '3px solid hsl(38 92% 50%)' }}>
              <span style={{ color: 'hsl(220 10% 55%)' }} className="fw-semibold small d-block mb-1">Faturados Pendentes</span>
              <h4 className="h5 fw-bold mb-0" style={{ color: 'hsl(38 92% 50%)' }}>{fmt(totalFaturadosPendentes)}</h4>
            </div>
          </div>
          <div className="col-6 col-md-4 col-lg-2">
            <div className="gf-metric-card p-3" style={{ borderLeft: '3px solid hsl(270 60% 55%)' }}>
              <span style={{ color: 'hsl(220 10% 55%)' }} className="fw-semibold small d-block mb-1">Fat. Recebidos</span>
              <h4 className="h5 fw-bold mb-0" style={{ color: 'hsl(270 60% 55%)' }}>{fmt(totalFaturadosRecebidos)}</h4>
            </div>
          </div>
          <div className="col-6 col-md-4 col-lg-2">
            <div className="gf-metric-card metric-info p-3">
              <span style={{ color: 'hsl(220 10% 55%)' }} className="fw-semibold small d-block mb-1">Guinchos</span>
              <h4 className="h5 fw-bold mb-0" style={{ color: 'hsl(199 89% 55%)' }}>
                {linhas.filter((l) => l.tipo === 'receita' || l.tipo === 'faturado').length}
              </h4>
            </div>
          </div>
        </div>

        {/* Resumo por Motorista / Caminhão */}
        <div className="row g-3 mb-4">
          {Object.entries(receitasPorMotorista).map(([nome, valor]) => (
            <div key={nome} className="col-6 col-md-3">
              <div className="p-3 rounded-3 border border-secondary" style={{ background: 'hsl(220 16% 13%)' }}>
                <div className="d-flex align-items-center gap-2 mb-1">
                  <i className="bi bi-person-fill text-success" />
                  <span className="fw-bold text-light small">{nome}</span>
                </div>
                <span className="text-success fw-bold font-mono">{fmt(valor)}</span>
              </div>
            </div>
          ))}
          {Object.entries(despesasPorCaminhao).map(([nome, valor]) => (
            <div key={nome} className="col-6 col-md-3">
              <div className="p-3 rounded-3 border border-secondary" style={{ background: 'hsl(220 16% 13%)' }}>
                <div className="d-flex align-items-center gap-2 mb-1">
                  <i className="bi bi-truck text-danger" />
                  <span className="fw-bold text-light small">{nome} SA</span>
                </div>
                <span className="text-danger fw-bold font-mono">-{fmt(valor)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Tabela Detalhada (principal) */}
        <div className="bg-black bg-opacity-50 border border-secondary rounded-3 p-3 shadow-sm mb-4">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h3 className="h5 fw-bold m-0 text-light">
              <i className="bi bi-table me-2" />
              Lançamentos — {nomesMeses[mesSelecionado]} {anoSelecionado}
            </h3>
            <span className="badge bg-secondary rounded-pill">{linhas.length} registros</span>
          </div>
          
          <div className="table-responsive">
            <table className="table table-dark table-hover table-borderless align-middle mb-0">
              <thead>
                <tr style={{ background: 'hsl(220 16% 18%)', borderBottom: '2px solid hsl(220 10% 30%)' }}>
                  <th className="small fw-bold text-secondary py-3" style={{ width: '100px' }}>Data</th>
                  <th className="small fw-bold text-secondary py-3" style={{ width: '130px' }}>Motorista</th>
                  <th className="small fw-bold text-secondary py-3" style={{ width: '180px' }}>Quem Recebe</th>
                  <th className="small fw-bold text-secondary py-3">Descrição</th>
                  <th className="small fw-bold text-secondary py-3 text-end" style={{ width: '130px' }}>Valor (R$)</th>
                </tr>
              </thead>
              <tbody>
                {linhas.length > 0 ? (
                  linhas.map((l, idx) => {
                    let rowStyle: React.CSSProperties = {};
                    let valorClass = '';
                    let valorPrefix = '';

                    if (l.tipo === 'receita' || l.tipo === 'faturado-recebido') {
                      valorClass = 'text-success';
                      valorPrefix = '+';
                    } else if (l.tipo === 'despesa') {
                      valorClass = 'text-danger';
                      rowStyle = { background: 'hsl(0 50% 10% / 0.2)' };
                    } else if (l.tipo === 'faturado') {
                      valorClass = 'text-warning';
                      rowStyle = { background: 'hsl(38 80% 15% / 0.15)' };
                    }

                    return (
                      <tr key={idx} className="border-bottom border-secondary" style={rowStyle}>
                        <td className="text-secondary small py-2">
                          {l.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </td>
                        <td className="py-2">
                          <span className="fw-semibold text-light">{l.motorista}</span>
                        </td>
                        <td className="py-2">
                          {l.tipo === 'faturado' && (
                            <i className="bi bi-clock-history text-warning me-1" style={{ fontSize: '0.75rem' }} />
                          )}
                          {l.tipo === 'faturado-recebido' && (
                            <i className="bi bi-check-circle-fill text-success me-1" style={{ fontSize: '0.75rem' }} />
                          )}
                          {l.tipo === 'despesa' && (
                            <i className="bi bi-dash-circle text-danger me-1" style={{ fontSize: '0.75rem' }} />
                          )}
                          <span className={`small ${l.tipo === 'faturado' ? 'text-warning' : l.tipo === 'despesa' ? 'text-danger' : 'text-light'}`}>
                            {l.quemRecebe}
                          </span>
                        </td>
                        <td className="text-light small py-2">{l.descricao}</td>
                        <td className={`text-end fw-bold font-mono small py-2 ${valorClass}`}>
                          {valorPrefix}{fmt(Math.abs(l.valor))}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center text-secondary py-5">
                      <i className="bi bi-inbox" style={{ fontSize: '2rem' }} />
                      <p className="mt-2 mb-0">Nenhum lançamento neste mês.</p>
                    </td>
                  </tr>
                )}
              </tbody>
              {linhas.length > 0 && (
                <tfoot>
                  <tr style={{ background: 'hsl(220 16% 15%)', borderTop: '2px solid hsl(220 10% 30%)' }}>
                    <td colSpan={4} className="fw-bold text-light py-3">
                      TOTAL DO MÊS
                    </td>
                    <td className={`text-end fw-bold font-mono py-3 ${saldoLiquido >= 0 ? 'text-success' : 'text-danger'}`}>
                      {saldoLiquido >= 0 ? '+' : ''}{fmt(saldoLiquido)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Painéis de Faturados */}
        <div className="row g-4 mb-4">
          {/* Faturados Pendentes */}
          <div className="col-12 col-lg-6">
            <div className="bg-black bg-opacity-50 border border-secondary rounded-3 p-3 shadow-sm h-100">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h3 className="h6 fw-bold m-0 text-light">
                  <i className="bi bi-clock-history text-warning me-2" />
                  Faturados / A Receber
                </h3>
                <span className="badge rounded-pill" style={{ background: 'hsl(38 92% 50%)' }}>
                  {fmt(totalFaturadosPendentes)}
                </span>
              </div>
              
              {Object.keys(faturadosPorSeguradora).length > 0 ? (
                <div className="d-flex flex-column gap-2">
                  {Object.entries(faturadosPorSeguradora).map(([segNome, { valor, itens }]) => (
                    <div key={segNome} className="p-3 rounded-3 border border-secondary" style={{ background: 'hsl(220 16% 13%)' }}>
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <div className="d-flex align-items-center gap-2">
                          <i className="bi bi-shield-check text-warning" />
                          <span className="fw-bold text-light">Faturado {segNome}</span>
                        </div>
                        <span className="text-warning fw-bold font-mono">{fmt(valor)}</span>
                      </div>
                      {itens.map((item) => (
                        <div key={item.servicoId} className="d-flex align-items-center justify-content-between py-1 border-top border-secondary">
                          <div>
                            <small className="text-secondary">{item.date.toLocaleDateString('pt-BR')}</small>
                            <small className="text-light ms-2">{item.descricao}</small>
                            <small className="text-secondary ms-1">({item.motorista})</small>
                          </div>
                          <div className="d-flex align-items-center gap-2">
                            <small className="text-warning font-mono fw-bold">{fmt(item.valor)}</small>
                            <fetcher.Form method="post" className="d-inline">
                              <input type="hidden" name="intent" value="marcar-recebido" />
                              <input type="hidden" name="servicoId" value={item.servicoId} />
                              <button
                                type="submit"
                                className="btn btn-outline-success btn-sm rounded-pill px-2 py-0"
                                style={{ fontSize: '0.7rem' }}
                                disabled={fetcher.state !== 'idle'}
                                title="Marcar como recebido"
                              >
                                <i className="bi bi-check-lg" /> Recebido
                              </button>
                            </fetcher.Form>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-secondary py-4 mb-0">
                  <i className="bi bi-check-circle" style={{ fontSize: '1.5rem' }} />
                  <br />Sem faturados pendentes neste mês.
                </p>
              )}
            </div>
          </div>

          {/* Faturados Recebidos */}
          <div className="col-12 col-lg-6">
            <div className="bg-black bg-opacity-50 border border-secondary rounded-3 p-3 shadow-sm h-100">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h3 className="h6 fw-bold m-0 text-light">
                  <i className="bi bi-check-circle-fill text-success me-2" />
                  Faturas Recebidas no Mês
                </h3>
                <span className="badge bg-success rounded-pill">
                  {fmt(totalFaturadosRecebidos)}
                </span>
              </div>
              
              {Object.keys(recebidosPorSeguradora).length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-dark table-borderless align-middle mb-0 small">
                    <thead>
                      <tr style={{ borderBottom: '1px solid hsl(220 10% 30%)' }}>
                        <th className="text-secondary">Seguradora</th>
                        <th className="text-end text-secondary">Valor Recebido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(recebidosPorSeguradora).map(([segNome, valor]) => (
                        <tr key={segNome} className="border-bottom border-secondary">
                          <td>
                            <i className="bi bi-check-circle-fill text-success me-1" />
                            <span className="text-light fw-semibold">Fat Recebida {segNome}</span>
                          </td>
                          <td className="text-end text-success fw-bold font-mono">{fmt(valor)}</td>
                        </tr>
                      ))}
                      <tr style={{ borderTop: '2px solid hsl(220 10% 30%)' }}>
                        <td className="fw-bold text-light">Total Recebido</td>
                        <td className="text-end text-success fw-bold font-mono">{fmt(totalFaturadosRecebidos)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-secondary py-4 mb-0">
                  <i className="bi bi-hourglass-split" style={{ fontSize: '1.5rem' }} />
                  <br />Nenhuma fatura recebida neste mês.
                </p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
