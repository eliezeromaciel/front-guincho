import { adminDb } from '~/services/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export interface Servico {
  id?: string;
  clienteId: string;
  veiculoId: string;
  placaVeiculo: string;
  valorCobrado: number;
  receiver: string; // quem recebe o valor (nome)
  quemRecebeUid?: string;
  pickUpAdress: string;
  deliveryAdress: string;
  motoristaUid: string;
  motoristaNome: string;
  detalhesVeiculo: string; // e.g. "corsa azul", "moto hornet preta"
  status: 'pendente' | 'em_andamento' | 'concluido';
  fotosEnviadas: boolean;
  createdAt: any;
  finalizedAt?: any;
}

export const getServicos = async (): Promise<Servico[]> => {
  try {
    const snapshot = await adminDb.collection('servicos').orderBy('createdAt', 'desc').get();
    const result = snapshot.docs.map((elem) => ({
      id: elem.id,
      ...elem.data(),
    })) as Servico[];
    if (process.env.NODE_ENV === 'development') console.log('[getServicos] result:', result.length, 'docs');
    return result;
  } catch (error: any) {
    console.error('[getServicos] erro:', error?.code ?? 'unknown');
  }
  return [];
};

export const postNovoServico = async (
  idClient: string,
  idVeiculo: string,
  placaVeiculo: string,
  amountCharged: number,
  receiver: string,
  quemRecebeUid: string,
  pickUpAdress: string,
  deliveryAdress: string,
  motoristaUid: string,
  motoristaNome: string,
  detalhesVeiculo: string,
) => {
  try {
    const docRef = await adminDb.collection('servicos').add({
      clienteId: idClient,
      veiculoId: idVeiculo,
      placaVeiculo,
      valorCobrado: amountCharged,
      receiver,
      quemRecebeUid,
      pickUpAdress,
      deliveryAdress,
      motoristaUid,
      motoristaNome,
      detalhesVeiculo,
      status: 'pendente',
      fotosEnviadas: false,
      createdAt: FieldValue.serverTimestamp(),
    });
    if (process.env.NODE_ENV === 'development') console.log('[postNovoServico] result: ok');
    return { ok: true, docRef };
  } catch (error: any) {
    console.error('[postNovoServico] erro:', error?.code ?? 'unknown');
    return { ok: false, error };
  }
};

export const getServicoAtivoMotorista = async (motoristaUid: string): Promise<Servico | null> => {
  try {
    const snapshot = await adminDb
      .collection('servicos')
      .where('motoristaUid', '==', motoristaUid)
      .where('status', 'in', ['pendente', 'em_andamento'])
      .limit(1)
      .get();
    
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Servico;
  } catch (error: any) {
    console.error('[getServicoAtivoMotorista] erro:', error?.code ?? 'unknown');
    return null;
  }
};

export const getFotosServico = async (servicoId: string): Promise<string[]> => {
  try {
    const snapshot = await adminDb
      .collection('servicos')
      .doc(servicoId)
      .collection('fotos')
      .orderBy('uploadedAt', 'asc')
      .limit(4)
      .get();
    
    const result = snapshot.docs.map((doc) => doc.data().base64 as string);
    return result;
  } catch (error: any) {
    console.error('[getFotosServico] erro:', error?.code ?? 'unknown');
    return [];
  }
};

export const uploadFotoServico = async (servicoId: string, base64: string) => {
  try {
    const subcollRef = adminDb.collection('servicos').doc(servicoId).collection('fotos');
    const existing = await subcollRef.count().get();
    if (existing.data().count >= 4) {
      return { ok: false as const, error: 'Limite de 4 fotos já atingido.' };
    }
    await subcollRef.add({
      base64,
      uploadedAt: FieldValue.serverTimestamp(),
    });

    // Conta fotos
    const snapshot = await subcollRef.get();
    const totalFotos = snapshot.size;

    if (totalFotos >= 4) {
      await adminDb.collection('servicos').doc(servicoId).update({
        fotosEnviadas: true,
      });
    }

    if (process.env.NODE_ENV === 'development') console.log('[uploadFotoServico] total:', totalFotos);
    return { ok: true, totalFotos };
  } catch (error: any) {
    console.error('[uploadFotoServico] erro:', error?.code ?? 'unknown');
    return { ok: false, error };
  }
};

export const finalizarServico = async (servicoId: string) => {
  try {
    await adminDb.collection('servicos').doc(servicoId).update({
      status: 'concluido',
      finalizedAt: FieldValue.serverTimestamp(),
    });
    if (process.env.NODE_ENV === 'development') console.log('[finalizarServico] ok');
    return { ok: true };
  } catch (error: any) {
    console.error('[finalizarServico] erro:', error?.code ?? 'unknown');
    return { ok: false, error };
  }
};

