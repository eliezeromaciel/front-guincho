import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  return (
    <div className="bg-white overflow-auto">
      
      <header className="navbar bg-cinzaEscuro navbar-expand-lg navbar-light px-4 rounded-3" >
        <a href="" className="navbar-brand p-0">
          <h1 
            style={{
              color: '#FFFFFF',
              fontWeight: "bold",
              margin: 0
            }}
          >GuinchoFácil</h1>
        </a>

        <button className="navbar-toggler rounded-pill bg-secondary" type="button" data-bs-toggle="collapse" data-bs-target="#navbarCollapse">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarCollapse">
          <div className="navbar-nav mx-auto py-0">
            <a href="#trocaSenha" className="nav-item nav-link">Troca Senha</a>
            <a href="#sair" className="nav-item nav-link">Sair</a>
          </div>
        </div>
      </header>

      <main>
        <div className=" d-flex p-3 justify-content-around" >
          <img src="/app/assets/img/logotipo-guincho-farias.jpg" alt="fotografia" width={150} />
        </div>

        <div className="d-flex flex-column p-3 justify-content-around bg-dark-subtle rounded-3"  style={{ height: "340px" }} >
          <button className="btn bg-secondary " >CADASTRO</button>
          <div className="d-flex justify-content-around p-3">
            <div className="d-flex flex-column align-items-center p-3">
              <label>Cliente</label>
              <button className="btn btn-secondary p-2"><img src="/app/assets/img/iconecadastrocliente.png" alt="" width={80} /></button>
            </div>
            <div className="d-flex flex-column align-items-center p-3">
              <label>Serviço</label>
              <button className="btn btn-secondary p-2"><img src="/app/assets/img/guincho.jpg" alt="" width={80} /></button>
            </div>
          </div>
          <div className="d-flex justify-content-end">
            <button className="btn bg-secondary " >Gerar Relatório</button>
          </div>
        </div>
      </main>
            
            {/* span inserido apenas para visualizar como ficaria separacao do footer com main (visualmente) */}
        <span className="text-white"> s</span>
      <footer>
        <div className="bg-cinzaEscuro rounded-3" >
          <div className="p-3 ms-4">
            <p className="text-white h3">
              Contatos
            </p>
            <p className="mt-4">
              <i className="bi bi-telephone me-4"></i>
              (51) 9 9762-6285
            </p>
            <p className="mt-4">
              <i className="bi bi-envelope me-4" ></i>
              email@email.com
            </p>
          </div>
        </div>
      </footer>


    </div>
  )
}


