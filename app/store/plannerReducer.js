
export const initialState = {
  semana: [],
  funcionarios: []
};

export function plannerReducer(state, action){
  switch(action.type){

    case "SET_DATA":
      return {
        ...state,
        semana: action.payload.semana,
        funcionarios: action.payload.funcionarios
      };

    case "MOVER_FUNCIONARIO":{

      const { funcionarioId, demandaId } = action.payload;

      const novaSemana = state.semana.map(dia=>({
        ...dia,
        demandas: dia.demandas.map(d=>({
          ...d,
          funcionarios: d.funcionarios.filter(f=>f!==funcionarioId)
        }))
      }));

      novaSemana.forEach(dia=>{
        dia.demandas.forEach(d=>{
          if(d.id === demandaId){
            d.funcionarios.push(funcionarioId);
          }
        });
      });

      return {...state, semana:novaSemana};
    }

    case "REMOVER_FUNCIONARIO":{

      return {
        ...state,
        semana: state.semana.map(dia=>({
          ...dia,
          demandas: dia.demandas.map(d=>({
            ...d,
            funcionarios: d.funcionarios.filter(f=>f!==action.payload)
          }))
        }))
      };
    }

    case "ALTERAR_DEMANDA":{

      const {demandaId, nome} = action.payload;

      return {
        ...state,
        semana: state.semana.map(dia=>({
          ...dia,
          demandas: dia.demandas.map(d=>
            d.id === demandaId ? {...d, nome} : d
          )
        }))
      };
    }

    default:
      return state;
  }
}
