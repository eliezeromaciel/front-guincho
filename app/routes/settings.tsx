
import OffCanvas from "~/components/offcanvas/offcanvas";
import { useState } from "react";

const SrtAdjuster: React.FC = () => {
  const [targetStart, setTargetStart] = useState("12.4");

  const parseTime = (t: string): number => {
    const [hms, ms] = t.split(",");
    const [h, m, s] = hms.split(":").map(Number);
    return h * 3600 + m * 60 + s + Number(ms) / 1000;
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 0) seconds = 0;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.round((seconds - Math.floor(seconds)) * 1000);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();

    // Detecta o tempo da primeira legenda
    const firstTimeLine = text.split("\n").find(l => l.includes("-->"));
    if (!firstTimeLine) return;
    const firstStart = parseTime(firstTimeLine.split(" --> ")[0]);

    // Calcula offset
    const desiredStart = parseFloat(targetStart);
    const offset = firstStart - desiredStart;

    // Ajusta todas as legendas
    const adjusted = text.split("\n").map(line => {
      if (line.includes("-->")) {
        const [start, end] = line.split(" --> ");
        const newStart = formatTime(parseTime(start) - offset);
        const newEnd = formatTime(parseTime(end) - offset);
        return `${newStart} --> ${newEnd}`;
      }
      return line;
    }).join("\n");

    // Baixar arquivo
    const blob = new Blob([adjusted], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "legenda_ajustada.srt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Ajustar Legendas SRT</h2>
      <label>
        Tempo inicial desejado (segundos):
        <input
          type="number"
          step="0.1"
          value={targetStart}
          onChange={e => setTargetStart(e.target.value)}
          style={{ marginLeft: 10 }}
        />
      </label>
      <br /><br />
      <input type="file" accept=".srt" onChange={handleFile} />
    </div>
  );
};

export default SrtAdjuster;

// export default function Settings () {
//     return (
//         <div>

//             page settings

//             <OffCanvas/>
//         </div>
//     )
// }