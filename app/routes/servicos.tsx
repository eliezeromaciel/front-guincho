import { useState, useEffect } from "react";

import { getClientes } from '../services/clientes'

export default function Servicos() {

  const [clientes, setClientes] = useState<object[]>([])
  const [clientesFiltrados, setClientesFiltrados] = useState<object[]>([])
  const [inputNomeCliente, setInputNomeCliente] = useState('')
  const [quemRecebe, setQuemRecebe] = useState<string>('')
  const [listaQuemRecebe, setListaQuemRecebe] = useState<string[]>([])
  const [placa, setPlaca] = useState <string> ('')


  const handleChangeInputNome = (e: any) => {
    const valor: string = e.target.value // aqui eu consigo pegar o valor que o usuário digitou, não como VALUE do input, mas VALUE DO EVENTO ONCHANGE.
    const valorLowerCase: string = valor.toLowerCase()
    console.log(valorLowerCase)
    setInputNomeCliente(valor)    // então, dou este valor do onchange para o state 
    const filtraClientes = clientes.filter((elem: any) => elem.nome.toLowerCase().includes(valorLowerCase))
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
    const consumidores = await getClientes() // consumidores recebe .data {array de objetos}
    setClientes(consumidores)
  }

  useEffect(() => {
    if (clientes.length === 0)
      loadClientes()
  }, [clientes])

  const cadastraServico = () => {


  }

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="border border-secondary  p-4 rounded">
            <h3 className="d-flex justify-content-center text-secondary mb-3 ">Novo Serviço</h3>

            <form className="needs-validation"
              onSubmit={(e) => {
                e.preventDefault()
                cadastraServico()
              }}
            >

              {/* cliente label */}
              <div className="mb-3">
                <h6>Nome Completo:</h6>
              </div>

              {/* cliente */}
              <div className="mb-3">
                <input
                  className="form-control"
                  type="text"
                  name="cliente"
                  placeholder="ex: Érico Veríssimo"
                  maxLength={30}
                  required
                  value={inputNomeCliente}
                  onChange={handleChangeInputNome}
                  onBlur={() => setTimeout(() => setClientesFiltrados([]), 200)} // delay com settimeout, sem ele, ao clicar no nome , antes de dar certo ele zera os clientesfiltrados (funcao acima )
                />
                <ul className='list-group position-absolute shadow'
                  style={{ zIndex: 1000 }}
                >
                  {clientesFiltrados.length > 0 ? (clientesFiltrados.map((elem: any, index) => {
                    return (
                      <li
                        key={index}
                        className='list-group-item list-group-item-action'
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          handleClienteSelected(elem.nome)
                        }}
                      >
                        {elem.nome}
                      </li>

                    )
                  })) : null}
                </ul>
              </div>

              {/* placa veículo label */}
              <div className="mb-3">
                <h6>Placa do veículo:</h6>
              </div>

              {/* placa veículo */}
              <div className="mb-3">
                <input
                  className="form-control"
                  type="text"
                  name="veiculo"
                  placeholder="ex: ABC-8K25"
                  maxLength={7}
                  value={placa}
                  required
                />
              </div>

              {/* valor cobrado label */}
              <div className="mb-3">
                <h6>Valor Cobrado:</h6>
              </div>

              {/* valor cobrado */}
              <div className="mb-3">
                <input
                  className="form-control"
                  type="text"
                  name="valorCobrado"
                  placeholder="ex: 200,00"
                  maxLength={4}
                  required
                />
              </div>

              {/* recebedor label */}
              <div className="mb-3">
                <h6>Quem receberá valor:</h6>
              </div>

              {/* recebedor valor */}
              <div className="mb-3">
                <input
                  className="form-control"
                  type="text"
                  name="quemRecebe"
                  placeholder="clique para escolher"
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
                  {listaQuemRecebe.length > 0 ? (listaQuemRecebe.map((elem: any, index) => {
                    return (
                      <li
                        key={index}
                        className='list-group-item list-group-item-action'
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          handleQuemRecebeSelected(elem)
                        }}
                      >
                        {elem}
                      </li>
                    )
                  })) : null}
                </ul>
              </div>

              {/* endereço retirada label */}
              <div className="mb-3">
                <h6>Endereço para Retirada:</h6>
              </div>

              {/* endereço para retirada */}
              <div className="mb-3">
                <input
                  className="form-control"
                  type="text"
                  name="enderecoRetirada"
                  placeholder="ex: Rua Camaleão, 345, bairro Jardim, Porto Alegre"
                  maxLength={300}
                  required
                />
              </div>

              {/* endereço de entrega label */}
              <div className="mb-3">
                <h6>Endereço de Entrega:</h6>
              </div>

              {/* endereço de entrega */}
              <div className="mb-3">
                <input
                  className="form-control"
                  type="text"
                  name="enderecoEntrega"
                  placeholder="ex: Av. Indústrias, 79, centro, São Leopoldo"
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