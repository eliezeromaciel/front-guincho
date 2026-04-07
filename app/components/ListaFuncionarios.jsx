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
      className={`func-item ${ocupado ? "func-ocupado" : "func-disponivel"}`}
    >
      {func.nome}
    </div>
  )
}

export default function ListaFuncionarios({funcionarios, ocupados}){

  return(
    <div style={{width:200, flexShrink:0}}>
      <p className="lista-func-titulo">Funcionários</p>
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