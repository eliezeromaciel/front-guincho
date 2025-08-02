import api from './api'

export const getConsumidores = async ( ) => {
  // const resp = await api.get('/consumidores')
  const resp = {data: [{nome: 'mecanica Jorge'}, {nome: 'Flavinho auto'}]}  // simulei resposta da api
  console.log(resp)
  return resp
}

// export const getConsumidorById = async ({idCliente}: any ) => {
//   const resp = await api.get(`/consumidor/${idCliente}`)
//   return resp
// }