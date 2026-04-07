import {useDroppable} from "@dnd-kit/core"

export default function CaixaDemanda({
  demanda,
  removerFuncionario,
  atualizarNome
}){

  const {setNodeRef,isOver} =
    useDroppable({id:demanda.id})

  return(
    <div
      ref={setNodeRef}
      className={`caixa-demanda${isOver ? " drag-over" : ""}`}
    >

      <input
        className="form-control mb-2"
        placeholder="Delegacia / setor"
        defaultValue={demanda.nome}
        onChange={e=>atualizarNome(demanda.id, e.target.value)}
      />

      <div className="d-flex flex-wrap gap-1">
        {demanda.funcionarios.map(f=>(
          <span
            key={f.id}
            title="Clique para remover"
            onClick={()=>removerFuncionario(demanda.id, f.id)}
            style={{
              background: "#dbeafe",
              color: "#1d4ed8",
              fontWeight: 600,
              fontSize: "0.72rem",
              borderRadius: 20,
              padding: "3px 10px",
              cursor: "pointer",
              userSelect: "none"
            }}
          >
            {f.nome} ×
          </span>
        ))}
      </div>

    </div>
  )
}