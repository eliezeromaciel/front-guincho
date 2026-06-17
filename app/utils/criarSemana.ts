export interface FuncionarioDemanda {
  id: number;
  nome: string;
}

export interface Demanda {
  id: string;
  nome: string;
  funcionarios: FuncionarioDemanda[];
}

export type SemanaDict = Record<string, Demanda[]>;

export function criarSemana(): SemanaDict {
  const dias = ["segunda", "terca", "quarta", "quinta", "sexta"];
  const semana: SemanaDict = {};

  dias.forEach(d => {
    semana[d] = Array.from({ length: 8 }).map((_, i) => ({
      id: d + "-demanda-" + i,
      nome: "",
      funcionarios: []
    }));
  });

  return semana;
}