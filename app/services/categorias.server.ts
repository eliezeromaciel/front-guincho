import { adminDb } from '~/services/firebaseAdmin.server';
import { FieldValue } from 'firebase-admin/firestore';

export interface CategoriaDespesa {
  id?: string;
  nome: string;
  cor?: string;
  centrosCustoIds?: string[];
  createdAt?: any;
}

const COLLECTION = 'categorias_despesa';

export const getCategorias = async (): Promise<CategoriaDespesa[]> => {
  try {
    const snapshot = await adminDb.collection(COLLECTION).orderBy('nome', 'asc').get();
    const result = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        nome: data.nome,
        cor: data.cor,
        centrosCustoIds: data.centrosCustoIds || [],
        createdAt: data.createdAt,
      } as CategoriaDespesa;
    });
    return result;
  } catch (error: any) {
    console.error('[getCategorias] erro:', error?.code ?? error);
    return [];
  }
};

export const postCategoria = async (nome: string, cor?: string, centrosCustoIds: string[] = []) => {
  try {
    const docRef = await adminDb.collection(COLLECTION).add({
      nome,
      cor: cor || '#9ca3af', // cor padrão
      centrosCustoIds,
      createdAt: FieldValue.serverTimestamp(),
    });
    return { ok: true, docRef };
  } catch (error: any) {
    console.error('[postCategoria] erro:', error?.code ?? error);
    return { ok: false, error };
  }
};

export const updateCategoria = async (id: string, campos: Partial<CategoriaDespesa>) => {
  try {
    await adminDb.collection(COLLECTION).doc(id).update(campos);
    return { ok: true };
  } catch (error: any) {
    console.error('[updateCategoria] erro:', error?.code ?? error);
    return { ok: false, error };
  }
};

export const deleteCategoria = async (id: string) => {
  try {
    await adminDb.collection(COLLECTION).doc(id).delete();
    return { ok: true };
  } catch (error: any) {
    console.error('[deleteCategoria] erro:', error?.code ?? error);
    return { ok: false, error };
  }
};
