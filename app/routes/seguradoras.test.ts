import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getSeguradoras, postNovaSeguradora, updateSeguradora, deleteSeguradora } from '~/services/seguradoras.server';
import { loader, action } from './seguradoras';
import { mockGet, mockAdd, mockUpdate, mockDelete, mockDoc } from '../../test/mocks/firebaseAdmin';

describe('Gerenciamento de Seguradoras (Mocks Globais)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Serviços (seguradoras.server.ts)', () => {
    it('getSeguradoras deve buscar e ordenar seguradoras do Firestore', async () => {
      mockGet.mockResolvedValueOnce({
        docs: [
          { id: 'seg-1', data: () => ({ nome: 'Porto Seguro', ativa: true }) },
          { id: 'seg-2', data: () => ({ nome: 'Allianz', ativa: false }) },
        ],
      });

      const resultado = await getSeguradoras();
      expect(resultado).toHaveLength(2);
      expect(resultado[0]).toEqual({ id: 'seg-1', nome: 'Porto Seguro', ativa: true });
      expect(resultado[1]).toEqual({ id: 'seg-2', nome: 'Allianz', ativa: false });
    });

    it('postNovaSeguradora deve adicionar nova seguradora com status ativo', async () => {
      mockAdd.mockResolvedValueOnce({ id: 'nova-seg-id' });

      const resultado = await postNovaSeguradora('SulAmérica');
      expect(resultado.ok).toBe(true);
      expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({
        nome: 'SulAmérica',
        ativa: true,
      }));
    });

    it('updateSeguradora deve atualizar o nome no documento Firestore', async () => {
      mockUpdate.mockResolvedValueOnce(undefined);

      const resultado = await updateSeguradora('seg-1', 'Porto Seguro Editada');
      expect(resultado.ok).toBe(true);
      expect(mockDoc).toHaveBeenCalledWith('seg-1');
      expect(mockUpdate).toHaveBeenCalledWith({ nome: 'Porto Seguro Editada' });
    });

    it('deleteSeguradora deve remover o documento do Firestore', async () => {
      mockDelete.mockResolvedValueOnce(undefined);

      const resultado = await deleteSeguradora('seg-1');
      expect(resultado.ok).toBe(true);
      expect(mockDoc).toHaveBeenCalledWith('seg-1');
      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe('Rotas e Actions (seguradoras.tsx)', () => {
    it('loader deve retornar lista de seguradoras', async () => {
      mockGet.mockResolvedValueOnce({
        docs: [{ id: 'seg-1', data: () => ({ nome: 'Porto Seguro', ativa: true }) }],
      });

      const response = await loader({
        request: new Request('http://localhost/seguradoras'),
        params: {},
      });

      expect(response.seguradoras).toHaveLength(1);
      expect(response.seguradoras[0].nome).toBe('Porto Seguro');
    });

    it('action criar deve falhar se nome for muito curto', async () => {
      const formData = new FormData();
      formData.append('intent', 'criar');
      formData.append('nome', 'A'); // Minimo 2

      const response = await action({
        request: new Request('http://localhost/seguradoras', {
          method: 'POST',
          body: formData,
        }),
        params: {},
      });

      expect(response.ok).toBe(false);
      expect(response.error).toBe('Nome deve ter entre 2 e 60 caracteres.');
    });

    it('action criar deve cadastrar com sucesso', async () => {
      mockAdd.mockResolvedValueOnce({ id: 'nova-id' });
      const formData = new FormData();
      formData.append('intent', 'criar');
      formData.append('nome', 'Azul Seguros');

      const response = await action({
        request: new Request('http://localhost/seguradoras', {
          method: 'POST',
          body: formData,
        }),
        params: {},
      });

      expect(response.ok).toBe(true);
      expect(response.action).toBe('criada');
      expect(mockAdd).toHaveBeenCalled();
    });

    it('action editar deve atualizar com sucesso', async () => {
      mockUpdate.mockResolvedValueOnce(undefined);
      const formData = new FormData();
      formData.append('intent', 'edit-seguradora');
      formData.append('id', 'seg-1');
      formData.append('nome', 'Azul Seguros Editada');

      const response = await action({
        request: new Request('http://localhost/seguradoras', {
          method: 'POST',
          body: formData,
        }),
        params: {},
      });

      expect(response.ok).toBe(true);
      expect(response.action).toBe('editada');
      expect(mockUpdate).toHaveBeenCalledWith({ nome: 'Azul Seguros Editada' });
    });

    it('action deletar deve excluir com sucesso', async () => {
      mockDelete.mockResolvedValueOnce(undefined);
      const formData = new FormData();
      formData.append('intent', 'delete-seguradora');
      formData.append('id', 'seg-1');

      const response = await action({
        request: new Request('http://localhost/seguradoras', {
          method: 'POST',
          body: formData,
        }),
        params: {},
      });

      expect(response.ok).toBe(true);
      expect(response.action).toBe('deletada');
      expect(mockDelete).toHaveBeenCalled();
    });
  });
});
