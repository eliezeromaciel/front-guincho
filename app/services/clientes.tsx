import { db } from '~/services/firebase'
import { collection, getDocs, addDoc, deleteDoc, doc, QuerySnapshot } from "firebase/firestore"; 



export const getClientes = async () => {
  try {
    const snapshot: QuerySnapshot =  await getDocs(collection(db, "clientes"));
    return (snapshot.docs.map( (elem) => elem.data() ))
  } catch (error) {
    console.log(`${error} =====>>>> ERRO AO BUSCAR CLIENTES`)
  }
  return []
}

export const postCliente = async (phone: string, name: string, adress: string) => {
    try {
      const docRef = await
        addDoc(collection(db, "clientes"), {
          telefone: phone,
          nome: name,
          endereço: adress
        });
      alert('Cliente cadastrado com sucesso')
      console.log(docRef)

    } catch (error) {
      console.log(error)
    }
  }
