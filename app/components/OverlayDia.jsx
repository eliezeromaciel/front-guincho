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

  const ocupados = semana[dia]
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

  function atualizarNome(demandaId, nome){
    setSemana(prev=>{
      const novo = structuredClone(prev)
      Object.values(novo).forEach(lista=>{
        lista.forEach(d=>{
          if(d.id === demandaId) d.nome = nome
        })
      })
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
    <div
      className="overlay-backdrop"
      onClick={fechar}
    >

      <div
        className="overlay-painel"
        onClick={e => e.stopPropagation()}
      >

        <button
          className="btn-fechar mb-3"
          onClick={fechar}
        >
          ← Fechar
        </button>

        <p className="overlay-titulo">{dia}</p>

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
                      atualizarNome={atualizarNome}
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