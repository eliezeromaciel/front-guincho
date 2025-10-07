import { db } from '~/services/firebase'
import { collection, getDocs, addDoc, deleteDoc, doc, QuerySnapshot } from "firebase/firestore"; 

export const postVeiculo = async (plate: string, model: string, color: string) => {
    try {
      await
        addDoc(collection(db, "veiculos"), {
          placa: plate,
          modelo: model,
          cor: color
        });
      alert('veículo cadastrado com sucesso')
    } catch (error) {
      console.log(error)
    }
  }

export const getVeiculos =  async () => {
 try {
     const snapshot: QuerySnapshot =  await getDocs(collection(db, "veiculos"));
     return (snapshot.docs.map( (elem) => elem.data() ))
   } catch (error) {
     console.log(`${error} =====>>>> ERRO AO BUSCAR veiculos`)
     return []
    }
}

