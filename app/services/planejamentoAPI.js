// import axios from "axios";

// export async function carregarSemana(){

//   const r = await axios.get("/api/planejamento");

//   return r.data;
// }

export async function carregarSemana() {

  const funcionarios = [
    "João",
    "Pedro",
    "Carlos",
    "Marcos",
    "Rafael",
    "Lucas",
    "Bruno",
    "Mateus",
    "Felipe",
    "Ricardo",
    "Eduardo",
    "Tiago",
    "André",
    "Paulo",
    "Roberto",
    "Daniel",
    "Leandro",
    "Fábio",
  ];

  const hoje = new Date();
  const diaSemana = hoje.getDay();

  const segunda = new Date(hoje);
  segunda.setDate(hoje.getDate() - diaSemana + 1);

  const semana = [];

  for (let i = 0; i < 5; i++) {

    const data = new Date(segunda);
    data.setDate(segunda.getDate() + i);

    semana.push({
      id: i,
      data: data.toISOString(),
      demandas: Array.from({ length: 8 }).map((_, j) => ({
        id: `${i}-${j}`,
        nome: "",
        funcionarios: [],
      })),
    });
  }

  return {
    semana,
    funcionarios,
  };
}