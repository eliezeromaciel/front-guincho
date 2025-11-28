import { db } from '~/services/firebase'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, QuerySnapshot, DocumentReference } from "firebase/firestore"; 



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


type PostClienteSuccess = {
  ok: true;
  docRef: DocumentReference;
};

type PostClienteError = {
  ok: false;
  error: any;
};

export const postNovoCliente = async ( name: string, pickupAdress?: string,  deliveryAdress?: string, phone?: string ): Promise<PostClienteSuccess | PostClienteError> => {
  try {
    const docRef = await addDoc(collection(db, "clientes"), {
      nome: name,
      enderecoRetirada: pickupAdress,
      enderecoEntrega: deliveryAdress|| '',
      telefone: phone || ''  // opcao criacao para casos em que usuário nao quer cadastrar telefone, como no cadastro de serviço que acaba por cadastrar novo cliente apenas com nome e endereço. 
    });

    return { ok: true, docRef };
  } catch (error) {
    return { ok: false, error };
  }
};

// // CRIA NOVO CLIENTE
// export const postNovoCliente = async (name: string, pickupAdress?: string, deliveryAdress?:string, phone?: string,) => {
//     try {
//       const docRef = await
//         addDoc(collection(db, "clientes"), {
//           nome: name,
//           enderecoRetirada: pickupAdress,
//           enderecoEntrega: deliveryAdress || '',
//           telefone: phone || ''  // opcao criacao para casos em que usuário nao quer cadastrar telefone, como no cadastro de serviço que acaba por cadastrar novo cliente apenas com nome e endereço. 
//         });
//       alert('Cliente cadastrado com sucesso')
//       return docRef
//     } catch (error) {
//       alert (`Erro ao cadastrar novo cliente`)
//       console.log(error)
//     }
//   }

  // MODIFICA ENDEREÇOS DE RETIRADA E ENTREGA
export const patchCliente = async (id: string, pickupAdress: string, deliveryAdress: string,) => {
  try {
    const clienteRef = doc(db, 'clientes', id)

    const docRef = await updateDoc(clienteRef, {
      enderecoRetirada: pickupAdress,
      enderecoEntrega: deliveryAdress
    });
    return { ok: true, docRef };
  } catch (error) {
    return { ok: false, error };
  }
}