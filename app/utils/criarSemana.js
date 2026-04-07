export function criarSemana(){

  const dias = ["segunda","terca","quarta","quinta","sexta"]

  const semana = {}

  dias.forEach(d=>{
    semana[d] = Array.from({length:8}).map((_,i)=>({
      id: d+"-demanda-"+i,
      nome:"",
      funcionarios:[]
    }))
  })

  return semana
}