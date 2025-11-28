import { useState, useEffect } from "react";

import { getClientes, postNovoCliente, patchCliente } from '../services/clientes'
import { getVeiculos, postNovoVeiculo } from "~/services/veiculos";
import { postNovoServico } from "~/services/servicos";


type Cliente = {
  id?: string
  nome: string
  telefone?: string
  enderecoRetirada?: string
  enderecoEntrega?: string
}

type Veiculo = {
  id?: string
  placa: string
  modelo?: string
}

export default function Servicos() {

  const [clientes, setClientes] = useState <Cliente[]>([])
  const [clientesFiltrados, setClientesFiltrados] = useState <Cliente[]>([])
  const [clienteSelecionado, setClienteSelecionado] = useState <Cliente | undefined>()
  const [quemRecebe, setQuemRecebe] = useState <string>('')
  const [listaQuemRecebe, setListaQuemRecebe] = useState <string[]>([])
  const [veiculos, setVeiculos] = useState <Veiculo[]> ([])
  const [veiculoSelecionado, setVeiculoSelecionado] = useState <Veiculo | undefined> ()
  const [veiculosFiltrados, setVeiculosFiltrados] = useState <Veiculo[]> ([])
  const [modeloVeiculo, setModeloVeiculo] = useState <string> ('')
  const [enderecoRetirada, setEnderecoRetirada] = useState <string>('')
  const [enderecoEntrega, setEnderecoEntrega] = useState <string>('')

  const handleChangeInputNome = (e: any) => {
    const valor: string = e.target.value // aqui eu consigo pegar o valor que o usuário digitou, não como VALUE do input, mas VALUE DO EVENTO ONCHANGE.
    const valorLowerCase: string = valor.toLowerCase()
    setClienteSelecionado({nome: valor})    // então, dou este valor do onchange para o state 
    const filtraClientes = clientes.filter((elem: any) => elem.nome.toLowerCase().includes(valorLowerCase))
    setClientesFiltrados(filtraClientes)
  }

  const handleChangeInputPlaca = (e: React.ChangeEvent<HTMLInputElement>) => {
    let valorPlaca: string = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")  // remove caracteres que nao sao numeros ou letras
    if (valorPlaca.length > 7) valorPlaca = valorPlaca.slice(0, 7); // limita a 7 chars

    // Valida posição por posição
    const padraoMercosul = [
      /^[A-Z]$/,       // 1ª letra
      /^[A-Z]$/,       // 2ª letra
      /^[A-Z]$/,       // 3ª letra
      /^[0-9]$/,       // 4º número
      /^[A-Z0-9]$/,    // 5º letra ou número
      /^[0-9]$/,       // 6º número
      /^[0-9]$/,       // 7º número
    ];

    let placaValidada = "";
    for (let i = 0; i < valorPlaca.length; i++) {
      if (padraoMercosul[i].test(valorPlaca[i])) {
        placaValidada += valorPlaca[i];
      } else {
        break; // se for inválido, para e não adiciona
      }  
    }
   
    setVeiculoSelecionado({placa: placaValidada})

    const filtraPlacas = veiculos.filter((elem: any) => elem.placa.includes(placaValidada))
    setVeiculosFiltrados(filtraPlacas)

    setModeloVeiculo('') // limpa input modelo quando usuário começa a digitar uma placa,
  }

  const handleChooseQuemRecebe = () => {
    setListaQuemRecebe(['Daniel', 'Gabriel'])
  }

  const handleClienteSelected = (elem: Cliente) => {
    setClienteSelecionado(elem)
    setClientesFiltrados([])
    setEnderecoRetirada(elem.enderecoRetirada ?? '')
  }

  const handlePlacaSelected = (elem: Veiculo) => {
    setVeiculoSelecionado(elem)
    setVeiculosFiltrados([])
    setModeloVeiculo(elem.modelo ?? '') // se elem.modelo for undefined, então fica string vazia.( conserto de erro de tipagem)
  }

  const handleQuemRecebeSelected = (elem: any) => {
    setQuemRecebe(elem)
    setListaQuemRecebe([])
  }

  const handleChangeModeloVeiculo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor: string = e.target.value
    setModeloVeiculo(valor)
  }

  const handleChangeEnderecoRetirada = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor: string = e.target.value
    setEnderecoRetirada(valor)
  }

  const handleChangeEnderecoEntrega = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor: string = e.target.value
    setEnderecoEntrega(valor);
  };
  
  const loadClientes = async () => {
    const clients = await getClientes() 
    setClientes(clients as Cliente[]) // cast para typescript confiar em mim, pois o retorno do firebase vem tipado como DocumentData 
  }

  const loadVeiculos = async () => {
    const plates = await getVeiculos()
    setVeiculos(plates as Veiculo[]) // cast para typescript confiar em mim 
  }

  useEffect(() => {
    if (clientes.length == 0)
      loadClientes()
      console.log(`useeffect executado - get em clientes`)
  }, [] )

  useEffect(() => {
    if (veiculos.length == 0)
      loadVeiculos()
      console.log(`useeffect executado para get em placas`)
  }, [] )

  const resetarFormulario = () => {
    setClienteSelecionado({nome: ''});
    setClientesFiltrados([]);
    setQuemRecebe('');
    setListaQuemRecebe([]);
    setVeiculosFiltrados([]);
    setVeiculoSelecionado({placa: ''});
    setModeloVeiculo('');
    setEnderecoRetirada('');
    setEnderecoEntrega('');
  };

  const cadastraServico = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const formData = new FormData(e.currentTarget);
    const valorCobrado = formData.get("valorCobrado");
    console.log(valorCobrado)

    let clienteId = clienteSelecionado?.id;
    let veiculoId = veiculoSelecionado?.id;

    // 1. Cria cliente, se não existir
    if (!clienteId) {
      const novoCliente = await postNovoCliente(clienteSelecionado!.nome, enderecoRetirada, enderecoEntrega);
      console.log(`Cliente cadastrado no banco de dados.`)
      if (!novoCliente.ok) {
        alert(`Erro banco de dados ao cadastrar cliente: ${novoCliente.error}`);
        return;
      }
      clienteId = novoCliente.docRef.id;
    }

    // 2. Cria veículo, se não existir
    if (!veiculoId) {
      if (!veiculoSelecionado?.placa || veiculoSelecionado.placa.length !== 7) {
        alert("Placa incompleta");
        return;
      }

      const novoVeiculo = await postNovoVeiculo(veiculoSelecionado.placa, modeloVeiculo);
      console.log(`Novo veículo cadastrado no banco de dados.`)
      if (!novoVeiculo.ok) {
        alert(`Erro banco de dados ao cadastrar veículo: ${novoVeiculo.error}`);
        return;
      }
      veiculoId = novoVeiculo.docRef.id;
    }

    // 3. Atualiza cliente (endereços)
    await patchCliente(clienteId, enderecoRetirada!, enderecoEntrega);

    // 4. Cria serviço usando os IDs obtidos
    const novoServico = await postNovoServico(clienteId, veiculoId, ' VALOR COBRADO ' , quemRecebe, enderecoRetirada, enderecoEntrega);

    if (!novoServico.ok) {
      alert(`Erro banco de dados ao cadastrar veículo: ${novoServico.error}`);
      return;
    }

    alert("Serviço criado com sucesso!");
    resetarFormulario()
  };



  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="border border-secondary  p-4 rounded">
            <h3 className="d-flex justify-content-center text-secondary mb-3 ">Novo Serviço</h3>

            <form className="needs-validation"
              onSubmit={cadastraServico}
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
                  value={clienteSelecionado?.nome}
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
                          handleClienteSelected(elem)
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
                  required
                  value={veiculoSelecionado?.placa}
                  onChange={handleChangeInputPlaca}
                  onBlur={() => setTimeout(() => setVeiculosFiltrados([]), 200)} // delay com settimeout, sem ele, ao clicar no nome , antes de dar certo ele zera os clientesfiltrados (funcao acima )

                />
                <ul className='list-group position-absolute shadow'
                  style={{ zIndex: 1000 }}
                >
                  {veiculosFiltrados.length > 0 ? (veiculosFiltrados.map((elem, index) => {
                    return (
                      <li
                        key={index}
                        className='list-group-item list-group-item-action'
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          handlePlacaSelected(elem)
                        }}
                      >
                        {elem.placa}
                      </li>

                    )
                  })) : null}
                </ul>
              </div>

              {/* modelo veículo label */}
              <div className="mb-3">
                <h6>Modelo do veículo:</h6>
              </div>

              {/* modelo veículo */}
              <div className="mb-3">
                <input
                  className="form-control"
                  type="text"
                  name="modeloveiculo"
                  placeholder="ex: ford ka azul"
                  maxLength={30}
                  required
                  value={modeloVeiculo}
                  onChange={handleChangeModeloVeiculo}
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
                  onInput={(e) => {
                    const target = e.currentTarget;
                    // usuário só digita números
                    let valor = target.value.replace(/\D/g, "").slice(0, 4);
                    // impede zero à esquerda (exceto se o usuário quiser digitar apenas "0")
                    if (valor.length > 1 && valor.startsWith("0")) {
                      valor = valor.replace(/^0+/, ""); // remove zeros iniciais
                    }
                    target.value = valor;
                  }} />
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
                  required
                  defaultValue={quemRecebe} // era value, mas troquei por defaultValue por indicacao do browser. servicos.tsx:118 You provided a `value` prop to a form field without an `onChange` handler. This will render a read-only field. If the field should be mutable use `defaultValue`. Otherwise, set either `onChange` or `readOnly`.
                  onClick={handleChooseQuemRecebe}
                  // onChange={handleChangeInputNome}
                  onBlur={() => setTimeout(() => setListaQuemRecebe([]), 200)}
                />
 
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
                  value={enderecoRetirada}
                  onChange={handleChangeEnderecoRetirada}
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
                  value={enderecoEntrega}
                  onChange={handleChangeEnderecoEntrega}
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