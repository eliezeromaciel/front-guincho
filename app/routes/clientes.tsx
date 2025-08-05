import {useState} from 'react'


const Clientes = () => {
  
  const [telefone, setTelefone] = useState('')
  
  const formatPhoneNumber = (value: any) => {
    const phoneNumber = value.replace(/\D/g, '') // Remove tudo que não for número

    if (phoneNumber.length === 0) return '' // Permite apagar o campo

    if (phoneNumber.length <= 10) {
      return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2, 6)}${phoneNumber.length > 6 ? '-' + phoneNumber.slice(6) : ''}`
    } else {
      return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2, 7)}-${phoneNumber.slice(7, 11)}`
    }
  }

  
  const handlePhoneChange = (event: any) => {
    const rawValue = event.target.value 
    const formatted = formatPhoneNumber(rawValue)
    setTelefone(formatted)
  }


  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="border border-secondary p-4 rounded">
            <h3 className="text-secondary mb-3">Novo Cliente</h3>

            <form className="needs-validation" noValidate>

              {/* nome */}
              <div className="mb-3">
                <input 
                  className="form-control" 
                  type="text"
                  name="nome" 
                  placeholder="Nome"
                  maxLength={30}
                  required 
                />
              </div>

              {/* telefone */}
              <div className="mb-3">
                <div className="input-group">
                  <span className="input-group-text">+55</span>
                  <input 
                    className="form-control" 
                    type="text"
                    name="telefone" 
                    placeholder="Telefone"
                    value={telefone}
                    onChange={handlePhoneChange}
                    maxLength={15}
                    required 
                  />
                </div>
              </div>
            

            
              {/* nome */}
              <div className="mb-3">
                <input 
                  className="form-control" 
                  type="text"
                  name="nome" 
                  placeholder="Endereço padrão de entrega"
                  maxLength={30}
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
