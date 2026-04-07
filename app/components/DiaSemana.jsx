export default function DiaSemana({dia, abrir}){

  return(
    <div className="col">
      <div
        onClick={abrir}
        className="border border-dark p-5 text-center"
        style={{cursor:"pointer"}}
      >
        <b>{dia.toUpperCase()}</b>
      </div>
    </div>
  )
}