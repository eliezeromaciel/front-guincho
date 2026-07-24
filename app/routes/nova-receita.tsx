import { useState, useEffect, useRef } from 'react';
import { useLoaderData, Link, useFetcher } from 'react-router';
import { requireAdmin } from '~/services/session.server';
import { getFuncionarios } from '~/services/funcionarios.server';
import { getSeguradorasAtivas } from '~/services/seguradoras.server';
import { 
  getCategoriasReceita, 
  postCategoriaReceita, 
  updateCategoriaReceita, 
  deleteCategoriaReceita 
} from '~/services/categoriasReceita.server';
import { postNovaReceita } from '~/services/receitas.server';
import type { Route } from './+types/nova-receita';

export const meta = () => [{ title: 'Lançar Receita — GuinchoFácil' }];

export const loader = async ({ request }: Route.LoaderArgs) => {
  await requireAdmin(request);
  const [funcionarios, seguradoras, categorias] = await Promise.all([
    getFuncionarios(),
    getSeguradorasAtivas(),
    getCategoriasReceita(),
  ]);
  return { funcionarios, seguradoras, categorias };
};

export const action = async ({ request }: Route.ActionArgs) => {
  await requireAdmin(request);
  const formData = await request.formData();
  const intent = formData.get('intent') as string;

  // --- ACTIONS DE GERENCIAMENTO DE CATEGORIA ---
  if (intent === 'save-category') {
    const id = formData.get('id') as string | null;
    const nome = formData.get('nome') as string;
    const cor = formData.get('cor') as string;

    if (id) {
      const res = await updateCategoriaReceita(id, { nome, cor });
      return { ok: res.ok, error: !res.ok ? res.error : undefined, action: 'save-category' };
    } else {
      const res = await postCategoriaReceita(nome, cor);
      return { ok: res.ok, error: !res.ok ? res.error : undefined, action: 'save-category' };
    }
  }

  if (intent === 'delete-category') {
    const id = formData.get('id') as string;
    const res = await deleteCategoriaReceita(id);
    return { ok: res.ok, error: !res.ok ? res.error : undefined, action: 'delete-category' };
  }

  // --- ACTION DE LANÇAMENTO DE RECEITA ---
  if (intent === 'add-revenue') {
    const dataRecebimento = formData.get('dataRecebimento') as string;
    const categoriaReceitaId = formData.get('categoriaReceitaId') as string;
    const valor = Number(formData.get('valor'));
    const quemRecebeu = formData.get('quemRecebeu') as string;
    const seguradoraId = formData.get('seguradoraId') as string | null;

    if (!dataRecebimento || !categoriaReceitaId || isNaN(valor) || valor <= 0 || !quemRecebeu) {
      return { ok: false as const, error: 'Preencha todos os campos obrigatórios com valores válidos.' };
    }

    // Buscar dados complementares
    const categorias = await getCategoriasReceita();
    const cat = categorias.find(c => c.id === categoriaReceitaId);
    if (!cat) return { ok: false as const, error: 'Categoria de receita inválida.' };

    let seguradoraNome = undefined;
    let finalSeguradoraId = undefined;

    // Se for faturado de seguradora, precisamos associar a seguradora
    if (cat.isSystem && cat.nome.toLowerCase() === 'fatura de seguradora') {
      if (!seguradoraId) {
        return { ok: false as const, error: 'Seguradora é obrigatória para este tipo de receita.' };
      }
      const seguradoras = await getSeguradorasAtivas();
      const seg = seguradoras.find(s => s.id === seguradoraId);
      if (!seg) return { ok: false as const, error: 'Seguradora não encontrada.' };
      seguradoraNome = seg.nome;
      finalSeguradoraId = seguradoraId;
    }

    const res = await postNovaReceita({
      dataRecebimento,
      categoriaReceitaId,
      categoriaReceitaNome: cat.nome,
      valor,
      quemRecebeu,
      seguradoraId: finalSeguradoraId,
      seguradoraNome,
    });

    return { ok: res.ok, error: !res.ok ? res.error : undefined, action: 'add-revenue' };
  }

  return { ok: false as const, error: 'Ação inválida.' };
};

