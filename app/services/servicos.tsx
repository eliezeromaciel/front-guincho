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
    console.log('[getServicos] result:', result.length, 'docs');
    return result;
  } catch (error) {
    console.log('[getServicos] erro:', error);
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
    console.log('[postNovoServico] result:', { ok: true, docRef });
    return { ok: true, docRef };
  } catch (error) {
    console.log('[postNovoServico] result:', { ok: false, error });
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
  } catch (error) {
    console.log('[getServicoAtivoMotorista] erro:', error);
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
      .get();
    
    const result = snapshot.docs.map((doc) => doc.data().base64 as string);
    return result;
  } catch (error) {
    console.log('[getFotosServico] erro:', error);
    return [];
  }
};

export const uploadFotoServico = async (servicoId: string, base64: string) => {
  try {
    const subcollRef = adminDb.collection('servicos').doc(servicoId).collection('fotos');
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

    console.log('[uploadFotoServico] adicionada foto para:', servicoId, 'total:', totalFotos);
    return { ok: true, totalFotos };
  } catch (error) {
    console.log('[uploadFotoServico] erro:', error);
    return { ok: false, error };
  }
};

export const finalizarServico = async (servicoId: string) => {
  try {
    await adminDb.collection('servicos').doc(servicoId).update({
      status: 'concluido',
      finalizedAt: FieldValue.serverTimestamp(),
    });
    console.log('[finalizarServico] servico finalizado:', servicoId);
    return { ok: true };
  } catch (error) {
    console.log('[finalizarServico] erro:', error);
    return { ok: false, error };
  }
};

