import { useEffect, useRef, useState } from 'react';
import { useFetcher, Link, useLoaderData } from 'react-router';
import { requireAdmin } from '~/services/session.server';
import { postNovaDespesa } from '~/services/despesas.server';
import { getCategorias, postCategoria, updateCategoria, deleteCategoria } from '~/services/categorias.server';
import { getCentrosCustoHibridos, postCentroCusto, updateCentroCusto, deleteCentroCusto } from '~/services/centrosCusto.server';
import type { Route } from './+types/despesas';

export const meta = () => [{ title: 'Lançar Despesa — GuinchoFácil' }];

export const loader = async ({ request }: Route.LoaderArgs) => {
  await requireAdmin(request);
  const [categorias, centrosCusto] = await Promise.all([
    getCategorias(),
    getCentrosCustoHibridos()
  ]);
  return { categorias, centrosCusto };
};

export const action = async ({ request }: Route.ActionArgs) => {
  await requireAdmin(request);
  const formData = await request.formData();
  const intent = formData.get('intent') as string || 'add-expense';

  if (intent === 'add-expense') {
    const categoriaId = formData.get('categoriaId') as string;
    const centroCustoId = formData.get('centroCustoId') as string;
    const valorTotalRaw = formData.get('valorTotal') as string;
    const dataPagamento = formData.get('dataPagamento') as string;
    const parcelasRaw = formData.get('parcelas') as string;

    if (!categoriaId) return { ok: false as const, error: 'Selecione uma Categoria.' };
    if (!centroCustoId) return { ok: false as const, error: 'Selecione um Centro de Custo.' };

    const valorTotal = parseFloat(valorTotalRaw);
    if (isNaN(valorTotal) || valorTotal <= 0 || valorTotal > 100000) {
      return { ok: false as const, error: 'Insira um valor de custo válido.' };
    }

    const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
    if (!dataPagamento || !ISO_DATE.test(dataPagamento) || isNaN(Date.parse(dataPagamento))) {
      return { ok: false as const, error: 'Data de pagamento inválida.' };
    }

    const parcelas = parseInt(parcelasRaw, 10);
    if (isNaN(parcelas) || parcelas < 1 || parcelas > 48) {
      return { ok: false as const, error: 'Quantidade de parcelas deve ser entre 1 e 48.' };
    }

    const categorias = await getCategorias();
    const categoriaNome = categorias.find(c => c.id === categoriaId)?.nome || 'Outros';

    const result = await postNovaDespesa({
      categoriaId,
      centroCustoId,
      valorTotal,
      descricao: categoriaNome,
      dataPagamento,
      parcelas,
    });

    if (!result.ok) {
      return { ok: false as const, error: 'Erro ao registrar despesa no Firestore.' };
    }

    return { ok: true as const, action: 'add-expense' };
  }

  // --- GERENCIAMENTO DE CATEGORIAS ---
  if (intent === 'save-category') {
    const id = formData.get('id') as string;
    const nome = formData.get('nome') as string;
    const cor = formData.get('cor') as string;
    const centrosCustoIds = formData.getAll('centrosCustoIds') as string[];
    
    if (!nome) return { ok: false as const, error: 'Nome é obrigatório.' };
    
    // Validação de unicidade
    const todasCategorias = await getCategorias();
    const nomeNormalizado = nome.trim().toLowerCase();
    const existeOutra = todasCategorias.some(c => c.id !== id && c.nome.trim().toLowerCase() === nomeNormalizado);
    if (existeOutra) {
      return { ok: false as const, error: 'Já existe uma categoria com este nome.' };
    }

    if (id) {
      await updateCategoria(id, { nome, cor, centrosCustoIds });
    } else {
      await postCategoria(nome, cor, centrosCustoIds);
    }
    return { ok: true as const, action: 'save-category' };
  }

  if (intent === 'delete-category') {
    const id = formData.get('id') as string;
    if (!id) return { ok: false as const, error: 'ID é obrigatório.' };
    await deleteCategoria(id);
    return { ok: true as const, action: 'delete-category' };
  }

  // --- GERENCIAMENTO DE CENTROS DE CUSTO ---
  if (intent === 'save-centro') {
    const id = formData.get('id') as string;
    const nome = formData.get('nome') as string;
    const tipo = formData.get('tipo') as string;
    const categoriasIds = formData.getAll('categoriasIds') as string[];

    const todosHibridos = await getCentrosCustoHibridos();
    const isHibrido = id ? todosHibridos.find(cc => cc.id === id)?.isHibrido : false;
    let centroCustoId = id;

    if (!isHibrido) {
      if (!nome) return { ok: false as const, error: 'Nome é obrigatório.' };

      // Validação de unicidade
      const nomeNormalizado = nome.trim().toLowerCase();
      const existeOutro = todosHibridos.some(cc => cc.id !== id && cc.nome.trim().toLowerCase() === nomeNormalizado);
      if (existeOutro) {
        return { ok: false as const, error: 'Já existe um centro de custo com este nome.' };
      }

      if (id) {
        await updateCentroCusto(id, { nome, tipo: '' });
      } else {
        const res = await postCentroCusto(nome, '');
        if (!res.ok) return { ok: false as const, error: 'Erro ao criar Centro de Custo.' };
        centroCustoId = res.docRef!.id;
      }
    }

    // Atualiza os vínculos bidirecionalmente nas Categorias
    const todasCategorias = await getCategorias();
    for (const cat of todasCategorias) {
      const catId = cat.id!;
      const hasLink = cat.centrosCustoIds?.includes(centroCustoId) || false;
      const shouldHaveLink = categoriasIds.includes(catId);

      if (shouldHaveLink && !hasLink) {
        const novosIds = [...(cat.centrosCustoIds || []), centroCustoId];
        await updateCategoria(catId, { centrosCustoIds: novosIds });
      } else if (!shouldHaveLink && hasLink) {
        const novosIds = (cat.centrosCustoIds || []).filter(cid => cid !== centroCustoId);
        await updateCategoria(catId, { centrosCustoIds: novosIds });
      }
    }

    return { ok: true as const, action: 'save-centro' };
  }

  if (intent === 'delete-centro') {
    const id = formData.get('id') as string;
    if (!id) return { ok: false as const, error: 'ID é obrigatório.' };
    await deleteCentroCusto(id);
    return { ok: true as const, action: 'delete-centro' };
  }

  return { ok: false as const, error: 'Ação desconhecida.' };
};

