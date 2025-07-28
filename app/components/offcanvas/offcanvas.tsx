

export default function OffCanvas () {

  return (
<div>
  <div className="dropdown">
  <button className="btn btn-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
    Dropdown button
  </button>
  <ul className="dropdown-menu">
    <li><a className="dropdown-item" href="#">Action</a></li>
    <li><a className="dropdown-item" href="#">Another action</a></li>
    <li><a className="dropdown-item" href="#">Something else here</a></li>
  </ul>
</div>
    off canvaws
    <div className="bg-primary">teste cor verde </div>
<button type="button" className="btn btn-primary">Primary</button>

    <div className="navbar bg-verdeTelaInicial d-flex">  
         
      <button className="navbar-toggler shadow-none" type="button"
        data-bs-toggle="offcanvas" data-bs-target="#offcanvasNavbar" 
        aria-controls="offcanvasNavbar" aria-label="Toggle navigation" 
      >
        <span className="bi bi-list text-white"></span>
      </button>

      {/* <!-- begin Avatar --> */}
      <div className="topMenuRight d-flex">
        <div className="mx-2">
          <div className="dropdown-center">
            <a className="btn border-none outline-none text-white dropdown-toggle" type="button"
              id="triggerId" data-bs-toggle="dropdown"
              aria-haspopup="true" aria-expanded="false">
              <i className="bi bi-person-bounding-box mx-1"></i>
              <span className="d-sm-inline"> Avatar </span>
            </a>
            <div className="dropdown-menu bg-verdeTelaInicial" aria-labelledby="triggerId">
              <a className="dropdown-item" href="/#">Alterar Senha </a>
            </div>
          </div>
        </div>
        {/* <!-- end avatar --> */}

        {/* <!-- begin button out --> */}
        <button className="navbar-toggler mx-2 shadow-none " type="button"  >
          <a href="/login" 
            className="bi bi-box-arrow-right text-white">
          </a>
        </button>
        {/* <!-- end button out --> */}
      </div>

      {/* <!-- really begin offcanvas --> */}
      <div className="offcanvas offcanvas-start bg-verdeTelaInicial"  style={{ width: '200px' }}
        // tabIndex="-1" id="offcanvasNavbar" 
        aria-labelledby="offcanvasNavbarLabel" data-bs-backdrop="true" 
      >
        <div className="offcanvas-header p-1 justify-content-around">
          {/* logotipo que leva pra página inicial */}
          <a href="/">
            <img src="/assets/img/logoLogin.png" alt="Logo"
              style={{ maxWidth: '45px' }} />
          </a>
          {/* botão que fecha e abre e fecha o offcanvas */}
          <button className="navbar-toggler shadow-none" type="button"
            data-bs-toggle="offcanvas" data-bs-target="#offcanvasNavbar" 
            aria-controls="offcanvasNavbar" aria-label="Toggle navigation"
          >
            <span className="bi bi-list text-white"></span>
          </button>
        </div>

        {/* <!-- begin SideBar --> */}
        <div className="d-flex flex-column justify-content-between col-auto bg-verdeTelaInicial min-vh-100">
          <div className="">
            <ul className="nav nav-pills flex-column mt-2 mt-sm-0" id="menu">
              <li className="nav-item my-1 ">
                <a href="/#sidemenu" data-bs-toggle='collapse'
                  className="nav-link text-white rounded-0" aria-current="page">
                  <i className="bi bi-pie-chart"></i>
                  <span className="ms-2 d-sm-inline " >Cadastros</span>
                </a>
                <ul className="nav collapse ms-1 flex-column" id="sidemenu"
                  data-bs-parent="#menu"> 
                  
                  <li className="nav-item my-1" > 
                    <a className="nav-link text-white ms-3" href="/clientes"
                      aria-current="page">
                      <i className="bi bi-pie-chart"> </i> 
                      Clientes
                    </a>
                  </li>
                  <li className="nav-item my-1" > 
                    <a className="nav-link text-white ms-3" href="/mensagens"
                      aria-current="page">
                      <i className="bi bi-pie-chart"> </i> 
                      Mensagens
                    </a>
                  </li>
                </ul>
              </li>
        
              <li className="nav-item my-1">
                <a href="/#sidemenu2" data-bs-toggle='collapse'
                  className="nav-link text-white rounded-0" aria-current="page">
                  <i className="bi bi-gear"></i>
                  <span className="ms-2 d-sm-inline">Configurações</span>
                </a>
                <ul className="nav collapse ms-1 flex-column " id="sidemenu2"
                  data-bs-parent="#menu"> 
                  <li className="nav-item my-1">
                    <a className="nav-link text-white ms-3" href="/novousuario"
                      aria-current="page">
                      <i className="bi bi-people"> </i>
                        Usuário
                    </a>
                  </li>
                </ul>
                <ul className="nav collapse ms-1 flex-column" id="sidemenu2"
                  data-bs-parent="#menu"> 
                  <li className="nav-item my-1">
                    <a className="nav-link text-white ms-3" href="/parametros"
                      aria-current="page">
                      <i className="bi bi-gear" > </i>
                        Parâmetros
                    </a>
                  </li>
                </ul>
                <ul className="nav collapse ms-1 flex-column" id="sidemenu2"
                  data-bs-parent="#menu"> 
                  <li className="nav-item my-1">
                    <a className="nav-link text-white ms-3" href="/#"
                      aria-current="page">
                      <i className="bi bi-question-circle"> </i>
                                  Seila
                    </a>
                  </li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
        {/* <!-- end sidebar --> */}
      </div>
      {/* <!-- end offcanvas --> */}

    </div>
</div>
  )

}

