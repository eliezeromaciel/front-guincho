import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockGet, mockAdd, mockUpdate, mockDelete, mockDoc } from '../../test/mocks/firebaseAdmin';
import { loader, action } from './nova-receita';

describe('Rota /nova-receita (nova-receita.tsx)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loader deve retornar funcionarios, seguradoras e categorias de receita', async () => {
    // 1. Mock funcionarios
    mockGet.mockResolvedValueOnce({
      docs: [
        { id: 'u1', data: () => ({ nome: 'Daniel', role: 'admin' }) }
      ]
    });
    // 2. Mock seguradoras
    mockGet.mockResolvedValueOnce({
      docs: [
        { id: 's1', data: () => ({ nome: 'Porto Seguro', ativa: true }) }
      ]
    });
    // 3. Mock categorias_receita
    mockGet.mockResolvedValueOnce({
      docs: [
        { id: 'c1', data: () => ({ nome: 'Venda de Sucata', cor: '#ffffff', isSystem: false }) }
      ]
    });

    const response = await loader({
      request: new Request('http://localhost/nova-receita'),
      params: {},
    } as any);

    expect(response.funcionarios).toHaveLength(1);
    expect(response.funcionarios[0].displayName).toBe('Daniel');
    expect(response.seguradoras).toHaveLength(1);
    expect(response.seguradoras[0].nome).toBe('Porto Seguro');
    expect(response.categorias).toHaveLength(1);
    expect(response.categorias[0].nome).toBe('Venda de Sucata');
  });

  it('action com save-category deve criar nova categoria', async () => {
    mockGet.mockResolvedValueOnce({ docs: [] }); // Sem duplicados
    mockAdd.mockResolvedValueOnce({ id: 'cat-nova' });

    const formData = new FormData();
    formData.append('intent', 'save-category');
    formData.append('nome', 'Troca de Pneus');
    formData.append('cor', '#00ff00');

    const response = await action({
      request: new Request('http://localhost/nova-receita', {
        method: 'POST',
        body: formData,
      }),
      params: {},
    } as any);

    expect(response.ok).toBe(true);
    expect(response.action).toBe('save-category');
    expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({
      nome: 'Troca de Pneus',
      cor: '#00ff00',
      isSystem: false,
    }));
  });

  it('action com add-revenue deve cadastrar uma nova receita', async () => {
    // Mock getCategoriasReceita em postNovaReceita
    mockGet.mockResolvedValueOnce({
      docs: [
        { id: 'cat-sucata', data: () => ({ nome: 'Venda de Sucata', cor: '#fff', isSystem: false }) }
      ]
    });
    mockAdd.mockResolvedValueOnce({ id: 'rec-nova' });

    const formData = new FormData();
    formData.append('intent', 'add-revenue');
    formData.append('dataRecebimento', '2026-07-14');
    formData.append('categoriaReceitaId', 'cat-sucata');
    formData.append('valor', '350.50');
    formData.append('quemRecebeu', 'Daniel');

    const response = await action({
      request: new Request('http://localhost/nova-receita', {
        method: 'POST',
        body: formData,
      }),
      params: {},
    } as any);

    expect(response.ok).toBe(true);
    expect(response.action).toBe('add-revenue');
    expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({
      dataRecebimento: '2026-07-14',
      categoriaReceitaId: 'cat-sucata',
      categoriaReceitaNome: 'Venda de Sucata',
      valor: 350.50,
      quemRecebeu: 'Daniel',
    }));
  });
});
