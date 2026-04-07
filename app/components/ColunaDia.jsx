import {useDroppable} from "@dnd-kit/core"
import CardDemanda from "./CardDemanda"

export default function ColunaDia({dia, demandas, abrirOverlay}){

  const {setNodeRef, isOver} = useDroppable({
    id: dia
  })

  return(
    <div className="col">
      <div
        ref={setNodeRef}
        className="border p-3"
        style={{
          minHeight:500,
          background:isOver ? "#e7f1ff" : "#f8f9fa"
        }}
      >

        {/* 🔥 AGORA O CLICK É AQUI */}
        <h5
          className="text-center mb-3"
          style={{cursor:"pointer"}}
          onClick={()=> (abrirOverlay(dia), console.log(`clic em dias testando`))}
          // onClick={()=>console.log(`testando clic EM DIAS`)}
        >
          {dia.toUpperCase()}
        </h5>

        {demandas.filter(d=>d.nome.trim()).map(d=>(
          <CardDemanda
            key={d.id}
            demanda={d}
          />
        ))}

      </div>
    </div>
  )
}