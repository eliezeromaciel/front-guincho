import { adminDb } from '~/services/firebaseAdmin.server';
import { FieldValue } from 'firebase-admin/firestore';
import { getVeiculos } from '~/services/veiculos.server';
import { getFuncionarios } from '~/services/funcionarios.server';

export interface CentroCusto {
  id?: string;
  nome: string;
  tipo?: string;
  createdAt?: any;
  isHibrido?: boolean;
}

const COLLECTION = 'centros_custo';

export const getCentrosCusto = async (): Promise<CentroCusto[]> => {
  try {
    const snapshot = await adminDb.collection(COLLECTION).orderBy('nome', 'asc').get();
    const result = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        nome: data.nome,
        tipo: data.tipo,
        createdAt: data.createdAt,
      } as CentroCusto;
    });
    return result;
  } catch (error: any) {
    console.error('[getCentrosCusto] erro:', error?.code ?? error);
    return [];
  }
};

export const getCentrosCustoHibridos = async (): Promise<CentroCusto[]> => {
  const [personalizados, veiculos, funcionarios] = await Promise.all([
    getCentrosCusto(),
    getVeiculos(),
    getFuncionarios()
  ]);

  const veiculosFormatados: CentroCusto[] = veiculos.map(v => ({
    id: v.id,
    nome: v.modelo, // Apenas [Modelo]
    tipo: 'Veículo',
    isHibrido: true
  }));

  const funcionariosFormatados: CentroCusto[] = funcionarios.map(f => ({
    id: f.uid,
    nome: f.displayName,
    tipo: 'Funcionário',
    isHibrido: true
  }));

  return [...veiculosFormatados, ...funcionariosFormatados, ...personalizados].sort((a, b) => 
    a.nome.localeCompare(b.nome)
  );
};

export const postCentroCusto = async (nome: string, tipo?: string) => {
  try {
    const docRef = await adminDb.collection(COLLECTION).add({
      nome,
      tipo: tipo || '',
      createdAt: FieldValue.serverTimestamp(),
    });
    return { ok: true, docRef };
  } catch (error: any) {
    console.error('[postCentroCusto] erro:', error?.code ?? error);
    return { ok: false, error };
  }
};

export const updateCentroCusto = async (id: string, campos: Partial<CentroCusto>) => {
  try {
    await adminDb.collection(COLLECTION).doc(id).update(campos);
    return { ok: true };
  } catch (error: any) {
    console.error('[updateCentroCusto] erro:', error?.code ?? error);
    return { ok: false, error };
  }
};

export const deleteCentroCusto = async (id: string) => {
  try {
    await adminDb.collection(COLLECTION).doc(id).delete();
    return { ok: true };
  } catch (error: any) {
    console.error('[deleteCentroCusto] erro:', error?.code ?? error);
    return { ok: false, error };
  }
};
