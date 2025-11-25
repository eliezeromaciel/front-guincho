import { useState } from 'react'
import { postNovoCliente } from '~/services/clientes'



const Clientes = () => {

  const [telefone, setTelefone] = useState<string>('')
  const [nome, setNome] = useState<string>('')
  const [endereco, setEndereco] = useState<string>('')

  const formatPhoneNumber = (value: string) => {
    const phoneNumber: string = value.replace(/\D/g, '') // Remove tudo que não for número

    if (phoneNumber.length === 0) return '' // Permite apagar o campo

    if (phoneNumber.length <= 10) {
      return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2, 6)}${phoneNumber.length > 6 ? '-' + phoneNumber.slice(6) : ''}`
    } else {
      return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2, 7)}-${phoneNumber.slice(7, 11)}`
    }
  }


  const handlePhoneChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue: string = event.target.value
    const formatted: string = formatPhoneNumber(rawValue)
    setTelefone(formatted)
  }

  const cadastraCliente = async () => {
    if (telefone.length == 15) {
      postNovoCliente(nome, endereco, telefone)
      setTelefone('')
      setNome('')
      setEndereco('')
    } else {
      alert (`O telefone do cliente não está completo`)
    }

  }

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="border border-secondary p-4 rounded">
            <h3 className="text-secondary mb-3">Cadastro de Cliente</h3>

            <form className="needs-validation"
             onSubmit={ (e) => {
                  e.preventDefault()
                  cadastraCliente()
                }}
            >

              {/* nome label */}
              <div className="mb-3">
                <h6>Nome Completo:</h6>
              </div>

              {/* nome input */}
              <div className="mb-3">
                <input
                  className="form-control"
                  type="text"
                  name="nome"
                  placeholder="Ex.: Denis Silva de Sousa"
                  maxLength={30}
                  value={nome}
                  onChange={(e) => {setNome(e.target.value)}}
                  required
                />
              </div>


              {/* telefone label*/}
              <div className="mb-3">
                <h6>Telefone:</h6>
              </div>

              {/* telefone input  */}
              <div className="mb-3">
                <div className="input-group">
                  <span className="input-group-text">+55</span>
                  <input
                    className="form-control"
                    type="text"
                    name="telefone"
                    placeholder="(51)99864-7511"
                    value={telefone}
                    onChange={handlePhoneChange}
                    maxLength={15}
                    required
                  />
                </div>
              </div>

              {/* Endereço label*/}
              <div className="mb-3">
                <h6>Endereço:</h6>
              </div>

              {/* Endereço input */}
              <div className="mb-3">
                <input
                  className="form-control"
                  type="text"
                  name="nome"
                  placeholder="Rua José Bonifário, 1345, São Leopoldo"
                  maxLength={80}
                  value={endereco}
                  onChange={ (e) => {setEndereco(e.target.value) }}
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

export default Clientes
