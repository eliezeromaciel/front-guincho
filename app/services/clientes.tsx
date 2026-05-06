import { adminDb } from '~/services/firebaseAdmin';
import type { DocumentReference } from 'firebase-admin/firestore';

export const getClientes = async () => {
  try {
    const snapshot = await adminDb.collection('clientes').get();
    const result = snapshot.docs.map((elem) => ({
      id: elem.id,
      ...elem.data(),
    }));
    console.log('[getClientes] result:', result.length, 'docs');
    return result;
  } catch (error) {
    console.log('[getClientes] erro:', error);
  }
  return [];
};

type PostClienteSuccess = {
  ok: true;
  docRef: DocumentReference;
};

type PostClienteError = {
  ok: false;
  error: unknown;
};

export const postNovoCliente = async (
  name: string,
  pickupAdress?: string,
  deliveryAdress?: string,
  phone?: string,
): Promise<PostClienteSuccess | PostClienteError> => {
  try {
    const docRef = await adminDb.collection('clientes').add({
      nome: name,
      enderecoRetirada: pickupAdress,
      enderecoEntrega: deliveryAdress || '',
      telefone: phone || '',
    });
    console.log('[postNovoCliente] result:', { ok: true, docRef });
    return { ok: true, docRef };
  } catch (error) {
    console.log('[postNovoCliente] result:', { ok: false, error });
    return { ok: false, error };
  }
};

export const patchCliente = async (
  id: string,
  pickupAdress: string,
  deliveryAdress: string,
) => {
  try {
    await adminDb.collection('clientes').doc(id).update({
      enderecoRetirada: pickupAdress,
      enderecoEntrega: deliveryAdress,
    });
    console.log('[patchCliente] result:', { ok: true });
    return { ok: true };
  } catch (error) {
    console.log('[patchCliente] result:', { ok: false, error });
    return { ok: false, error };
  }
};
