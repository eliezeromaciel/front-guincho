import { useState, useRef } from 'react'
import { postVeiculo } from '~/services/veiculos'




const Veiculos = () => {

  const [placa, setPlaca] = useState <string> ('')
  const [modelo, setModelo] = useState<string>('')
  const [cor, setCor] = useState<string>('')


  
  const cadastraVeiculo = async () => {
    postVeiculo(placa, modelo, cor )
  }

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="border border-secondary p-4 rounded">
            <h3 className="text-secondary mb-3">Cadastro de Veículos</h3>

            <form className="needs-validation" noValidate>

              {/* placa label */}
              <div className="mb-3">
                <h6>Placa:</h6>
              </div>

              {/* placa input */}
              <div className="mb-3">
                <input
                  className="form-control"
                  type="text"
                  name="placa"
                  placeholder="ex: ABC-0123"
                  maxLength={30}
                  value={placa}
                  onChange={(e) => setPlaca(e.target.value)}
                  required
                />
              </div>


              {/* modelo label*/}
              <div className="mb-3">
                <h6>Modelo:</h6>
              </div>

              {/* modelo input  */}
              <div className="mb-3">
                <input
                  className="form-control"
                  type="text"
                  name="modelo"
                  placeholder="ex: kadett"
                  maxLength={30}
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value) }
                  required
                />
              </div>

              {/* cor label*/}
              <div className="mb-3">
                <h6>Cor:</h6>
              </div>

              {/* cor input */}
              <div className="mb-3">
                <input
                  className="form-control"
                  type="text"
                  name="cor"
                  placeholder="ex: azul escuro"
                  maxLength={30}
                  value={cor}
                  onChange={(e) => setCor(e.target.value)}
                  required
                />
              </div>


              <div className="d-grid">
                <button type="button" className="btn btn-primary" onClick={cadastraVeiculo}>
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

export default Veiculos
