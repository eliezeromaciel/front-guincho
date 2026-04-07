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
      className="card-demanda mb-2"
    >
      <strong>{demanda.nome || "Sem nome"}</strong>

      <div className="mt-2 d-flex flex-wrap gap-1">
        {demanda.funcionarios.map(f=>(
          <span
            key={f.id}
            className="badge"
            style={{
              background: "#ede9fe",
              color: "#6d28d9",
              fontWeight: 600,
              fontSize: "0.72rem",
              borderRadius: 20,
              padding: "3px 10px"
            }}
          >
            {f.nome}
          </span>
        ))}
      </div>

    </div>
  )
}