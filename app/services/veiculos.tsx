import { db } from '~/services/firebase'
import { collection, getDocs, addDoc, deleteDoc, doc, QuerySnapshot } from "firebase/firestore"; 



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

export const postNovoVeiculo = async (plate: string, model: string) => {
    try {
      await
        addDoc(collection(db, "veiculos"), {
          placa: plate,
          modelo: model,
        });
      alert('veículo cadastrado com sucesso')
    } catch (error) {
      console.log(error)
    }
  }