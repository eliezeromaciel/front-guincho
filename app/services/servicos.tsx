import { db } from '~/services/firebase'
import { collection, getDocs, addDoc, deleteDoc, doc, QuerySnapshot } from "firebase/firestore"; 



export const getServicos = async () => {
  try {
    const snapshot: QuerySnapshot = await getDocs(collection(db, "servicos"));
    return (snapshot.docs.map((elem) => ({
      id: elem.id,
      ...elem.data()
    })))
  } catch (error) {
    console.log(`${error} =====>>>> ERRO AO BUSCAR SERVIÇOS`)
  }
  return []
}

export const postNovoServico = async (idClient: string, idVeiculo: string, amountCharged: string, receiver: string, pickUpAdress: string, deliveryAdress: string) => {
  try {
    const docRef = await
      addDoc(collection(db, "servicos"), {
        clienteId: idClient,

      });
    return { ok: true, docRef };
  } catch (error) {
    return { ok: false, error };
  }
}
