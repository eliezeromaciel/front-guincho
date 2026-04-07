import {useDraggable} from "@dnd-kit/core"

function Item({func, ocupado}){

  const {attributes,listeners,setNodeRef,transform} =
    useDraggable({id:"func-"+func.id})

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
      className={`p-2 border mb-2 ${ocupado ? "bg-secondary text-white" : "bg-light"}`}
    >
      {func.nome}
    </div>
  )
}

export default function ListaFuncionarios({funcionarios, ocupados}){

  return(
    <div style={{width:220}}>
      {funcionarios.map(f=>(
        <Item
          key={f.id}
          func={f}
          ocupado={ocupados.includes(f.id)}
        />
      ))}
    </div>
  )
}