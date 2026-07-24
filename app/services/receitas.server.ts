import { adminDb } from '~/services/firebaseAdmin.server';
import { FieldValue } from 'firebase-admin/firestore';

export interface Receita {
  id?: string;
  dataRecebimento: string; // formato 'YYYY-MM-DD'
  categoriaReceitaId: string;
  categoriaReceitaNome: string;
  valor: number;
  quemRecebeu: string; // Nome/ID do motorista ou administrador
  seguradoraId?: string;
  seguradoraNome?: string;
  createdAt?: any;
}

const COLLECTION = 'receitas';

export const getReceitas = async (): Promise<Receita[]> => {
  try {
    const snapshot = await adminDb.collection(COLLECTION).orderBy('dataRecebimento', 'desc').get();
    const result = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        dataRecebimento: data.dataRecebimento,
        categoriaReceitaId: data.categoriaReceitaId,
        categoriaReceitaNome: data.categoriaReceitaNome,
        valor: data.valor,
        quemRecebeu: data.quemRecebeu,
        seguradoraId: data.seguradoraId,
        seguradoraNome: data.seguradoraNome,
        createdAt: data.createdAt,
      } as Receita;
    });
    return result;
  } catch (error: any) {
    console.error('[getReceitas] erro:', error?.code ?? error);
    return [];
  }
};

export const postNovaReceita = async (
  receitaData: {
    dataRecebimento: string;
    categoriaReceitaId: string;
    categoriaReceitaNome: string;
    valor: number;
    quemRecebeu: string;
    seguradoraId?: string;
    seguradoraNome?: string;
  }
) => {
  try {
    const payload: any = {
      dataRecebimento: receitaData.dataRecebimento,
      categoriaReceitaId: receitaData.categoriaReceitaId,
      categoriaReceitaNome: receitaData.categoriaReceitaNome,
      valor: Number(receitaData.valor),
      quemRecebeu: receitaData.quemRecebeu,
      createdAt: FieldValue.serverTimestamp(),
    };

    if (receitaData.seguradoraId) {
      payload.seguradoraId = receitaData.seguradoraId;
    }
    if (receitaData.seguradoraNome) {
      payload.seguradoraNome = receitaData.seguradoraNome;
    }

    const docRef = await adminDb.collection(COLLECTION).add(payload);
    return { ok: true as const, id: docRef.id };
  } catch (error: any) {
    console.error('[postNovaReceita] erro:', error?.code ?? error);
    return { ok: false as const, error: error?.message || 'Erro desconhecido' };
  }
};

export const deleteReceita = async (id: string) => {
  try {
    await adminDb.collection(COLLECTION).doc(id).delete();
    return { ok: true as const };
  } catch (error: any) {
    console.error('[deleteReceita] erro:', error?.code ?? error);
    return { ok: false as const, error: error?.message || 'Erro desconhecido' };
  }
};
