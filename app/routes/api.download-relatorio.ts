import { requireAdmin } from '~/services/session.server';
import { getServicos } from '~/services/servicos.server';
import { getDespesas } from '~/services/despesas.server';
import type { Route } from './+types/api.download-relatorio';

const getJsDate = (ts: any): Date | null => {
  if (!ts) return null;
  if (typeof ts.toDate === 'function') return ts.toDate();
  if (ts.seconds) return new Date(ts.seconds * 1000);
  if (ts._seconds) return new Date(ts._seconds * 1000);
  return new Date(ts);
};

const nomesMeses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const caminhaoNomeMap: Record<string, string> = {
  A: 'Gabriel',
  B: 'Daniel',
  C: 'Caminhão C',
};

type LinhaRelatorio = {
  date: Date;
  motorista: string;
  quemRecebe: string;
  descricao: string;
  valor: number;
  tipo: 'receita' | 'despesa' | 'faturado' | 'faturado-recebido';
};

// ============================
// ESTILOS (copiados da planilha original)
// ============================
const COLORS = {
  headerBlue: 'FF8DB4E2',
  headerGreen: 'FFC4D79B',
  red: 'FFFF0000',
  black: 'FF000000',
  white: 'FFFFFFFF',
};

const FONT_DEFAULT = { name: 'Calibri', size: 11 };
const FONT_RED = { ...FONT_DEFAULT, color: { argb: COLORS.red } };
const FONT_BOLD = { ...FONT_DEFAULT, bold: true };
const FONT_HEADER_BOLD = { ...FONT_DEFAULT, bold: true, color: { argb: COLORS.black } };

const FILL_HEADER_BLUE = {
  type: 'pattern' as const,
  pattern: 'solid' as const,
  fgColor: { argb: COLORS.headerBlue },
};
const FILL_HEADER_GREEN = {
  type: 'pattern' as const,
  pattern: 'solid' as const,
  fgColor: { argb: COLORS.headerGreen },
};

const BORDER_THIN = {
  top: { style: 'thin' as const, color: { argb: COLORS.black } },
  bottom: { style: 'thin' as const, color: { argb: COLORS.black } },
  left: { style: 'thin' as const, color: { argb: COLORS.black } },
  right: { style: 'thin' as const, color: { argb: COLORS.black } },
};

const ALIGN_CENTER = { horizontal: 'center' as const, vertical: 'bottom' as const };
const ALIGN_RIGHT = { horizontal: 'right' as const, vertical: 'bottom' as const };

