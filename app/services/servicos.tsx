import { db } from '~/services/firebase'
import { collection, getDocs, addDoc, deleteDoc, doc, QuerySnapshot } from "firebase/firestore"; 



export const getServicos = async () => {
  try {
    const snapshot: QuerySnapshot =  await getDocs(collection(db, "servicos"));
    return (snapshot.docs.map( (elem) => ({
      id: elem.id,
      ...elem.data()
    })))
  } catch (error) {
    console.log(`${error} =====>>>> ERRO AO BUSCAR SERVIÇOS`)
  }
  return []
}

export const postServico = async (name: string, plate: string, model: string, amountCharged: number, receiver:string, pickUpAdress: string, deliveryAdress: string) => {
    try {
      const docRef = await
        addDoc(collection(db, "servicos"), {
          clienteId: name,
          
        });
        // addDOC também em cliente 
      alert('Serviço cadastrado com sucesso')
      console.log(docRef)

    } catch (error) {
      alert (`Erro ao cadastrar novo serviço`)
      console.log(error)
    }
  }