export default function LançarDespesa() {
  const { categorias, centrosCusto } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const formRef = useRef<HTMLFormElement>(null);
  
  // Estado do Lançamento
  const [selectedCategoriaId, setSelectedCategoriaId] = useState<string>('');

  // Estado do Gerenciamento
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'categorias' | 'centros'>('categorias');
  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [editCentroId, setEditCentroId] = useState<string | null>(null);

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      if (fetcher.data.ok) {
        if (fetcher.data.action === 'add-expense') {
          alert('Despesa registrada com sucesso!');
          formRef.current?.reset();
          setSelectedCategoriaId('');
        } else {
          // Ações de gerenciamento fecham edição e mantém modal aberto
          setEditCatId(null);
          setEditCentroId(null);
        }
      } else if (!fetcher.data.ok) {
        alert(`Erro: ${fetcher.data.error}`);
      }
    }
  }, [fetcher.state, fetcher.data]);

  // Filtra centros de custo baseados na categoria selecionada
  const centrosCustoPermitidos = selectedCategoriaId 
    ? centrosCusto.filter(cc => {
        const cat = categorias.find(c => c.id === selectedCategoriaId);
        return cat?.centrosCustoIds?.includes(cc.id!);
      })
    : [];

  return (
    <div className="min-vh-100 bg-dark text-white py-5 px-3 d-flex flex-column align-items-center">
      
      {/* Container Principal do Formulário */}
      <div 
        className="w-100 rounded-4 p-4 p-md-5 border border-secondary shadow-lg bg-opacity-75 bg-black mb-4" 
        style={{ maxWidth: '600px', backdropFilter: 'blur(10px)' }}
      >
        <div className="d-flex align-items-center justify-content-between mb-4">
          <Link to="/" className="btn btn-outline-light btn-sm rounded-pill px-3">
            <i className="bi bi-arrow-left me-1"></i> Voltar
          </Link>
          <h2 className="h4 fw-bold m-0 text-gradient bg-gradient-to-r from-red-400 to-amber-500 bg-clip-text text-transparent">
            GuinchoFácil
          </h2>
        </div>

        <h1 className="h3 fw-bold mb-4 text-white">Lançar Despesa</h1>

        <fetcher.Form ref={formRef} method="post" className="needs-validation">
          <input type="hidden" name="intent" value="add-expense" />
          
          <div className="mb-3">
            <label className="form-label fw-semibold text-light">Categoria de Despesa</label>
            <select
              name="categoriaId"
              className="form-select form-select-lg bg-dark text-white border-secondary focus:border-primary text-base min-h-[48px]"
              required
              value={selectedCategoriaId}
              onChange={(e) => setSelectedCategoriaId(e.target.value)}
            >
              <option value="">Selecione uma categoria...</option>
              {categorias.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.nome}</option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold text-light">Centro de Custo</label>
            <select
              name="centroCustoId"
              className="form-select form-select-lg bg-dark text-white border-secondary focus:border-primary text-base min-h-[48px]"
              required
              disabled={!selectedCategoriaId}
            >
              <option value="">
                {!selectedCategoriaId ? 'Selecione a categoria primeiro...' : 'Escolha um centro de custo...'}
              </option>
              {centrosCustoPermitidos.map(cc => (
                <option key={cc.id} value={cc.id}>{cc.nome}</option>
              ))}
            </select>
            {selectedCategoriaId && centrosCustoPermitidos.length === 0 && (
              <div className="form-text text-warning mt-1">
                <i className="bi bi-exclamation-circle me-1"></i>
                Não há centros de custo vinculados a esta categoria.
              </div>
            )}
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold text-light">Valor do Custo (R$)</label>
            <input
              type="number"
              name="valorTotal"
              step="0.01"
              min="0.01"
              max="100000"
              className="form-control form-control-lg bg-dark text-white border-secondary focus:border-primary text-base min-h-[48px]"
              placeholder="Ex: 350.00"
              required
            />
          </div>

          <div className="row">
            <div className="col-12 col-md-6 mb-3">
              <label className="form-label fw-semibold text-light">Data do Pagamento</label>
              <input
                type="date"
                name="dataPagamento"
                className="form-control form-control-lg bg-dark text-white border-secondary focus:border-primary text-base min-h-[48px]"
                required
                defaultValue={new Date().toISOString().substring(0, 10)}
              />
            </div>

            <div className="col-12 col-md-6 mb-3">
              <label className="form-label fw-semibold text-light">Parcelas (Meses)</label>
              <select
                name="parcelas"
                className="form-select form-select-lg bg-dark text-white border-secondary focus:border-primary text-base min-h-[48px]"
                required
                defaultValue="1"
              >
                <option value="1">À vista (1x)</option>
                <option value="2">2 meses</option>
                <option value="3">3 meses</option>
                <option value="4">4 meses</option>
                <option value="6">6 meses</option>
                <option value="10">10 meses</option>
                <option value="12">12 meses (1 ano)</option>
                <option value="24">24 meses (2 anos)</option>
              </select>
            </div>
          </div>

          <div className="d-grid mt-4">
            <button
              type="submit"
              className="btn btn-danger btn-lg fw-bold rounded-3 min-h-[48px]"
              disabled={fetcher.state !== 'idle' || centrosCustoPermitidos.length === 0}
            >
              {fetcher.state !== 'idle' && formDataHasIntent(fetcher.formData, 'add-expense') ? (
                <>
                  <span className="spinner-border spinner-border-sm role-status me-2" aria-hidden="true"></span>
                  Lançando Custo...
                </>
              ) : (
                'Salvar Despesa'
              )}
            </button>
          </div>
        </fetcher.Form>
      </div>

      {/* Botão Extra */}
      <div className="w-100 d-flex justify-content-center" style={{ maxWidth: '600px' }}>
        <button 
          onClick={() => setShowModal(true)}
          className="btn btn-outline-info rounded-pill px-4 py-2 fw-semibold w-100"
        >
          <i className="bi bi-gear-fill me-2"></i>
          Gerenciar Categorias e Centros de Custos
        </button>
      </div>

      {/* MODAL DE GERENCIAMENTO */}
      {showModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 bg-black bg-opacity-75 d-flex align-items-center justify-content-center z-3 p-3" style={{ backdropFilter: 'blur(8px)' }}>
          <div className="bg-dark border border-secondary rounded-4 shadow-lg w-100 d-flex flex-column" style={{ maxWidth: '700px', maxHeight: '90vh' }}>
            <div className="p-4 border-bottom border-secondary d-flex justify-content-between align-items-center bg-black bg-opacity-50 rounded-top-4">
              <h3 className="h5 fw-bold m-0 text-white">Gerenciamento</h3>
              <button onClick={() => { setShowModal(false); setEditCatId(null); setEditCentroId(null); }} className="btn-close btn-close-white"></button>
            </div>
            
            {/* Tabs */}
            <div className="d-flex border-bottom border-secondary">
              <button 
                className={`flex-fill py-3 fw-bold border-0 bg-transparent ${activeTab === 'categorias' ? 'text-primary border-bottom border-primary border-3' : 'text-secondary'}`}
                onClick={() => { setActiveTab('categorias'); setEditCatId(null); setEditCentroId(null); }}
              >
                Categorias
              </button>
              <button 
                className={`flex-fill py-3 fw-bold border-0 bg-transparent ${activeTab === 'centros' ? 'text-primary border-bottom border-primary border-3' : 'text-secondary'}`}
                onClick={() => { setActiveTab('centros'); setEditCatId(null); setEditCentroId(null); }}
              >
                Centros de Custo
              </button>
            </div>

            <div className="p-4 overflow-y-auto" style={{ flex: 1 }}>
              
              {/* TAB CATEGORIAS */}
              {activeTab === 'categorias' && (
                <>
                  <fetcher.Form key={editCatId || 'new-cat'} method="post" className="mb-4 bg-black bg-opacity-50 p-4 rounded-4 border border-secondary">
                    <input type="hidden" name="intent" value="save-category" />
                    {editCatId && <input type="hidden" name="id" value={editCatId} />}
                    
                    <h5 className="h6 text-white mb-3 fw-bold">
                      {editCatId ? 'Editar Categoria' : 'Nova Categoria'}
                    </h5>
                    
                    <div className="row g-3 mb-3">
                      <div className="col-12 col-md-8">
                        <label className="form-label small text-secondary">Nome</label>
                        <input type="text" name="nome" required className="form-control bg-dark text-white border-secondary" defaultValue={editCatId ? categorias.find(c => c.id === editCatId)?.nome : ''} />
                      </div>
                      <div className="col-12 col-md-4">
                        <label className="form-label small text-secondary">Cor</label>
                        <input type="color" name="cor" required className="form-control form-control-color bg-dark border-secondary p-1 w-100" defaultValue={editCatId ? categorias.find(c => c.id === editCatId)?.cor : '#3b82f6'} />
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label small text-secondary">Centros de Custo Permitidos (Vínculo)</label>
                      <MobileMultiSelect 
                        name="centrosCustoIds"
                        title="centros de custo"
                        options={centrosCusto.map(cc => ({ id: cc.id!, label: cc.nome }))}
                        initialSelectedIds={categorias.find(c => c.id === editCatId)?.centrosCustoIds || []}
                      />
                    </div>

                    <div className="d-flex justify-content-end gap-2">
                      {editCatId && (
                        <button type="button" onClick={() => setEditCatId(null)} className="btn btn-outline-secondary btn-sm">Cancelar</button>
                      )}
                      <button type="submit" className="btn btn-primary btn-sm px-4 fw-bold" disabled={fetcher.state !== 'idle'}>
                        {fetcher.state !== 'idle' && formDataHasIntent(fetcher.formData, 'save-category') ? '...' : 'Salvar Categoria'}
                      </button>
                    </div>
                  </fetcher.Form>

                  <div className="list-group rounded-4 border border-secondary overflow-hidden shadow-sm">
                    {categorias.map(cat => (
                      <div key={cat.id} className="list-group-item bg-dark border-secondary text-white d-flex justify-content-between align-items-center py-3">
                        <div className="d-flex flex-column">
                          <div className="d-flex align-items-center gap-2 mb-1">
                            <div className="rounded-circle" style={{ width: '12px', height: '12px', background: cat.cor }}></div>
                            <span className="fw-bold">{cat.nome}</span>
                          </div>
                          <span className="small text-secondary">
                            Vínculos: {cat.centrosCustoIds?.length || 0} Centro(s)
                          </span>
                        </div>
                        <div className="d-flex gap-2">
                          <button onClick={() => setEditCatId(cat.id || null)} className="btn btn-sm btn-dark border-secondary text-info">
                            <i className="bi bi-pencil"></i>
                          </button>
                          <fetcher.Form method="post" onSubmit={(e) => { if(!confirm('Excluir categoria?')) e.preventDefault(); }}>
                            <input type="hidden" name="intent" value="delete-category" />
                            <input type="hidden" name="id" value={cat.id} />
                            <button type="submit" className="btn btn-sm btn-dark border-secondary text-danger">
                              <i className="bi bi-trash"></i>
                            </button>
                          </fetcher.Form>
                        </div>
                      </div>
                    ))}
                    {categorias.length === 0 && (
                      <div className="list-group-item bg-dark text-secondary text-center py-4">Nenhuma categoria.</div>
                    )}
                  </div>
                </>
              )}

              {/* TAB CENTROS DE CUSTO */}
              {activeTab === 'centros' && (
                <>
                  <fetcher.Form key={editCentroId || 'new-centro'} method="post" className="mb-4 bg-black bg-opacity-50 p-4 rounded-4 border border-secondary">
                    <input type="hidden" name="intent" value="save-centro" />
                    {editCentroId && <input type="hidden" name="id" value={editCentroId} />}
                    
                    <h5 className="h6 text-white mb-3 fw-bold">
                      {editCentroId ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}
                    </h5>
                    
                    <div className="row g-3 mb-3">
                      <div className="col-12">
                        <label className="form-label small text-secondary">Nome (Ex: Sócio, Escritório)</label>
                        <input type="text" name="nome" required className="form-control bg-dark text-white border-secondary" defaultValue={editCentroId ? centrosCusto.find(cc => cc.id === editCentroId)?.nome : ''} disabled={centrosCusto.find(cc => cc.id === editCentroId)?.isHibrido} title={centrosCusto.find(cc => cc.id === editCentroId)?.isHibrido ? 'Cadastro oficial: edite na aba Cadastros' : ''} />
                      </div>
                    </div>

                    {centrosCusto.find(cc => cc.id === editCentroId)?.isHibrido && (
                      <div className="alert alert-info py-2 small mb-3">
                        <i className="bi bi-info-circle me-1"></i> Este é um cadastro oficial do sistema. Você não pode alterar seu nome ou tipo aqui, apenas gerenciar os vínculos de categorias.
                      </div>
                    )}

                    <div className="mb-3">
                      <label className="form-label small text-secondary">Categorias Permitidas (Vínculo)</label>
                      <MobileMultiSelect 
                        name="categoriasIds"
                        title="categorias"
                        options={categorias.map(cat => ({ id: cat.id!, label: cat.nome }))}
                        initialSelectedIds={editCentroId ? (categorias.filter(cat => cat.centrosCustoIds?.includes(editCentroId)).map(c => c.id!)) : []}
                      />
                    </div>

                    <div className="d-flex justify-content-end gap-2">
                      {editCentroId && (
                        <button type="button" onClick={() => setEditCentroId(null)} className="btn btn-outline-secondary btn-sm">Cancelar</button>
                      )}
                      <button type="submit" className="btn btn-primary btn-sm px-4 fw-bold" disabled={fetcher.state !== 'idle'}>
                        {fetcher.state !== 'idle' && formDataHasIntent(fetcher.formData, 'save-centro') ? '...' : 'Salvar Centro'}
                      </button>
                    </div>
                  </fetcher.Form>

                  <div className="list-group rounded-4 border border-secondary overflow-hidden shadow-sm">
                    {centrosCusto.map(cc => (
                      <div key={cc.id} className="list-group-item bg-dark border-secondary text-white d-flex justify-content-between align-items-center py-3">
                        <div className="d-flex flex-column">
                          <span className="fw-bold mb-1">{cc.nome}</span>
                          <span className="small text-secondary">
                            {cc.tipo && <span className="badge bg-secondary me-2">{cc.tipo}</span>}
                            Categorias: {categorias.filter(cat => cat.centrosCustoIds?.includes(cc.id!)).length}
                          </span>
                        </div>
                        <div className="d-flex gap-2">
                          <button onClick={() => setEditCentroId(cc.id || null)} className="btn btn-sm btn-dark border-secondary text-info">
                            <i className="bi bi-link-45deg me-1"></i> Vincular
                          </button>
                          {!cc.isHibrido ? (
                            <fetcher.Form method="post" onSubmit={(e) => { if(!confirm('Excluir centro de custo?')) e.preventDefault(); }}>
                              <input type="hidden" name="intent" value="delete-centro" />
                              <input type="hidden" name="id" value={cc.id} />
                              <button type="submit" className="btn btn-sm btn-dark border-secondary text-danger">
                                <i className="bi bi-trash"></i>
                              </button>
                            </fetcher.Form>
                          ) : (
                            <button type="button" className="btn btn-sm btn-dark border-secondary text-secondary" title="Cadastro oficial: edite na aba Cadastros" disabled>
                              <i className="bi bi-lock-fill"></i>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {centrosCusto.length === 0 && (
                      <div className="list-group-item bg-dark text-secondary text-center py-4">Nenhum Centro de Custo.</div>
                    )}
                  </div>
                </>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper para verificar qual form está sendo submetido
function formDataHasIntent(formData: any, intent: string) {
  if (!formData) return false;
  return formData.get('intent') === intent;
}

// Componente amigável para Mobile de Múltipla Escolha
function MobileMultiSelect({ 
  name, 
  options, 
  initialSelectedIds, 
  title 
}: { 
  name: string, 
  options: { id: string, label: string }[], 
  initialSelectedIds: string[], 
  title: string 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelectedIds));
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    setSelected(new Set(initialSelectedIds));
  }, [initialSelectedIds]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  return (
    <div className="position-relative" ref={dropdownRef}>
      <button
        type="button"
        className="form-select bg-dark text-white border-secondary focus:border-primary text-start w-100 min-h-[48px] d-flex justify-content-between align-items-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-truncate">
          {selected.size === 0 ? `Selecione ${title}...` : `${selected.size} selecionado(s)`}
        </span>
      </button>
      
      <div className={`position-absolute top-100 start-0 w-100 mt-1 bg-dark border border-secondary rounded-3 shadow-lg z-3 overflow-hidden ${isOpen ? 'd-block' : 'd-none'}`}>
        <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
          {options.length === 0 && <div className="p-3 small text-muted text-center">Nenhuma opção disponível.</div>}
          {options.map(opt => {
            const isChecked = selected.has(opt.id);
            return (
              <label key={opt.id} className="d-flex align-items-center px-3 py-3 border-bottom border-secondary m-0 hover-bg-black" style={{ cursor: 'pointer', transition: 'background 0.2s' }}>
                <input 
                  type="checkbox" 
                  name={name} 
                  value={opt.id} 
                  checked={isChecked}
                  onChange={() => toggleOption(opt.id)}
                  className="form-check-input me-3 mt-0 flex-shrink-0"
                  style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                />
                <span className="text-light">{opt.label}</span>
              </label>
            );
          })}
        </div>
        <div className="p-2 bg-black bg-opacity-50 text-center border-top border-secondary">
          <button type="button" className="btn btn-sm btn-outline-light w-100" onClick={() => setIsOpen(false)}>Pronto</button>
        </div>
      </div>
    </div>
  );
}
