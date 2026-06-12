import { adminDb } from '~/services/firebaseAdmin.server';
import { FieldValue } from 'firebase-admin/firestore';

export interface Servico {
  id?: string;
  clienteId: string;
  veiculoId: string;
  placaVeiculo: string;
  valorCobrado: number;
  receiver: string; // quem recebe o valor (nome) — pode ser vazio
  quemRecebeUid?: string;
  pickUpAdress: string;
  deliveryAdress: string;
  motoristaUid: string;
  motoristaNome: string;
  detalhesVeiculo: string; // e.g. "corsa azul", "moto hornet preta"
  status: 'pendente' | 'em_andamento' | 'concluido' | 'cancelado';
  fotosEnviadas: boolean;
  createdAt: any;
  finalizedAt?: any;
  // Campos de faturamento (seguradora)
  tipoRecebedor: 'motorista' | 'seguradora' | 'nenhum';
  seguradoraId?: string;
  seguradoraNome?: string;
  faturadoStatus?: 'pendente' | 'recebido'; // apenas quando tipoRecebedor === 'seguradora'
  faturadoRecebidoEm?: any;
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
  tipoRecebedor: 'motorista' | 'seguradora' | 'nenhum' = 'nenhum',
  seguradoraId?: string,
  seguradoraNome?: string,
  dataServico?: string,
) => {
  try {
    const docData: Record<string, any> = {
      clienteId: idClient,
      veiculoId: idVeiculo,
      placaVeiculo,
      valorCobrado: amountCharged,
      receiver,
      quemRecebeUid: quemRecebeUid || '',
      pickUpAdress,
      deliveryAdress,
      motoristaUid,
      motoristaNome,
      detalhesVeiculo,
      status: 'pendente',
      fotosEnviadas: false,
      tipoRecebedor,
      createdAt: dataServico ? new Date(dataServico + 'T12:00:00') : FieldValue.serverTimestamp(),
    };

    // Campos específicos de faturamento para seguradora
    if (tipoRecebedor === 'seguradora' && seguradoraId) {
      docData.seguradoraId = seguradoraId;
      docData.seguradoraNome = seguradoraNome || '';
      docData.faturadoStatus = 'pendente';
    }

    const docRef = await adminDb.collection('servicos').add(docData);
    if (process.env.NODE_ENV === 'development') console.log('[postNovoServico] result: ok, tipo:', tipoRecebedor);
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
    if (existing.data().count >= 10) {
      return { ok: false as const, error: 'Limite de 10 fotos já atingido.' };
    }
    await subcollRef.add({
      base64,
      uploadedAt: FieldValue.serverTimestamp(),
    });

    // Conta fotos
    const snapshot = await subcollRef.get();
    const totalFotos = snapshot.size;

    if (totalFotos >= 1) {
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

export const cancelarServicoMotorista = async (servicoId: string) => {
  try {
    await adminDb.collection('servicos').doc(servicoId).update({
      status: 'cancelado',
      finalizedAt: FieldValue.serverTimestamp(),
    });
    if (process.env.NODE_ENV === 'development') console.log('[cancelarServicoMotorista] ok');
    return { ok: true };
  } catch (error: any) {
    console.error('[cancelarServicoMotorista] erro:', error?.code ?? 'unknown');
    return { ok: false, error };
  }
};

export const marcarFaturadoRecebido = async (servicoId: string) => {
  try {
    await adminDb.collection('servicos').doc(servicoId).update({
      faturadoStatus: 'recebido',
      faturadoRecebidoEm: FieldValue.serverTimestamp(),
    });
    if (process.env.NODE_ENV === 'development') console.log('[marcarFaturadoRecebido] ok');
    return { ok: true as const };
  } catch (error: any) {
    console.error('[marcarFaturadoRecebido] erro:', error?.code ?? 'unknown');
    return { ok: false as const, error };
  }
};

export const updateServico = async (servicoId: string, campos: Partial<Record<string, any>>) => {
  try {
    await adminDb.collection('servicos').doc(servicoId).update(campos);
    if (process.env.NODE_ENV === 'development') console.log('[updateServico] ok', Object.keys(campos));
    return { ok: true as const };
  } catch (error: any) {
    console.error('[updateServico] erro:', error?.code ?? 'unknown');
    return { ok: false as const, error };
  }
};

export const deleteServico = async (servicoId: string) => {
  try {
    await adminDb.collection('servicos').doc(servicoId).delete();
    if (process.env.NODE_ENV === 'development') console.log('[deleteServico] ok');
    return { ok: true as const };
  } catch (error: any) {
    console.error('[deleteServico] erro:', error?.code ?? 'unknown');
    return { ok: false as const, error };
  }
};