export default function LançarReceita() {
  const { funcionarios, seguradoras, categorias } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const formRef = useRef<HTMLFormElement>(null);

  // Estados locais
  const [selectedCategoriaId, setSelectedCategoriaId] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editCatId, setEditCatId] = useState<string | null>(null);

  // Data de hoje formatada
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      if (fetcher.data.ok) {
        if (fetcher.data.action === 'add-revenue') {
          alert('Receita registrada com sucesso!');
          formRef.current?.reset();
          setSelectedCategoriaId('');
        } else {
          // Gerenciamento de categorias: limpa edição no modal
          setEditCatId(null);
        }
      } else {
        alert(`Erro: ${fetcher.data.error}`);
      }
    }
  }, [fetcher.state, fetcher.data]);

  // Encontra a categoria ativa selecionada
  const activeCategoria = categorias.find(c => c.id === selectedCategoriaId);
  const isSeguradoraType = activeCategoria?.isSystem && activeCategoria.nome.toLowerCase() === 'fatura de seguradora';

  return (
    <div className="min-vh-100 bg-dark text-white py-5 px-3 d-flex flex-column align-items-center"
         style={{ background: 'linear-gradient(160deg, hsl(220 20% 5%) 0%, hsl(230 22% 11%) 50%, hsl(260 18% 9%) 100%)' }}>
      
      <div 
        className="w-100 rounded-4 p-4 p-md-5 border border-secondary shadow-lg bg-black bg-opacity-50 mb-4" 
        style={{ maxWidth: '600px', backdropFilter: 'blur(10px)' }}
      >
        <div className="d-flex align-items-center justify-content-between mb-4">
          <Link to="/" className="btn btn-outline-light btn-sm rounded-pill px-3">
            <i className="bi bi-arrow-left me-1"></i> Voltar
          </Link>
          <h2 className="h4 fw-bold m-0 gf-text-gradient">
            GuinchoFácil
          </h2>
        </div>

        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1 className="h3 fw-bold m-0 text-white">Lançar Receita</h1>
          <button 
            type="button" 
            onClick={() => setShowModal(true)} 
            className="btn btn-outline-info btn-sm rounded-pill px-3"
          >
            <i className="bi bi-gear me-1"></i> Gerenciar Tipos
          </button>
        </div>

        <fetcher.Form ref={formRef} method="post" className="needs-validation">
          <input type="hidden" name="intent" value="add-revenue" />

          {/* Categoria de Receita */}
          <div className="mb-3">
            <label className="form-label fw-semibold text-light">Tipo / Categoria de Receita</label>
            <select
              name="categoriaReceitaId"
              className="form-select form-select-lg bg-dark text-white border-secondary text-base"
              required
              value={selectedCategoriaId}
              onChange={(e) => setSelectedCategoriaId(e.target.value)}
            >
              <option value="">Selecione um tipo...</option>
              {categorias
                // Não exibe o Serviço de Guincho padrão de OS na tela de receitas manuais
                .filter(cat => !(cat.isSystem && cat.nome.toLowerCase() === 'serviço de guincho'))
                .map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.nome}</option>
                ))
              }
            </select>
          </div>

          {/* Seguradora (Dinâmico) */}
          {isSeguradoraType && (
            <div className="mb-3">
              <label className="form-label fw-semibold text-light">Seguradora Emissora</label>
              <select
                name="seguradoraId"
                className="form-select form-select-lg bg-dark text-white border-secondary text-base"
                required={isSeguradoraType}
              >
                <option value="">Selecione a seguradora...</option>
                {seguradoras.map(seg => (
                  <option key={seg.id} value={seg.id}>{seg.nome}</option>
                ))}
              </select>
            </div>
          )}

          {/* Quem Recebeu */}
          <div className="mb-3">
            <label className="form-label fw-semibold text-light">Quem Recebeu o Valor</label>
            <select
              name="quemRecebeu"
              className="form-select form-select-lg bg-dark text-white border-secondary text-base"
              required
            >
              <option value="">Selecione o responsável...</option>
              {funcionarios.map(func => (
                <option key={func.uid} value={func.displayName}>{func.displayName}</option>
              ))}
            </select>
          </div>

          {/* Data do Recebimento */}
          <div className="mb-3">
            <label className="form-label fw-semibold text-light">Data do Recebimento</label>
            <input 
              type="date" 
              name="dataRecebimento" 
              className="form-control form-control-lg bg-dark text-white border-secondary text-base" 
              required 
              defaultValue={todayStr}
            />
          </div>

          {/* Valor */}
          <div className="mb-4">
            <label className="form-label fw-semibold text-light">Valor Recebido (R$)</label>
            <input 
              type="number" 
              name="valor" 
              step="0.01" 
              min="0.01" 
              placeholder="0,00" 
              className="form-control form-control-lg bg-dark text-white border-secondary text-base" 
              required 
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-success btn-lg w-100 rounded-pill fw-bold py-3 mt-2 shadow-sm transition-all"
            disabled={fetcher.state !== 'idle'}
          >
            {fetcher.state !== 'idle' ? 'Gravando Lançamento...' : 'Confirmar Lançamento'}
          </button>
        </fetcher.Form>
      </div>

      {/* MODAL DE GERENCIAMENTO DE TIPOS DE RECEITA */}
      {showModal && (
        <div 
          className="modal fade show d-block" 
          tabIndex={-1} 
          style={{ background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(5px)' }}
        >
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable" style={{ maxWidth: '520px' }}>
            <div className="modal-content bg-dark text-white border border-secondary rounded-4 shadow-lg overflow-hidden d-flex flex-column" style={{ maxHeight: '90vh' }}>
              
              <div className="modal-header border-bottom border-secondary p-4">
                <h5 className="modal-title fw-bold text-white">Tipos de Receita</h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => { setShowModal(false); setEditCatId(null); }}
                ></button>
              </div>

              <div className="p-4 overflow-y-auto" style={{ flex: 1 }}>
                
                {/* Form de Cadastro/Edição */}
                <fetcher.Form key={editCatId || 'new-cat'} method="post" className="mb-4 bg-black bg-opacity-50 p-4 rounded-4 border border-secondary">
                  <input type="hidden" name="intent" value="save-category" />
                  {editCatId && <input type="hidden" name="id" value={editCatId} />}
                  
                  <h6 className="text-white mb-3 fw-bold">
                    {editCatId ? 'Editar Tipo de Receita' : 'Novo Tipo de Receita'}
                  </h6>
                  
                  <div className="row g-3 mb-3">
                    <div className="col-12 col-md-8">
                      <label className="form-label small text-secondary">Nome</label>
                      <input 
                        type="text" 
                        name="nome" 
                        required 
                        className="form-control bg-dark text-white border-secondary" 
                        defaultValue={editCatId ? categorias.find(c => c.id === editCatId)?.nome : ''} 
                        disabled={categorias.find(c => c.id === editCatId)?.isSystem}
                      />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label small text-secondary">Cor</label>
                      <input 
                        type="color" 
                        name="cor" 
                        required 
                        className="form-control form-control-color bg-dark border-secondary p-1 w-100" 
                        defaultValue={editCatId ? categorias.find(c => c.id === editCatId)?.cor : '#16a34a'} 
                      />
                    </div>
                  </div>

                  {categorias.find(c => c.id === editCatId)?.isSystem && (
                    <div className="alert alert-info py-2 small mb-3">
                      <i className="bi bi-info-circle me-1"></i> Esta é uma categoria nativa do sistema. Você só pode alterar sua cor.
                    </div>
                  )}

                  <div className="d-flex justify-content-end gap-2">
                    {editCatId && (
                      <button 
                        type="button" 
                        onClick={() => setEditCatId(null)} 
                        className="btn btn-outline-secondary btn-sm"
                      >Cancelar</button>
                    )}
                    <button 
                      type="submit" 
                      className="btn btn-primary btn-sm px-4 fw-bold" 
                      disabled={fetcher.state !== 'idle'}
                    >
                      {fetcher.state !== 'idle' ? '...' : 'Salvar Tipo'}
                    </button>
                  </div>
                </fetcher.Form>

                {/* Listagem das categorias */}
                <div className="list-group rounded-4 border border-secondary overflow-hidden shadow-sm">
                  {categorias
                    // Permite editar/deletar qualquer uma exceto Serviço de Guincho (que fica oculto no CRUD)
                    .filter(cat => !(cat.isSystem && cat.nome.toLowerCase() === 'serviço de guincho'))
                    .map(cat => (
                      <div key={cat.id} className="list-group-item bg-dark border-secondary text-white d-flex justify-content-between align-items-center py-3">
                        <div className="d-flex align-items-center gap-2">
                          <div className="rounded-circle" style={{ width: '12px', height: '12px', background: cat.cor }}></div>
                          <span className="fw-bold">{cat.nome}</span>
                        </div>
                        <div className="d-flex gap-2">
                          <button 
                            type="button"
                            onClick={() => setEditCatId(cat.id || null)} 
                            className="btn btn-sm btn-dark border-secondary text-info"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          
                          {!cat.isSystem ? (
                            <fetcher.Form method="post" onSubmit={(e) => { if(!confirm('Excluir este tipo de receita?')) e.preventDefault(); }}>
                              <input type="hidden" name="intent" value="delete-category" />
                              <input type="hidden" name="id" value={cat.id} />
                              <button type="submit" className="btn btn-sm btn-dark border-secondary text-danger">
                                <i className="bi bi-trash"></i>
                              </button>
                            </fetcher.Form>
                          ) : (
                            <button 
                              type="button" 
                              className="btn btn-sm btn-dark border-secondary text-secondary" 
                              title="Protegido pelo sistema" 
                              disabled
                            >
                              <i className="bi bi-lock-fill"></i>
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  }
                </div>

              </div>

              <div className="modal-footer border-top border-secondary p-3 justify-content-end">
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm px-4" 
                  onClick={() => { setShowModal(false); setEditCatId(null); }}
                >Fechar</button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
