import { db } from '~/services/firebase'
import { collection, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore"; 

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

