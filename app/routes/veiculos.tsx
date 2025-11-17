import { useState, useRef } from 'react'
import { postNovoVeiculo } from '~/services/veiculos'



const Veiculos = () => {

  const [placa, setPlaca] = useState<string>('')
  const [modelo, setModelo] = useState<string>('')
  const [cor, setCor] = useState<string>('')

  const handlePlacaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let valor: string = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")  // remove caracteres que nao sao numeros ou letras
    if (valor.length > 7) valor = valor.slice(0, 7); // limita a 7 chars

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

    let validValue = "";
    for (let i = 0; i < valor.length; i++) {
      if (padraoMercosul[i].test(valor[i])) {
        validValue += valor[i];
      } else {
        break; // se for inválido, para e não adiciona
      }
    }

    setPlaca(validValue);
  }

  const cadastraVeiculo = async () => {
    if (placa.length !== 7) {
      alert(`Placa incompleta`)
      return
    }

    const response = await postNovoVeiculo(placa, modelo)

    if (!response.ok) {
      alert(`Erro ao cadastrar o veículo`)
      return
    }

    
    const {docRef} = response
    console.log(docRef.id)

    alert(`Veículo cadastrado com sucesso`)

    setPlaca('')
    setModelo('')
  }

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="border border-secondary p-4 rounded">
            <h3 className="text-secondary mb-3">Cadastro de Veículos</h3>

            <form className="needs-validation"
              onSubmit={(e) => {
                e.preventDefault()
                cadastraVeiculo()
              }}
            >

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
                  onChange={handlePlacaChange}
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
                  onChange={(e) => setModelo(e.target.value)}
                  required
                />
              </div>


              <div className="d-grid">
                <button type="submit" className="btn btn-primary" >
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
