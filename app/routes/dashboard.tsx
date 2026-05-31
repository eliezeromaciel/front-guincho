import { useState } from 'react';
import { useLoaderData, Link } from 'react-router';
import { requireAdmin } from '~/services/session.server';
import { getServicos } from '~/services/servicos';
import { getDespesas } from '~/services/despesas';
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

const getJsDate = (ts: any): Date | null => {
  if (!ts) return null;
  if (typeof ts.toDate === 'function') return ts.toDate();
  if (ts.seconds) return new Date(ts.seconds * 1000);
  if (ts._seconds) return new Date(ts._seconds * 1000);
  return new Date(ts);
};

export default function Dashboard() {
  const { servicos, despesas } = useLoaderData<typeof loader>();
  const [ciclo, setCiclo] = useState<'diario' | 'semanal' | 'mensal'>('mensal');

  // 1. Processar Despesas com Diluição de Parcelas
  const despesasDiluidas: { caminhao: string; descricao: string; date: Date; amount: number }[] = [];
  despesas.forEach((d) => {
    // Evitar problemas de fuso horário fixando meio-dia no fuso local
    const baseDate = new Date(d.dataPagamento + 'T12:00:00');
    for (let i = 0; i < d.parcelas; i++) {
      const dParcela = new Date(
        baseDate.getFullYear(),
        baseDate.getMonth() + i,
        baseDate.getDate()
      );
      despesasDiluidas.push({
        caminhao: d.caminhao,
        descricao: `${d.descricao} (${i + 1}/${d.parcelas})`,
        date: dParcela,
        amount: d.valorParcela,
      });
    }
  });

  // Data atual de referência para o painel
  const hoje = new Date();

  // Filtrar serviços concluídos
  const servicosConcluidos = servicos.filter((s) => s.status === 'concluido');

  // Variáveis para cálculos consolidados
  let totalReceitas = 0;
  let totalDespesas = 0;
  let totalGuinchos = 0;

  // Estruturas para agrupamento do gráfico do ciclo
  let dadosAgrupados: { label: string; receita: number; despesa: number; saldo: number; guinchos: number }[] = [];

  if (ciclo === 'diario') {
    // Últimos 7 dias individuais (inclusive hoje)
    for (let i = 6; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - i);
      const diaStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      
      let receitaDia = 0;
      let despesaDia = 0;
      let guinchosDia = 0;

      // Soma de serviços finalizados neste dia
      servicosConcluidos.forEach((s) => {
        const sDate = getJsDate(s.finalizedAt || s.createdAt);
        if (sDate && sDate.toDateString() === d.toDateString()) {
          receitaDia += s.valorCobrado;
          guinchosDia++;
        }
      });

      // Soma de despesas diluídas pagas/alocadas neste dia
      despesasDiluidas.forEach((dep) => {
        if (dep.date.toDateString() === d.toDateString()) {
          despesaDia += dep.amount;
        }
      });

      dadosAgrupados.push({
        label: diaStr,
        receita: receitaDia,
        despesa: despesaDia,
        saldo: receitaDia - despesaDia,
        guinchos: guinchosDia,
      });

      totalReceitas += receitaDia;
      totalDespesas += despesaDia;
      totalGuinchos += guinchosDia;
    }
  } else if (ciclo === 'semanal') {
    // Últimas 4 semanas (7 dias cada)
    for (let w = 3; w >= 0; w--) {
      const fimSemana = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - w * 7);
      const inicioSemana = new Date(fimSemana.getFullYear(), fimSemana.getMonth(), fimSemana.getDate() - 6);
      
      const label = `${inicioSemana.getDate()}/${inicioSemana.getMonth() + 1} - ${fimSemana.getDate()}/${fimSemana.getMonth() + 1}`;
      
      let receitaSemana = 0;
      let despesaSemana = 0;
      let guinchosSemana = 0;

      servicosConcluidos.forEach((s) => {
        const sDate = getJsDate(s.finalizedAt || s.createdAt);
        if (sDate && sDate >= inicioSemana && sDate <= fimSemana) {
          receitaSemana += s.valorCobrado;
          guinchosSemana++;
        }
      });

      despesasDiluidas.forEach((dep) => {
        if (dep.date >= inicioSemana && dep.date <= fimSemana) {
          despesaSemana += dep.amount;
        }
      });

      dadosAgrupados.push({
        label,
        receita: receitaSemana,
        despesa: despesaSemana,
        saldo: receitaSemana - despesaSemana,
        guinchos: guinchosSemana,
      });

      totalReceitas += receitaSemana;
      totalDespesas += despesaSemana;
      totalGuinchos += guinchosSemana;
    }
  } else {
    // ciclo === 'mensal' (Últimos 6 meses, incluindo o atual)
    for (let m = 5; m >= 0; m--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - m, 1);
      const mesStr = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).toUpperCase();
      
      let receitaMes = 0;
      let despesaMes = 0;
      let guinchosMes = 0;

      servicosConcluidos.forEach((s) => {
        const sDate = getJsDate(s.finalizedAt || s.createdAt);
        if (sDate && sDate.getMonth() === d.getMonth() && sDate.getFullYear() === d.getFullYear()) {
          receitaMes += s.valorCobrado;
          guinchosMes++;
        }
      });

      despesasDiluidas.forEach((dep) => {
        if (dep.date.getMonth() === d.getMonth() && dep.date.getFullYear() === d.getFullYear()) {
          despesaMes += dep.amount;
        }
      });

      dadosAgrupados.push({
        label: mesStr,
        receita: receitaMes,
        despesa: despesaMes,
        saldo: receitaMes - despesaMes,
        guinchos: guinchosMes,
      });

      totalReceitas += receitaMes;
      totalDespesas += despesaMes;
      totalGuinchos += guinchosMes;
    }
  }

  // Achar o maior valor absoluto para escala do gráfico customizado
  const maiorValor = Math.max(...dadosAgrupados.map(d => Math.max(d.receita, d.despesa, 100)));

  return (
    <div className="min-vh-100 py-4 px-3" style={{ background: 'linear-gradient(160deg, hsl(220 20% 5%) 0%, hsl(230 22% 11%) 50%, hsl(260 18% 9%) 100%)', color: 'hsl(0 0% 95%)' }}>
      <div className="container-fluid" style={{ maxWidth: '1200px' }}>
        
        {/* Header */}
        <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between mb-4 gap-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <Link to="/" className="btn btn-outline-light btn-sm rounded-pill px-3">
                <i className="bi bi-arrow-left me-1"></i> Painel Inicial
              </Link>
            </div>
            <h1 className="h2 fw-bold text-white mb-0">Relatórios Financeiros</h1>
            <p className="text-secondary small mb-0">Análise corporativa de receitas, guinchos e despesas diluídas.</p>
          </div>

          {/* Seletores de Ciclo */}
          <div className="btn-group bg-black bg-opacity-50 p-1 rounded-3 border border-secondary" role="group">
            <button
              onClick={() => setCiclo('diario')}
              className={`btn btn-sm px-3 rounded-2 fw-bold ${ciclo === 'diario' ? 'btn-primary text-white' : 'btn-dark text-secondary'}`}
            >
              Diário
            </button>
            <button
              onClick={() => setCiclo('semanal')}
              className={`btn btn-sm px-3 rounded-2 fw-bold ${ciclo === 'semanal' ? 'btn-primary text-white' : 'btn-dark text-secondary'}`}
            >
              Semanal
            </button>
            <button
              onClick={() => setCiclo('mensal')}
              className={`btn btn-sm px-3 rounded-2 fw-bold ${ciclo === 'mensal' ? 'btn-primary text-white' : 'btn-dark text-secondary'}`}
            >
              Mensal
            </button>
          </div>
        </div>

        {/* Cards de Métricas Principais */}
        <div className="row g-3 mb-4">
          <div className="col-12 col-sm-6 col-md-3 gf-animate-in-up">
            <div className="gf-metric-card metric-success">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span style={{ color: 'hsl(220 10% 55%)' }} className="fw-semibold small">Total Receitas</span>
                <i className="bi bi-cash-stack h4 m-0" style={{ color: 'hsl(142 71% 50%)' }} />
              </div>
              <h3 className="h3 fw-bold mb-1" style={{ color: 'hsl(142 71% 50%)' }}>R$ {totalReceitas.toFixed(2)}</h3>
              <span className="text-xs" style={{ color: 'hsl(220 10% 40%)' }}>{ciclo === 'mensal' ? 'Últimos 6 meses' : ciclo === 'semanal' ? 'Últimas 4 semanas' : 'Últimos 7 dias'}</span>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-md-3 gf-animate-in-up">
            <div className="gf-metric-card metric-danger">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span style={{ color: 'hsl(220 10% 55%)' }} className="fw-semibold small">Despesas Diluídas</span>
                <i className="bi bi-wallet2 h4 m-0" style={{ color: 'hsl(0 84% 60%)' }} />
              </div>
              <h3 className="h3 fw-bold mb-1" style={{ color: 'hsl(0 84% 60%)' }}>R$ {totalDespesas.toFixed(2)}</h3>
              <span className="text-xs" style={{ color: 'hsl(220 10% 40%)' }}>Custos distribuídos no período</span>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-md-3 gf-animate-in-up">
            <div className="gf-metric-card metric-primary">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span style={{ color: 'hsl(220 10% 55%)' }} className="fw-semibold small">Saldo Líquido</span>
                <i className={`bi bi-calculator h4 m-0`} style={{ color: totalReceitas - totalDespesas >= 0 ? 'hsl(217 91% 60%)' : 'hsl(38 92% 50%)' }} />
              </div>
              <h3 className={`h3 fw-bold mb-1`} style={{ color: totalReceitas - totalDespesas >= 0 ? 'hsl(217 91% 60%)' : 'hsl(38 92% 50%)' }}>
                R$ {(totalReceitas - totalDespesas).toFixed(2)}
              </h3>
              <span className="text-xs" style={{ color: 'hsl(220 10% 40%)' }}>Lucro operacional líquido</span>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-md-3 gf-animate-in-up">
            <div className="gf-metric-card metric-info">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span style={{ color: 'hsl(220 10% 55%)' }} className="fw-semibold small">Volume de Guinchos</span>
                <i className="bi bi-truck h4 m-0" style={{ color: 'hsl(199 89% 55%)' }} />
              </div>
              <h3 className="h3 fw-bold mb-1" style={{ color: 'hsl(199 89% 55%)' }}>{totalGuinchos}</h3>
              <span className="text-xs" style={{ color: 'hsl(220 10% 40%)' }}>Guinchos finalizados</span>
            </div>
          </div>
        </div>

        {/* Gráfico Customizado Premium */}
        <div className="gf-card gf-animate-in p-4 mb-4" style={{ background: 'hsl(220 16% 13%)' }}>
          <h2 className="h5 fw-bold mb-4 text-light">Visualização de Ciclos ({ciclo.toUpperCase()})</h2>
          
          <div className="d-flex flex-column gap-3">
            {dadosAgrupados.map((item, idx) => {
              const percReceita = (item.receita / maiorValor) * 100;
              const percDespesa = (item.despesa / maiorValor) * 100;

              return (
                <div key={idx} className="row align-items-center g-2">
                  <div className="col-12 col-md-2">
                    <span className="fw-bold text-light small d-block">{item.label}</span>
                    <span className="text-secondary text-xs">{item.guinchos} guincho(s)</span>
                  </div>
                  
                  <div className="col-12 col-md-7">
                    <div className="d-flex flex-column gap-1">
                      {/* Barra de Receitas */}
                      {item.receita > 0 && (
                        <div className="d-flex align-items-center gap-2">
                          <div className="progress bg-transparent flex-grow-1" style={{ height: '10px' }}>
                            <div 
                              className="progress-bar bg-success bg-gradient rounded-pill" 
                              style={{ width: `${Math.max(percReceita, 2)}%` }}
                              role="progressbar"
                            ></div>
                          </div>
                          <span className="text-success text-xs font-mono fw-bold" style={{ minWidth: '70px' }}>
                            + R$ {item.receita.toFixed(0)}
                          </span>
                        </div>
                      )}

                      {/* Barra de Despesas */}
                      {item.despesa > 0 && (
                        <div className="d-flex align-items-center gap-2">
                          <div className="progress bg-transparent flex-grow-1" style={{ height: '10px' }}>
                            <div 
                              className="progress-bar bg-danger bg-gradient rounded-pill" 
                              style={{ width: `${Math.max(percDespesa, 2)}%` }}
                              role="progressbar"
                            ></div>
                          </div>
                          <span className="text-danger text-xs font-mono fw-bold" style={{ minWidth: '70px' }}>
                            - R$ {item.despesa.toFixed(0)}
                          </span>
                        </div>
                      )}

                      {item.receita === 0 && item.despesa === 0 && (
                        <span className="text-secondary text-xs italic">Sem movimentação financeira</span>
                      )}
                    </div>
                  </div>

                  <div className="col-12 col-md-3 text-md-end">
                    <span className={`fw-bold small font-mono ${item.saldo >= 0 ? 'text-primary' : 'text-warning'}`}>
                      {item.saldo >= 0 ? '+' : ''} R$ {item.saldo.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tabelas de Serviços e Despesas Detalhadas */}
        <div className="row g-4">
          {/* Tabela de Receitas */}
          <div className="col-12 col-lg-6">
            <div className="bg-black bg-opacity-50 border border-secondary rounded-3 p-3 shadow-sm h-100">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h3 className="h6 fw-bold m-0 text-light">Últimos Guinchos Finalizados</h3>
                <span className="badge bg-success rounded-pill">Receitas</span>
              </div>
              
              <div className="table-responsive" style={{ maxHeight: '350px' }}>
                <table className="table table-dark table-hover table-borderless align-middle mb-0">
                  <thead className="table-light text-dark small fw-bold">
                    <tr>
                      <th>Data</th>
                      <th>Veículo</th>
                      <th>Motorista</th>
                      <th className="text-end">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="small">
                    {servicosConcluidos.length > 0 ? (
                      servicosConcluidos.slice(0, 10).map((s, idx) => {
                        const sDate = getJsDate(s.finalizedAt || s.createdAt);
                        return (
                          <tr key={idx} className="border-bottom border-secondary">
                            <td className="text-secondary">
                              {sDate ? sDate.toLocaleDateString('pt-BR') : '---'}
                            </td>
                            <td>
                              <span className="fw-bold text-light">{s.placaVeiculo || '---'}</span>
                              <span className="d-block text-secondary text-xs">{s.detalhesVeiculo}</span>
                            </td>
                            <td className="text-secondary">{s.motoristaNome}</td>
                            <td className="text-end text-success fw-bold font-mono">
                              R$ {s.valorCobrado.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="text-center text-secondary py-4 italic">
                          Nenhum guincho finalizado no histórico.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Tabela de Despesas */}
          <div className="col-12 col-lg-6">
            <div className="bg-black bg-opacity-50 border border-secondary rounded-3 p-3 shadow-sm h-100">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h3 className="h6 fw-bold m-0 text-light">Custos / Despesas Diluídas</h3>
                <span className="badge bg-danger rounded-pill">Despesas</span>
              </div>

              <div className="table-responsive" style={{ maxHeight: '350px' }}>
                <table className="table table-dark table-hover table-borderless align-middle mb-0">
                  <thead className="table-light text-dark small fw-bold">
                    <tr>
                      <th>Data Alocada</th>
                      <th>Caminhão</th>
                      <th>Descrição</th>
                      <th className="text-end">Custo Mensal</th>
                    </tr>
                  </thead>
                  <tbody className="small">
                    {despesasDiluidas.length > 0 ? (
                      despesasDiluidas
                        .sort((a, b) => b.date.getTime() - a.date.getTime())
                        .slice(0, 10)
                        .map((d, idx) => (
                          <tr key={idx} className="border-bottom border-secondary">
                            <td className="text-secondary">
                              {d.date.toLocaleDateString('pt-BR')}
                            </td>
                            <td>
                              <span className="badge bg-secondary">Caminhão {d.caminhao}</span>
                            </td>
                            <td className="text-light">{d.descricao}</td>
                            <td className="text-end text-danger fw-bold font-mono">
                              R$ {d.amount.toFixed(2)}
                            </td>
                          </tr>
                        ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="text-center text-secondary py-4 italic">
                          Nenhuma despesa lançada na frota.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