export const loader = async ({ request }: Route.LoaderArgs) => {
  await requireAdmin(request);

  const url = new URL(request.url);
  const mesParam = parseInt(url.searchParams.get('mes') || '', 10);
  const anoParam = parseInt(url.searchParams.get('ano') || '', 10);

  const hoje = new Date();
  const mes = (mesParam >= 1 && mesParam <= 12) ? mesParam - 1 : hoje.getMonth();
  const ano = (anoParam >= 2020 && anoParam <= 2099) ? anoParam : hoje.getFullYear();

  const [servicos, despesas] = await Promise.all([getServicos(), getDespesas()]);

  // Montar linhas
  const linhas: LinhaRelatorio[] = [];

  servicos.forEach((s) => {
    const sDate = getJsDate(s.finalizedAt || s.createdAt);
    if (!sDate) return;

    const tipo = (s as any).tipoRecebedor || 'motorista';

    if (tipo === 'seguradora') {
      const fStatus = (s as any).faturadoStatus || 'pendente';
      const segNome = (s as any).seguradoraNome || s.receiver || 'Seguradora';

      if (sDate.getMonth() === mes && sDate.getFullYear() === ano) {
        linhas.push({
          date: sDate,
          motorista: s.motoristaNome || '—',
          quemRecebe: `Faturado ${segNome}`,
          descricao: s.detalhesVeiculo || s.placaVeiculo || 'Serviço',
          valor: s.valorCobrado,
          tipo: 'faturado',
        });
      }

      if (fStatus === 'recebido') {
        const recebidoEm = getJsDate((s as any).faturadoRecebidoEm);
        if (recebidoEm && recebidoEm.getMonth() === mes && recebidoEm.getFullYear() === ano) {
          linhas.push({
            date: recebidoEm,
            motorista: s.motoristaNome || '—',
            quemRecebe: `Fat Recebida ${segNome}`,
            descricao: `Pgto fatura — ${s.detalhesVeiculo || s.placaVeiculo || 'Serviço'}`,
            valor: s.valorCobrado,
            tipo: 'faturado-recebido',
          });
        }
      }
    } else {
      if (sDate.getMonth() === mes && sDate.getFullYear() === ano) {
        linhas.push({
          date: sDate,
          motorista: s.motoristaNome || '—',
          quemRecebe: s.receiver || s.motoristaNome || '—',
          descricao: s.detalhesVeiculo || s.placaVeiculo || 'Serviço',
          valor: s.valorCobrado,
          tipo: 'receita',
        });
      }
    }
  });

  despesas.forEach((d) => {
    const baseDate = new Date(d.dataPagamento + 'T12:00:00');
    for (let i = 0; i < d.parcelas; i++) {
      const dParcela = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, baseDate.getDate());
      if (dParcela.getMonth() === mes && dParcela.getFullYear() === ano) {
        const parcInfo = d.parcelas > 1 ? ` (${i + 1}/${d.parcelas})` : '';
        linhas.push({
          date: dParcela,
          motorista: '—',
          quemRecebe: `${caminhaoNomeMap[d.caminhao] || d.caminhao} SA`,
          descricao: `${d.descricao}${parcInfo}`,
          valor: -d.valorParcela,
          tipo: 'despesa',
        });
      }
    }
  });

  linhas.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Cálculos de resumo
  const receitasPorMotorista: Record<string, number> = {};
  const despesasPorCaminhao: Record<string, number> = {};
  const faturadosPorSeg: Record<string, number> = {};
  const recebidosPorSeg: Record<string, number> = {};

  linhas.forEach((l) => {
    if (l.tipo === 'receita') {
      receitasPorMotorista[l.motorista] = (receitasPorMotorista[l.motorista] || 0) + l.valor;
    }
    if (l.tipo === 'despesa') {
      const cam = l.quemRecebe.replace(' SA', '');
      despesasPorCaminhao[cam] = (despesasPorCaminhao[cam] || 0) + Math.abs(l.valor);
    }
    if (l.tipo === 'faturado') {
      const seg = l.quemRecebe.replace('Faturado ', '');
      faturadosPorSeg[seg] = (faturadosPorSeg[seg] || 0) + l.valor;
    }
    if (l.tipo === 'faturado-recebido') {
      const seg = l.quemRecebe.replace('Fat Recebida ', '');
      recebidosPorSeg[seg] = (recebidosPorSeg[seg] || 0) + l.valor;
    }
  });

  const totalGeral = linhas.reduce((sum, l) => sum + l.valor, 0);

  // ============================
  // ============================
  // GERAR EXCEL COM ExcelJS
  // ============================
  const ExcelJSModule = await import('exceljs');
  // Garante compatibilidade do import do ExcelJS tanto em desenvolvimento quanto em produção,
  // independente de como o Vite (SSR/bundler) ou o Node resolvem o empacotamento do módulo ES/CommonJS.
  const ExcelJS = (ExcelJSModule as any).default || ExcelJSModule;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'GuinchoFácil';
  wb.created = new Date();

  const mesNome = nomesMeses[mes];
  const anoShort = String(ano).slice(-2);
  const sheetName = `${mesNome}${anoShort}`;

  const ws = wb.addWorksheet(sheetName);
  ws.views = [{ showGridLines: true }];

  // Larguras de coluna (idênticas à planilha original + 1 coluna extra para Motorista)
  ws.columns = [
    { key: 'A', width: 12 },      // Data
    { key: 'B', width: 18 },      // Motorista (coluna extra)
    { key: 'C', width: 25.13 },   // Quem Recebe (original Col B)
    { key: 'D', width: 40.75 },   // Descrição / Carros (original Col C)
    { key: 'E', width: 13.88 },   // Valor (original Col D)
    { key: 'F', width: 1.75 },    // Separador
    { key: 'G', width: 20.75 },   // Gabriel Summary label (original Col F)
    { key: 'H', width: 20.75 },   // Gabriel Summary valor (original Col G)
    { key: 'I', width: 1.75 },    // Separador
    { key: 'J', width: 20.75 },   // Daniel Summary label (original Col I)
    { key: 'K', width: 20.75 },   // Daniel Summary valor (original Col J)
    { key: 'L', width: 1.75 },    // Separador
    { key: 'M', width: 33.88 },   // Total label (original Col L)
    { key: 'N', width: 17 },      // Total valor (original Col M)
  ];

  // ============ ROW 1: HEADER ============
  const headerRow = ws.getRow(1);

  // Colunas A-E: headers principais
  const mainHeaders = ['Data', 'Motorista', 'Quem Recebe', 'Carros/Clientes/Serviços/Gastos', 'Valores'];
  mainHeaders.forEach((text, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = text;
    cell.font = FONT_HEADER_BOLD;
    cell.fill = FILL_HEADER_BLUE;
    cell.border = BORDER_THIN;
    cell.alignment = ALIGN_CENTER;
  });

  // Col G-H: Gabriel header
  const headerG = headerRow.getCell(7);
  headerG.value = 'Total Gabriel:';
  headerG.font = FONT_HEADER_BOLD;
  headerG.fill = FILL_HEADER_BLUE;
  headerG.border = BORDER_THIN;
  headerG.alignment = ALIGN_CENTER;

  const headerH = headerRow.getCell(8);
  headerH.value = 'Valores';
  headerH.font = FONT_HEADER_BOLD;
  headerH.fill = FILL_HEADER_GREEN;
  headerH.border = BORDER_THIN;
  headerH.alignment = ALIGN_CENTER;

  // Col J-K: Daniel header
  const headerJ = headerRow.getCell(10);
  headerJ.value = 'Total Daniel:';
  headerJ.font = FONT_HEADER_BOLD;
  headerJ.fill = FILL_HEADER_BLUE;
  headerJ.border = BORDER_THIN;
  headerJ.alignment = ALIGN_CENTER;

  const headerK = headerRow.getCell(11);
  headerK.value = 'Valores';
  headerK.font = FONT_HEADER_BOLD;
  headerK.fill = FILL_HEADER_GREEN;
  headerK.border = BORDER_THIN;
  headerK.alignment = ALIGN_CENTER;

  // Col M-N: Total geral
  const headerM = headerRow.getCell(13);
  headerM.value = 'Valor total (somando e descontando saídas):';
  headerM.font = FONT_HEADER_BOLD;
  headerM.fill = FILL_HEADER_BLUE;
  headerM.border = BORDER_THIN;
  headerM.alignment = ALIGN_RIGHT;

  const headerN = headerRow.getCell(14);
  headerN.value = { formula: '=SUBTOTAL(109, E2:E1000)' };
  headerN.font = FONT_BOLD;
  headerN.fill = FILL_HEADER_GREEN;
  headerN.border = BORDER_THIN;
  headerN.alignment = ALIGN_RIGHT;
  headerN.numFmt = '#,##0;[Red]-#,##0';

  // ============ DATA ROWS & SUMMARY GENERATION ============
  const faturadosArray = Object.keys(faturadosPorSeg);
  const recebidosArray = Object.keys(recebidosPorSeg);

  const BORDER_RIGHT_THIN = {
    right: { style: 'thin' as const, color: { argb: COLORS.black } },
  };

  const maxRows = Math.max(linhas.length + 1, 23);

  for (let r = 2; r <= maxRows; r++) {
    const row = ws.getRow(r);

    // 1. Escrever lançamentos (Colunas A-E)
    if (r - 2 < linhas.length) {
      const l = linhas[r - 2];
      const isNegative = l.valor < 0;

      const cellA = row.getCell(1);
      cellA.value = l.date;
      cellA.numFmt = 'DD/MM/YYYY';
      cellA.font = FONT_DEFAULT;
      cellA.alignment = ALIGN_CENTER;

      const cellB = row.getCell(2);
      cellB.value = l.motorista;
      cellB.font = FONT_DEFAULT;

      const cellC = row.getCell(3);
      cellC.value = l.quemRecebe;
      cellC.font = FONT_DEFAULT;

      const cellD = row.getCell(4);
      cellD.value = l.descricao;
      cellD.font = FONT_DEFAULT;

      const cellE = row.getCell(5);
      cellE.value = l.valor;
      cellE.numFmt = '#,##0;[Red]-#,##0';
      cellE.font = isNegative ? FONT_RED : FONT_DEFAULT;
      cellE.alignment = ALIGN_RIGHT;
      cellE.border = BORDER_RIGHT_THIN;
    } else {
      // Manter a linha vertical da tabela estendida até o fim
      row.getCell(5).border = BORDER_RIGHT_THIN;
    }

    // 2. Resumo Gabriel (Colunas G-H)
    if (r === 2) {
      const cellG = row.getCell(7);
      cellG.value = 'Gabriel';
      cellG.font = FONT_DEFAULT;
      cellG.border = BORDER_THIN;

      const cellH = row.getCell(8);
      cellH.value = { formula: '=SUMIF($C:$C, G2, $E:$E)' };
      cellH.font = FONT_DEFAULT;
      cellH.border = BORDER_THIN;
      cellH.alignment = ALIGN_RIGHT;
      cellH.numFmt = '#,##0;[Red]-#,##0';
    } else if (r === 3) {
      const cellG = row.getCell(7);
      cellG.value = 'Gabriel SA';
      cellG.font = FONT_DEFAULT;
      cellG.border = BORDER_THIN;

      const cellH = row.getCell(8);
      cellH.value = { formula: '=SUMIF($C:$C, G3, $E:$E)' };
      cellH.font = FONT_RED;
      cellH.border = BORDER_THIN;
      cellH.alignment = ALIGN_RIGHT;
      cellH.numFmt = '#,##0;[Red]-#,##0';
    } else if (r === 5) {
      const cellG = row.getCell(7);
      cellG.value = 'Google';
      cellG.font = FONT_DEFAULT;
      cellG.border = BORDER_THIN;

      const cellH = row.getCell(8);
      cellH.value = { formula: '=SUMIF($D:$D, G5, $E:$E)' };
      cellH.font = FONT_RED;
      cellH.border = BORDER_THIN;
      cellH.alignment = ALIGN_RIGHT;
      cellH.numFmt = '#,##0;[Red]-#,##0';
    } else if (r === 6) {
      const cellG = row.getCell(7);
      cellG.value = 'Diesel Farid';
      cellG.font = FONT_DEFAULT;
      cellG.border = BORDER_THIN;

      const cellH = row.getCell(8);
      cellH.value = { formula: '=SUMIFS($E:$E, $C:$C, "Gabriel SA", $D:$D, "Diesel")' };
      cellH.font = FONT_RED;
      cellH.border = BORDER_THIN;
      cellH.alignment = ALIGN_RIGHT;
      cellH.numFmt = '#,##0;[Red]-#,##0';
    }

    // 3. Resumo Daniel (Colunas J-K)
    if (r === 2) {
      const cellJ = row.getCell(10);
      cellJ.value = 'Daniel';
      cellJ.font = FONT_DEFAULT;
      cellJ.border = BORDER_THIN;

      const cellK = row.getCell(11);
      cellK.value = { formula: '=SUMIF($C:$C, J2, $E:$E)' };
      cellK.font = FONT_DEFAULT;
      cellK.border = BORDER_THIN;
      cellK.alignment = ALIGN_RIGHT;
      cellK.numFmt = '#,##0;[Red]-#,##0';
    } else if (r === 3) {
      const cellJ = row.getCell(10);
      cellJ.value = 'Daniel SA';
      cellJ.font = FONT_DEFAULT;
      cellJ.border = BORDER_THIN;

      const cellK = row.getCell(11);
      cellK.value = { formula: '=SUMIF($C:$C, J3, $E:$E)' };
      cellK.font = FONT_RED;
      cellK.border = BORDER_THIN;
      cellK.alignment = ALIGN_RIGHT;
      cellK.numFmt = '#,##0;[Red]-#,##0';
    } else if (r === 5) {
      const cellJ = row.getCell(10);
      cellJ.value = 'Diesel Dani';
      cellJ.font = FONT_DEFAULT;
      cellJ.border = BORDER_THIN;

      const cellK = row.getCell(11);
      cellK.value = { formula: '=SUMIFS($E:$E, $C:$C, "Daniel SA", $D:$D, "Diesel")' };
      cellK.font = FONT_RED;
      cellK.border = BORDER_THIN;
      cellK.alignment = ALIGN_RIGHT;
      cellK.numFmt = '#,##0;[Red]-#,##0';
    }

    // 4. Faturados & Recebidos headers e tabelas (Rows 10-22)
    if (r === 10) {
      // Gabriel Faturados Header
      const cellG = row.getCell(7);
      cellG.value = 'Faturados/ A receber';
      cellG.font = FONT_BOLD;
      cellG.fill = FILL_HEADER_BLUE;
      cellG.border = BORDER_THIN;
      cellG.alignment = ALIGN_CENTER;

      const cellH = row.getCell(8);
      cellH.value = 'Valores';
      cellH.font = FONT_BOLD;
      cellH.fill = FILL_HEADER_GREEN;
      cellH.border = BORDER_THIN;
      cellH.alignment = ALIGN_CENTER;

      // Daniel Recebidos Header
      const cellJ = row.getCell(10);
      cellJ.value = 'Faturados recebidos';
      cellJ.font = FONT_BOLD;
      cellJ.fill = FILL_HEADER_BLUE;
      cellJ.border = BORDER_THIN;
      cellJ.alignment = ALIGN_CENTER;

      const cellK = row.getCell(11);
      cellK.value = 'Valores';
      cellK.font = FONT_BOLD;
      cellK.fill = FILL_HEADER_GREEN;
      cellK.border = BORDER_THIN;
      cellK.alignment = ALIGN_CENTER;
    } else if (r >= 11 && r <= 22) {
      const idx = r - 11;

      // Gabriel Faturados (Col G-H)
      const cellG = row.getCell(7);
      const cellH = row.getCell(8);
      cellG.font = FONT_DEFAULT;
      cellG.border = BORDER_THIN;
      cellH.font = FONT_DEFAULT;
      cellH.border = BORDER_THIN;
      cellH.alignment = ALIGN_RIGHT;
      cellH.numFmt = '#,##0;[Red]-#,##0';

      if (idx < faturadosArray.length) {
        cellG.value = `Faturado ${faturadosArray[idx]}`;
        cellH.value = { formula: `=SUMIF($C:$C, G${r}, $E:$E)` };
      } else {
        cellG.value = '';
        cellH.value = '';
      }

      // Daniel Recebidos (Col J-K)
      const cellJ = row.getCell(10);
      const cellK = row.getCell(11);
      cellJ.font = FONT_DEFAULT;
      cellJ.border = BORDER_THIN;
      cellK.font = FONT_DEFAULT;
      cellK.border = BORDER_THIN;
      cellK.alignment = ALIGN_RIGHT;
      cellK.numFmt = '#,##0;[Red]-#,##0';

      if (idx < recebidosArray.length) {
        cellJ.value = `Fat Recebida ${recebidosArray[idx]}`;
        cellK.value = { formula: `=SUMIF($C:$C, J${r}, $E:$E)` };
      } else {
        cellJ.value = '';
        cellK.value = '';
      }
    } else if (r === 23) {
      // Gabriel Faturados Total (Col G-H)
      const cellG = row.getCell(7);
      cellG.value = 'A receber de fatura';
      cellG.font = FONT_BOLD;
      cellG.fill = FILL_HEADER_BLUE;
      cellG.border = BORDER_THIN;

      const cellH = row.getCell(8);
      cellH.value = { formula: '=SUM(H11:H22)' };
      cellH.font = FONT_BOLD;
      cellH.fill = FILL_HEADER_GREEN;
      cellH.border = BORDER_THIN;
      cellH.alignment = ALIGN_RIGHT;
      cellH.numFmt = '#,##0;[Red]-#,##0';

      // Daniel Recebidos Total (Col J-K)
      const cellJ = row.getCell(10);
      cellJ.value = 'Faturas recebidas no mês';
      cellJ.font = FONT_BOLD;
      cellJ.fill = FILL_HEADER_BLUE;
      cellJ.border = BORDER_THIN;

      const cellK = row.getCell(11);
      cellK.value = { formula: '=SUM(K11:K22)' };
      cellK.font = FONT_BOLD;
      cellK.fill = FILL_HEADER_GREEN;
      cellK.border = BORDER_THIN;
      cellK.alignment = ALIGN_RIGHT;
      cellK.numFmt = '#,##0;[Red]-#,##0';
    }
  }

  // Gerar buffer
  const buffer = await wb.xlsx.writeBuffer();

  return new Response(Buffer.from(buffer as ArrayBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Relatorio_${sheetName}.xlsx"`,
    },
  });
};
