import { useState, useEffect } from 'react';
import { useLoaderData, Link, useFetcher } from 'react-router';
import { requireAdmin } from '~/services/session.server';
import { getDespesas } from '~/services/despesas.server';
import { getCategorias, postCategoria, updateCategoria, deleteCategoria } from '~/services/categorias.server';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { Route } from './+types/relatorio-despesas';

export const meta = () => [{ title: 'Relatório de Despesas — GuinchoFácil' }];

export const loader = async ({ request }: Route.LoaderArgs) => {
  await requireAdmin(request);
  const [despesas, categorias] = await Promise.all([
    getDespesas(),
    getCategorias()
  ]);
  return { despesas, categorias };
};

export const action = async ({ request }: Route.ActionArgs) => {
  await requireAdmin(request);
  const formData = await request.formData();
  const intent = formData.get('intent') as string;

  if (intent === 'add-category') {
    const nome = formData.get('nome') as string;
    const cor = formData.get('cor') as string;
    if (!nome) return { ok: false as const, error: 'Nome é obrigatório.' };
    return await postCategoria(nome, cor);
  }
  
  if (intent === 'edit-category') {
    const id = formData.get('id') as string;
    const nome = formData.get('nome') as string;
    const cor = formData.get('cor') as string;
    if (!id || !nome) return { ok: false as const, error: 'ID e Nome são obrigatórios.' };
    return await updateCategoria(id, { nome, cor });
  }

  if (intent === 'delete-category') {
    const id = formData.get('id') as string;
    if (!id) return { ok: false as const, error: 'ID é obrigatório.' };
    return await deleteCategoria(id);
  }

  return { ok: false as const, error: 'Ação desconhecida.' };
};

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function RelatorioDespesas() {
  const { despesas, categorias } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  const hoje = new Date();
  const [mesSelecionado, setMesSelecionado] = useState(hoje.getMonth());
  const [anoSelecionado, setAnoSelecionado] = useState(hoje.getFullYear());
  const [visaoCaminhao, setVisaoCaminhao] = useState<'all' | 'A' | 'B' | 'C'>('all');
  
  // Modal de Categorias
  const [showModal, setShowModal] = useState(false);
  const [editCatId, setEditCatId] = useState<string | null>(null);

  const nomesMeses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  const navegarMes = (delta: number) => {
    let novoMes = mesSelecionado + delta;
    let novoAno = anoSelecionado;
    if (novoMes < 0) { novoMes = 11; novoAno--; }
    if (novoMes > 11) { novoMes = 0; novoAno++; }
    setMesSelecionado(novoMes);
    setAnoSelecionado(novoAno);
  };

  // Filtrar despesas
  const despesasFiltradas = despesas.flatMap((d) => {
    if (visaoCaminhao !== 'all' && d.caminhao !== visaoCaminhao) {
      return [];
    }
    
    const parcelasValidas = [];
    const baseDate = new Date(d.dataPagamento + 'T12:00:00');
    for (let i = 0; i < d.parcelas; i++) {
      const dParcela = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, baseDate.getDate());
      if (dParcela.getMonth() === mesSelecionado && dParcela.getFullYear() === anoSelecionado) {
        parcelasValidas.push({
          ...d,
          valorEfetivo: d.valorParcela
        });
      }
    }
    return parcelasValidas;
  });

  // Agrupar totais por categoria
  const totaisPorCategoria: Record<string, number> = {};
  let totalGeral = 0;

  despesasFiltradas.forEach(d => {
    const catNome = d.descricao || 'Outros';
    totaisPorCategoria[catNome] = (totaisPorCategoria[catNome] || 0) + d.valorEfetivo;
    totalGeral += d.valorEfetivo;
  });

  const chartData = Object.entries(totaisPorCategoria).map(([name, value]) => {
    const cat = categorias.find(c => c.nome === name);
    return {
      name,
      value,
      color: cat?.cor || '#9ca3af'
    };
  }).sort((a, b) => b.value - a.value);

  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleSaveCategory = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (editCatId) {
      formData.append('intent', 'edit-category');
      formData.append('id', editCatId);
    } else {
      formData.append('intent', 'add-category');
    }
    fetcher.submit(formData, { method: 'post' });
    setEditCatId(null);
    e.currentTarget.reset();
  };

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data && !(fetcher.data as any).ok) {
      alert(`Erro: ${(fetcher.data as any).error}`);
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <div
      className="min-vh-100 py-4 px-3 position-relative"
      style={{
        background: 'linear-gradient(160deg, hsl(220 20% 5%) 0%, hsl(230 22% 11%) 50%, hsl(260 18% 9%) 100%)',
        color: 'hsl(0 0% 95%)',
      }}
    >
      <div className="container-fluid" style={{ maxWidth: '1400px' }}>
        
        {/* Header */}
        <div className="d-flex flex-column flex-xl-row align-items-xl-center justify-content-between mb-4 gap-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <Link to="/" className="btn btn-outline-light btn-sm rounded-pill px-3">
                <i className="bi bi-arrow-left me-1"></i> Painel Inicial
              </Link>
              <button 
                onClick={() => setShowModal(true)} 
                className="btn btn-outline-info btn-sm rounded-pill px-3"
              >
                <i className="bi bi-tags me-1"></i> Gerenciar Categorias
              </button>
            </div>
            <h1 className="h2 fw-bold text-white mb-0">Relatório de Despesas</h1>
            <p className="text-secondary small mb-0">Detalhamento agrupado por Categorias e Caminhão</p>
          </div>
          
          <div className="d-flex flex-wrap align-items-center gap-3">
            {/* Filtro de Caminhão */}
            <div className="d-flex align-items-center bg-dark rounded-pill border border-secondary p-1" style={{ maxWidth: '300px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
              <button onClick={() => setVisaoCaminhao('all')} className={`btn btn-sm rounded-pill px-3 fw-bold ${visaoCaminhao === 'all' ? 'btn-primary' : 'btn-dark border-0 text-secondary'}`}>Geral (Todos)</button>
              <button onClick={() => setVisaoCaminhao('A')} className={`btn btn-sm rounded-pill px-3 fw-bold ${visaoCaminhao === 'A' ? 'btn-primary' : 'btn-dark border-0 text-secondary'}`}>Caminhão A</button>
              <button onClick={() => setVisaoCaminhao('B')} className={`btn btn-sm rounded-pill px-3 fw-bold ${visaoCaminhao === 'B' ? 'btn-primary' : 'btn-dark border-0 text-secondary'}`}>Caminhão B</button>
              <button onClick={() => setVisaoCaminhao('C')} className={`btn btn-sm rounded-pill px-3 fw-bold ${visaoCaminhao === 'C' ? 'btn-primary' : 'btn-dark border-0 text-secondary'}`}>Caminhão C</button>
            </div>

            {/* Controle de Meses */}
            <div className="d-flex align-items-center gap-2">
              <button onClick={() => navegarMes(-1)} className="btn btn-dark rounded-circle border border-secondary d-flex align-items-center justify-content-center" style={{ width: 44, height: 44 }}>
                <i className="bi bi-chevron-left" />
              </button>
              <div className="px-3 py-2 rounded-3 border border-secondary fw-bold text-center" style={{ background: 'hsl(220 16% 13%)', minWidth: '140px', fontSize: '1rem' }}>
                {nomesMeses[mesSelecionado]} <span className="d-none d-sm-inline">{anoSelecionado}</span>
              </div>
              <button onClick={() => navegarMes(1)} className="btn btn-dark rounded-circle border border-secondary d-flex align-items-center justify-content-center" style={{ width: 44, height: 44 }}>
                <i className="bi bi-chevron-right" />
              </button>
            </div>
          </div>
        </div>

        {/* Visão de Dados */}
        {totalGeral === 0 ? (
          <div className="text-center py-5 border border-secondary rounded-4 bg-black bg-opacity-50">
            <i className="bi bi-inbox text-secondary" style={{ fontSize: '3rem' }}></i>
            <h3 className="h5 mt-3 text-light">Nenhuma despesa neste mês para o filtro atual.</h3>
          </div>
        ) : (
          <div className="row g-4">
            {/* Gráfico de Pizza */}
            <div className="col-12 col-lg-5 col-xl-4">
              <div className="p-4 rounded-4 border border-secondary bg-black bg-opacity-50 h-100 d-flex flex-column align-items-center justify-content-center shadow">
                <h4 className="text-light fw-bold text-center mb-0">Distribuição</h4>
                <p className="text-secondary small text-center mb-4">Total Gasto: <strong className="text-white">{fmt(totalGeral)}</strong></p>
                <div style={{ width: '100%', height: 320 }}>
                  {isClient && (
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={120}
                          paddingAngle={2}
                          dataKey="value"
                          stroke="none"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: any) => fmt(Number(value))} 
                          contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: '8px', color: '#fff' }} 
                          itemStyle={{ color: '#fff' }} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* Cards de Categorias */}
            <div className="col-12 col-lg-7 col-xl-8">
              <div className="row g-3">
                {chartData.map((item, idx) => (
                  <div key={idx} className="col-12 col-md-6 col-xl-4">
                    <div className="p-4 rounded-4 border border-secondary position-relative overflow-hidden shadow-sm h-100" style={{ background: 'hsl(220 16% 13%)' }}>
                      <div className="position-absolute top-0 start-0 h-100" style={{ width: '6px', background: item.color }}></div>
                      <div className="d-flex justify-content-between align-items-start mb-2 ms-2">
                        <span className="fw-semibold text-secondary small">{item.name}</span>
                        <span className="badge rounded-pill" style={{ background: `${item.color}33`, color: item.color }}>
                          {((item.value / totalGeral) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <h3 className="h4 fw-bold mb-0 ms-2" style={{ color: item.color }}>{fmt(item.value)}</h3>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Gerenciar Categorias */}
      {showModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 bg-black bg-opacity-75 d-flex align-items-center justify-content-center z-3 p-3" style={{ backdropFilter: 'blur(4px)' }}>
          <div className="bg-dark border border-secondary rounded-4 shadow-lg w-100 d-flex flex-column" style={{ maxWidth: '600px', maxHeight: '90vh' }}>
            <div className="p-4 border-bottom border-secondary d-flex justify-content-between align-items-center">
              <h3 className="h5 fw-bold m-0 text-white">Gerenciar Categorias</h3>
              <button onClick={() => { setShowModal(false); setEditCatId(null); }} className="btn-close btn-close-white"></button>
            </div>
            
            <div className="p-4 overflow-y-auto">
              <fetcher.Form method="post" onSubmit={handleSaveCategory} className="mb-4 bg-black bg-opacity-50 p-3 rounded-3 border border-secondary">
                <h5 className="small text-secondary mb-3">{editCatId ? 'Editar Categoria' : 'Nova Categoria'}</h5>
                <div className="row g-2 align-items-center">
                  <div className="col-12 col-sm-6">
                    <input type="text" name="nome" placeholder="Nome da categoria" required className="form-control bg-dark text-white border-secondary" defaultValue={editCatId ? categorias.find(c => c.id === editCatId)?.nome : ''} />
                  </div>
                  <div className="col-8 col-sm-3 d-flex align-items-center gap-2">
                    <label className="text-secondary small mb-0">Cor:</label>
                    <input type="color" name="cor" required className="form-control form-control-color bg-dark border-secondary p-1" defaultValue={editCatId ? categorias.find(c => c.id === editCatId)?.cor : '#ef4444'} title="Escolha uma cor" />
                  </div>
                  <div className="col-4 col-sm-3 d-grid">
                    <button type="submit" className="btn btn-primary btn-sm fw-bold" disabled={fetcher.state !== 'idle'}>
                      {fetcher.state !== 'idle' ? '...' : 'Salvar'}
                    </button>
                  </div>
                </div>
                {editCatId && (
                  <div className="mt-2 text-end">
                    <button type="button" onClick={() => setEditCatId(null)} className="btn btn-link text-secondary btn-sm p-0 text-decoration-none">Cancelar edição</button>
                  </div>
                )}
              </fetcher.Form>

              <div className="list-group list-group-flush rounded-3 border border-secondary">
                {categorias.map(cat => (
                  <div key={cat.id} className="list-group-item bg-dark border-secondary text-white d-flex justify-content-between align-items-center py-2">
                    <div className="d-flex align-items-center gap-3">
                      <div className="rounded-circle" style={{ width: '16px', height: '16px', background: cat.cor }}></div>
                      <span className="fw-semibold">{cat.nome}</span>
                    </div>
                    <div className="d-flex gap-2">
                      <button onClick={() => setEditCatId(cat.id || null)} className="btn btn-sm btn-outline-secondary py-1 px-2">
                        <i className="bi bi-pencil"></i>
                      </button>
                      <fetcher.Form method="post" onSubmit={(e) => { if(!confirm('Excluir categoria?')) e.preventDefault(); }}>
                        <input type="hidden" name="intent" value="delete-category" />
                        <input type="hidden" name="id" value={cat.id} />
                        <button type="submit" className="btn btn-sm btn-outline-danger py-1 px-2" disabled={fetcher.state !== 'idle'}>
                          <i className="bi bi-trash"></i>
                        </button>
                      </fetcher.Form>
                    </div>
                  </div>
                ))}
                {categorias.length === 0 && (
                  <div className="list-group-item bg-dark text-secondary text-center py-4">Nenhuma categoria cadastrada.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
