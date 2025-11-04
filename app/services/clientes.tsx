import { db } from '~/services/firebase'
import { collection, getDocs, addDoc, deleteDoc, doc, QuerySnapshot } from "firebase/firestore"; 



export const getClientes = async () => {
  try {
    const snapshot: QuerySnapshot =  await getDocs(collection(db, "clientes"));
    return (snapshot.docs.map( (elem) => ({
      id: elem.id,
      ...elem.data()
    })))
  } catch (error) {
    console.log(`${error} =====>>>> ERRO AO BUSCAR CLIENTES`)
  }
  return []
}

export const postCliente = async (name: string, pickupAdress?: string, phone?: string,) => {
    try {
      const docRef = await
        addDoc(collection(db, "clientes"), {
          nome: name,
          enderecoRetirada: pickupAdress,
          telefone: phone || ''  // opcao criacao para casos em que usuário nao quer cadastrar telefone, como no cadastro de serviço que acaba por cadastrar novo cliente apenas com nome e endereço. 
        });
      alert('Cliente cadastrado com sucesso')
      console.log(docRef)

    } catch (error) {
      alert (`Erro ao cadastrar novo cliente`)
      console.log(error)
    }
  }
