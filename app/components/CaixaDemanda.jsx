import {useDroppable} from "@dnd-kit/core"

export default function CaixaDemanda({
  demanda,
  removerFuncionario
}){

  const {setNodeRef,isOver} =
    useDroppable({id:demanda.id})

  return(
    <div
      ref={setNodeRef}
      className="border p-2"
      style={{
        height:120,
        background:isOver ? "#d1e7dd" : "white"
      }}
    >

      <input
        className="form-control mb-2"
        placeholder="Delegacia / setor"
        // value={demanda.nome}
        onChange={e=>demanda.nome = e.target.value}
      />

      {demanda.funcionarios.map(f=>(
        <div
          key={f.id}
          className="badge bg-primary me-1"
          style={{cursor:"pointer"}}
          onClick={()=>removerFuncionario(demanda.id, f.id)}
        >
          {f.nome}
        </div>
      ))}

    </div>
  )
}