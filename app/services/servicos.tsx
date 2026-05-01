import { db } from '~/services/firebase'
import { collection, getDocs, addDoc, doc, QuerySnapshot, serverTimestamp } from "firebase/firestore";

export const getServicos = async () => {
  try {
    const snapshot: QuerySnapshot = await getDocs(collection(db, "servicos"));
    return (snapshot.docs.map((elem) => ({
      id: elem.id,
      ...elem.data()
    })))
  } catch (error) {
    console.log('[getServicos] erro:', error);
  }
  return []
}

export const postNovoServico = async (
  idClient: string,
  idVeiculo: string,
  amountCharged: string,
  receiver: string,
  pickUpAdress: string,
  deliveryAdress: string
) => {
  try {
    const docRef = await addDoc(collection(db, "servicos"), {
      clienteId: idClient,
      veiculoId: idVeiculo,
      valorCobrado: amountCharged,
      receiver,
      pickUpAdress,
      deliveryAdress,
      createdAt: serverTimestamp(),
    });
    console.log('[postNovoServico] result:', { ok: true, docRef });
    return { ok: true, docRef };
  } catch (error) {
    console.log('[postNovoServico] result:', { ok: false, error });
    return { ok: false, error };
  }
}
