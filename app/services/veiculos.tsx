import { db } from '~/services/firebase'
import { collection, getDocs, addDoc, deleteDoc, doc, QuerySnapshot, DocumentReference } from "firebase/firestore"; 

type PostVeiculoSuccess = {
  ok: true;
  docRef: DocumentReference;
};

type PostVeiculoError = {
  ok: false;
  error: any;
};

export const getVeiculos =  async () => {
 try {
     const snapshot: QuerySnapshot =  await getDocs(collection(db, "veiculos"));
     return (snapshot.docs.map( (elem) => ({
      id: elem.id,     
      ...elem.data()
    })))
   } catch (error) {
     console.log(`${error} =====>>>> ERRO AO BUSCAR VEÍCULOS`)
     return []
    }
}

export const postNovoVeiculo = async (plate: string, model: string): Promise <PostVeiculoSuccess | PostVeiculoError> => {
  try {
    const docRef = await addDoc(collection(db, "veiculos"), {
      placa: plate,
      modelo: model,
    });

    return { ok: true, docRef };
  } catch (error) {
    console.log("Erro ao cadastrar novo veículo:", error);
    return { ok: false, error };
  }
};