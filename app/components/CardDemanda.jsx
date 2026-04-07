import { useDraggable } from "@dnd-kit/core"

export default function CardDemanda({demanda}){

  const {attributes, listeners, setNodeRef, transform} =
    useDraggable({
      id: demanda.id
    })

  const style = {
    transform: transform
      ? `translate(${transform.x}px, ${transform.y}px)`
      : undefined,
    cursor:"grab"
  }

  return(
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className="card mb-2 p-2"
    >
      <strong>{demanda.nome || "Sem nome"}</strong>

      <div className="mt-2">
        {demanda.funcionarios.map(f=>(
          <span
            key={f.id}
            className="badge bg-primary me-1"
          >
            {f.nome}
          </span>
        ))}
      </div>

    </div>
  )
}