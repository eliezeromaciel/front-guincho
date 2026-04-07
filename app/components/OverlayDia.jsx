import {DndContext} from "@dnd-kit/core"
import ListaFuncionarios from "./ListaFuncionarios"
import CaixaDemanda from "./CaixaDemanda"

export default function OverlayDia({
  dia,
  fechar,
  funcionarios,
  semana,
  setSemana
}){

  const demandas = semana[dia]

  const ocupados = Object.values(semana)
    .flat()
    .flatMap(d=>d.funcionarios.map(f=>f.id))

  function onDragEnd(event){

    const {active, over} = event
    if(!over) return

    const funcId =
      Number(active.id.replace("func-",""))

    setSemana(prev=>{

      const novo = structuredClone(prev)

      Object.values(novo).forEach(lista=>{
        lista.forEach(d=>{
          d.funcionarios =
            d.funcionarios.filter(f=>f.id!==funcId)
        })
      })

      const destino =
        Object.values(novo)
          .flat()
          .find(d=>d.id===over.id)

      const func =
        funcionarios.find(f=>f.id===funcId)

      destino.funcionarios.push(func)

      return novo
    })
  }

  function removerFuncionario(demandaId, funcId){

    setSemana(prev=>{

      const novo = structuredClone(prev)

      Object.values(novo).forEach(lista=>{
        lista.forEach(d=>{
          if(d.id===demandaId){
            d.funcionarios =
              d.funcionarios.filter(f=>f.id!==funcId)
          }
        })
      })

      return novo
    })
  }

  return(
    <div className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50">

      <div className="bg-white m-5 p-4 h-100 overflow-auto">

        <button
          className="btn btn-dark mb-3"
          onClick={fechar}
        >
          Fechar
        </button>

        <h2>{dia.toUpperCase()}</h2>

        <DndContext onDragEnd={onDragEnd}>

          <div className="d-flex gap-4">

            <ListaFuncionarios
              funcionarios={funcionarios}
              ocupados={ocupados}
            />

            <div className="container">
              <div className="row g-3">

                {demandas.map(d=>(
                  <div className="col-3" key={d.id}>
                    <CaixaDemanda
                      demanda={d}
                      removerFuncionario={removerFuncionario}
                    />
                  </div>
                ))}

              </div>
            </div>

          </div>

        </DndContext>

      </div>

    </div>
  )
}