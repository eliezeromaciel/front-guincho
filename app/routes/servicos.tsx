import { useState, useEffect } from "react";

import {getConsumidores} from '../services/consumidores'

export default function Servicos () {
  
  const [clientes, setClientes] = useState <object []> ([])  
  const [clientesFiltrados, setClientesFiltrados] = useState <object []> ([])
  const [inputNomeCliente, setInputNomeCliente] = useState ('')

  const [quemRecebe, setQuemRecebe] = useState <string > ('') 
  const [listaQuemRecebe, setListaQuemRecebe] = useState < string[] > ([])

  const handleChangeInputNome =  (e: any) => { 
    const valor: string = e.target.value // aqui eu consigo pegar o valor que o usuário digitou, não como VALUE do input, mas VALUE DO EVENTO ONCHANGE.
    const valorLowerCase: string = valor.toLowerCase()
    setInputNomeCliente(valor)    // então, dou este valor do onchange para o state 
    const filtraClientes = clientes.filter ( ( elem: any ) => elem.nome.toLowerCase().includes(valorLowerCase))
    setClientesFiltrados(filtraClientes)
  }

  const handleChooseQuemRecebe = () => {
    setListaQuemRecebe(['Daniel', 'Gabriel'])
  }

  const handleClienteSelected = (elem: any) => {
    setInputNomeCliente(elem)
    setClientesFiltrados([])
  }

  const handleQuemRecebeSelected = (elem: any) => {
    setQuemRecebe(elem)
    setListaQuemRecebe([])
  }
  
  const loadClientes = async () => {
    const consumidores = await getConsumidores() // consumidores recebe .data {array de objetos}
    setClientes(consumidores.data)
  }

  useEffect ( ()=> {
    if (clientes.length === 0)
      loadClientes()
    console.log('executou useeffect ')
  }, [clientes])


    return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="border border-secondary  p-4 rounded">
            <h3 className="d-flex justify-content-center text-secondary mb-3 ">Novo Serviço</h3>

            <form className="needs-validation" noValidate>

              {/* cliente */}
              <div className="mb-3">
                <input 
                  className="form-control" 
                  type="text"
                  name="cliente" 
                  placeholder="Cliente"
                  maxLength={30}
                  required 
                  value={inputNomeCliente}
                  onChange={handleChangeInputNome}
                  onBlur={() => setTimeout(() => setClientesFiltrados([]), 200)} // delay com settimeout, sem ele, ao clicar no nome , antes de dar certo ele zera os clientesfiltrados (funcao acima )
                />
                <ul className='list-group position-absolute shadow'
                  style={{ zIndex: 1000 }}    
                >
                  { clientesFiltrados.length>0 ?  (clientesFiltrados.map( (elem: any , index) => {
                    return (
                      <li 
                        key={index}
                        className='list-group-item list-group-item-action'
                        style={{ cursor: 'pointer' }}
                        onClick={ () => { 
                          handleClienteSelected(elem.nome)
                        }}
                      >
                        {elem.nome}
                      </li>
                      
                    )
                  })) : null}
                </ul>
              </div>

              {/* veículo */}
              <div className="mb-3">
                <input 
                  className="form-control" 
                  type="text"
                  name="veiculo" 
                  placeholder="veículo"
                  maxLength={30}
                  required 
                />
              </div> 
               
              {/* valor cobrado */}
              <div className="mb-3">
                <input 
                  className="form-control" 
                  type="text"
                  name="valorCobrado" 
                  placeholder="Valor cobrado"
                  maxLength={4}
                  required 
                />
              </div>       


              {/* quem receberá valor */}
              <div className="mb-3">
                <input 
                  className="form-control" 
                  type="text"
                  name="quemRecebe" 
                  placeholder="Quem Receberá"
                  maxLength={30}
                  list="browsers"
                  required 
                  defaultValue={quemRecebe} // era value, mas troquei por defaultValue por indicacao do browser. servicos.tsx:118 You provided a `value` prop to a form field without an `onChange` handler. This will render a read-only field. If the field should be mutable use `defaultValue`. Otherwise, set either `onChange` or `readOnly`.
                  onClick={handleChooseQuemRecebe}
                  // onChange={handleChangeInputNome}
                  onBlur={() => setTimeout(() => setListaQuemRecebe([]), 200)} 
                />
                <datalist id="browsers">
                    <option value="Daniel" />
                    <option value="Gabriel" />
                </datalist>

                <ul className='list-group position-absolute shadow'
                  style={{ zIndex: 1000 }}    
                >
                  { listaQuemRecebe.length>0 ?  (listaQuemRecebe.map( (elem: any , index) => {
                    return (
                      <li 
                        key={index}
                        className='list-group-item list-group-item-action'
                        style={{ cursor: 'pointer' }}
                        onClick={ () => { 
                          handleQuemRecebeSelected(elem)
                        }}
                      >
                        {elem}
                      </li>
                    )
                  })) : null}
                </ul>


              </div>

              {/* endereço para retirada */}
              <div className="mb-3">
                <input 
                  className="form-control" 
                  type="text"
                  name="enderecoRetirada" 
                  placeholder="Endereço para retirada"
                  maxLength={300}
                  required 
                />
              </div>   

              {/* endereço de entrega */}
              <div className="mb-3">
                <input 
                  className="form-control" 
                  type="text"
                  name="enderecoEntrega" 
                  placeholder="Endereço de entrega"
                  maxLength={300}
                  required 
                />
              </div>     

              
              <div className="d-grid">
                <button type="submit" className="btn btn-primary">
                  Criar
                </button>
              </div>
              
            </form>

          </div>
        </div>
      </div>
    </div>
    )
}