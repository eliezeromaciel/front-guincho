
import {useState} from "react"
import {DndContext} from "@dnd-kit/core"
import ColunaDia from "../components/ColunaDia"
import OverlayDia from "../components/OverlayDia"
import {criarSemana} from "../utils/criarSemana"
import {funcionarios} from "../assets/funcionariosMock"

export default function Planejamento(){

  const [semana,setSemana] = useState(criarSemana())
  const [overlay,setOverlay] = useState(null)

  function abrirOverlay(dia){
    setOverlay({dia})
  }

  function fecharOverlay(){
    setOverlay(null)
  }

  function onDragEnd(event){

    const {active, over} = event
    if(!over) return

    const demandaId = active.id
    const diaDestino = over.id

    setSemana(prev=>{
      const novo = structuredClone(prev)

      let demandaMovida = null

      Object.keys(novo).forEach(dia=>{
        const index = novo[dia].findIndex(d=>d.id === demandaId)

        if(index !== -1){
          demandaMovida = novo[dia][index]
          novo[dia].splice(index,1)
        }
      })

      if(demandaMovida){
        novo[diaDestino].push(demandaMovida)
      }

      return novo
    })
  }

  return(
    <div className="container mt-4">

        <p>CONTROLE DE DEMANDAS</p>
      <DndContext onDragEnd={onDragEnd}>
        <div className="row">

          {Object.keys(semana).map(dia=>(
            <ColunaDia
              key={dia}
              dia={dia}
              demandas={semana[dia]}
              abrirOverlay={abrirOverlay}
            />
          ))}

        </div>

      </DndContext>

      {overlay && (
        <OverlayDia
          dia={overlay.dia}
          fechar={fecharOverlay}
          funcionarios={funcionarios}
          semana={semana}
          setSemana={setSemana}
        />
      )}

    </div>
  )
}
