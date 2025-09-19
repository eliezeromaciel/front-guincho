import { collection, getDocs, addDoc, deleteDoc, doc , QuerySnapshot} from "firebase/firestore";
import { db } from '~/services/firebase'


export const getClientes = async () => {
  try {
    const snapshot: QuerySnapshot =  await getDocs(collection(db, "clientes"));
    return (snapshot.docs.map( (elem) => elem.data() ))
  } catch (error) {
    console.log(`${error} =====>>>> ERRO AO BUSCAR CLIENTES`)
  }
  return []
}


