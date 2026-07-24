import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  mockGet, 
  mockAdd, 
  mockUpdate, 
  mockDelete, 
  mockDoc 
} from '../../test/mocks/firebaseAdmin';
import { 
  getCategoriasReceita, 
  postCategoriaReceita, 
  updateCategoriaReceita, 
  deleteCategoriaReceita,
  semearCategoriasPadrao 
} from './categoriasReceita.server';
import { 
  getReceitas, 
  postNovaReceita, 
  deleteReceita 
} from './receitas.server';

describe('Serviços de Receitas e Categorias (Mocks Globais)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Categorias de Receita (categoriasReceita.server.ts)', () => {
    it('getCategoriasReceita deve retornar categorias ordenadas e semear padrão se vazio', async () => {
      // Simula banco vazio inicialmente para forçar semeadura
      mockGet.mockResolvedValueOnce({ empty: true, docs: [] }) // getCategoriasReceita - check inicial
             .mockResolvedValueOnce({ docs: [] }) // semearCategoriasPadrao - check
             .mockResolvedValueOnce({
                empty: false,
                docs: [
                  { id: 'cat-1', data: () => ({ nome: 'Serviço de Guincho', cor: '#2563eb', isSystem: true }) },
                  { id: 'cat-2', data: () => ({ nome: 'Fatura de Seguradora', cor: '#16a34a', isSystem: true }) }
                ]
             }); // getCategoriasReceita - reload pós semear

      const resultado = await getCategoriasReceita();
      expect(resultado).toHaveLength(2);
      expect(resultado[0].nome).toBe('Serviço de Guincho');
      expect(resultado[1].nome).toBe('Fatura de Seguradora');
      expect(mockAdd).toHaveBeenCalledTimes(2); // Deve ter semeado as duas do sistema
    });

    it('postCategoriaReceita deve criar categoria com sucesso se não houver duplicada', async () => {
      mockGet.mockResolvedValueOnce({
        docs: [
          { data: () => ({ nome: 'Fatura de Seguradora' }) }
        ]
      });
      mockAdd.mockResolvedValueOnce({ id: 'nova-cat-id' });

      const resultado = await postCategoriaReceita('Venda de Sucata', '#ff5733');
      expect(resultado.ok).toBe(true);
      expect(resultado.id).toBe('nova-cat-id');
      expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({
        nome: 'Venda de Sucata',
        cor: '#ff5733',
        isSystem: false
      }));
    });

    it('postCategoriaReceita deve falhar se nome for duplicado', async () => {
      mockGet.mockResolvedValueOnce({
        docs: [
          { data: () => ({ nome: 'Venda de Sucata' }) }
        ]
      });

      const resultado = await postCategoriaReceita('venda de sucata ', '#ff0000');
      expect(resultado.ok).toBe(false);
      expect(resultado.error).toContain('Já existe uma categoria');
    });

    it('updateCategoriaReceita deve permitir alterar apenas cor se for do sistema', async () => {
      mockDoc.mockReturnValueOnce({
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ nome: 'Fatura de Seguradora', cor: '#16a34a', isSystem: true })
        }),
        update: mockUpdate
      } as any);

      const resultado = await updateCategoriaReceita('cat-id', { nome: 'Nome Tentado', cor: '#ffaa00' });
      expect(resultado.ok).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith({ cor: '#ffaa00' }); // nome descartado por ser de sistema
    });

    it('deleteCategoriaReceita deve bloquear a deleção de categorias do sistema', async () => {
      mockDoc.mockReturnValueOnce({
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ nome: 'Fatura de Seguradora', isSystem: true })
        }),
        delete: mockDelete
      } as any);

      const resultado = await deleteCategoriaReceita('cat-id');
      expect(resultado.ok).toBe(false);
      expect(resultado.error).toContain('do sistema não podem ser excluídas');
      expect(mockDelete).not.toHaveBeenCalled();
    });
  });

  describe('Lançamentos de Receitas (receitas.server.ts)', () => {
    it('getReceitas deve trazer todos os lançamentos', async () => {
      mockGet.mockResolvedValueOnce({
        docs: [
          { 
            id: 'rec-1', 
            data: () => ({ 
              dataRecebimento: '2026-07-14',
              categoriaReceitaId: 'cat-1',
              categoriaReceitaNome: 'Fatura de Seguradora',
              valor: 4500,
              quemRecebeu: 'Daniel Admin',
              seguradoraId: 'seg-porto',
              seguradoraNome: 'Porto Seguro'
            }) 
          }
        ]
      });

      const resultado = await getReceitas();
      expect(resultado).toHaveLength(1);
      expect(resultado[0].valor).toBe(4500);
      expect(resultado[0].seguradoraNome).toBe('Porto Seguro');
    });

    it('postNovaReceita deve inserir no Firestore sem o campo descricao', async () => {
      mockAdd.mockResolvedValueOnce({ id: 'rec-nova-id' });

      const payload = {
        dataRecebimento: '2026-07-14',
        categoriaReceitaId: 'cat-1',
        categoriaReceitaNome: 'Fatura de Seguradora',
        valor: 1500,
        quemRecebeu: 'Gabriel'
      };

      const resultado = await postNovaReceita(payload);
      expect(resultado.ok).toBe(true);
      expect(resultado.id).toBe('rec-nova-id');
      expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({
        dataRecebimento: '2026-07-14',
        categoriaReceitaId: 'cat-1',
        categoriaReceitaNome: 'Fatura de Seguradora',
        valor: 1500,
        quemRecebeu: 'Gabriel'
      }));
      // Verifica que descrição realmente não foi incluída
      const lastCallArgs = mockAdd.mock.calls[0][0];
      expect(lastCallArgs.descricao).toBeUndefined();
    });

    it('deleteReceita deve deletar o documento', async () => {
      mockDelete.mockResolvedValueOnce(undefined);

      const resultado = await deleteReceita('rec-id');
      expect(resultado.ok).toBe(true);
      expect(mockDoc).toHaveBeenCalledWith('rec-id');
      expect(mockDelete).toHaveBeenCalled();
    });
  });
});
