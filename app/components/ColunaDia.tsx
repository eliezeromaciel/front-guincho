import { useDroppable } from "@dnd-kit/core";
import CardDemanda from "./CardDemanda";
import type { Demanda } from "../utils/criarSemana";

const coresDia: Record<string, { header: string; text: string }> = {
  segunda: { header: "#dbeafe", text: "#1d4ed8" },
  terca:   { header: "#ede9fe", text: "#6d28d9" },
  quarta:  { header: "#dcfce7", text: "#166534" },
  quinta:  { header: "#fef3c7", text: "#92400e" },
  sexta:   { header: "#fce7f3", text: "#be185d" },
};

interface ColunaDiaProps {
  dia: string;
  demandas: Demanda[];
  abrirOverlay: (dia: string) => void;
}

export default function ColunaDia({ dia, demandas, abrirOverlay }: ColunaDiaProps) {
  const { setNodeRef, isOver } = useDroppable({ id: dia });
  const cor = coresDia[dia] ?? { header: "#f1f5f9", text: "#475569" };

  return (
    <div className="col">
      <div
        ref={setNodeRef}
        className="coluna-dia"
        style={{ background: isOver ? "#eff6ff" : "#ffffff" }}
      >
        <div
          className="dia-header"
          style={{ background: cor.header, color: cor.text }}
          onClick={() => abrirOverlay(dia)}
        >
          {dia.toUpperCase()}
        </div>

        {demandas.filter(d => d.nome.trim()).map(d => (
          <CardDemanda key={d.id} demanda={d} />
        ))}
      </div>
    </div>
  );
}