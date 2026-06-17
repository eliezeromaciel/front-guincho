import type { FuncionarioDemanda } from "../utils/criarSemana";

export interface PlannerState {
  semana: any[]; // The legacy reducer treated this as an array of days with "demandas", keeping as any[] to avoid breaking legacy code
  funcionarios: FuncionarioDemanda[];
}

export type PlannerAction =
  | { type: "SET_DATA"; payload: { semana: any[]; funcionarios: FuncionarioDemanda[] } }
  | { type: "MOVER_FUNCIONARIO"; payload: { funcionarioId: number; demandaId: string } }
  | { type: "REMOVER_FUNCIONARIO"; payload: number }
  | { type: "ALTERAR_DEMANDA"; payload: { demandaId: string; nome: string } };

export const initialState: PlannerState = {
  semana: [],
  funcionarios: []
};

export function plannerReducer(state: PlannerState, action: PlannerAction): PlannerState {
  switch (action.type) {
    case "SET_DATA":
      return {
        ...state,
        semana: action.payload.semana,
        funcionarios: action.payload.funcionarios
      };

    case "MOVER_FUNCIONARIO": {
      const { funcionarioId, demandaId } = action.payload;

      const novaSemana = state.semana.map(dia => ({
        ...dia,
        demandas: dia.demandas.map((d: any) => ({
          ...d,
          funcionarios: d.funcionarios.filter((f: any) => f !== funcionarioId)
        }))
      }));

      novaSemana.forEach(dia => {
        dia.demandas.forEach((d: any) => {
          if (d.id === demandaId) {
            d.funcionarios.push(funcionarioId);
          }
        });
      });

      return { ...state, semana: novaSemana };
    }

    case "REMOVER_FUNCIONARIO": {
      return {
        ...state,
        semana: state.semana.map(dia => ({
          ...dia,
          demandas: dia.demandas.map((d: any) => ({
            ...d,
            funcionarios: d.funcionarios.filter((f: any) => f !== action.payload)
          }))
        }))
      };
    }

    case "ALTERAR_DEMANDA": {
      const { demandaId, nome } = action.payload;

      return {
        ...state,
        semana: state.semana.map(dia => ({
          ...dia,
          demandas: dia.demandas.map((d: any) =>
            d.id === demandaId ? { ...d, nome } : d
          )
        }))
      };
    }

    default:
      return state;
  }
}
