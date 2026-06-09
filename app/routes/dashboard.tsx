import { useState, useRef } from 'react';
import { useLoaderData, Link, useFetcher } from 'react-router';
import { requireAdmin } from '~/services/session.server';
import { getServicos } from '~/services/servicos.server';
import { getDespesas } from '~/services/despesas.server';
import { getFuncionarios } from '~/services/funcionarios.server';
import { getSeguradorasAtivas } from '~/services/seguradoras.server';
import type { Route } from './+types/dashboard';

export const meta = () => [{ title: 'Painel Financeiro — GuinchoFácil' }];

export const loader = async ({ request }: Route.LoaderArgs) => {
  await requireAdmin(request);
  const [servicos, despesas, funcionarios, seguradoras] = await Promise.all([
    getServicos(),
    getDespesas(),
    getFuncionarios(),
    getSeguradorasAtivas(),
  ]);
  return { servicos, despesas, funcionarios, seguradoras };
};

export const action = async ({ request }: Route.ActionArgs) => {
  await requireAdmin(request);
  const formData = await request.formData();
  const intent = formData.get('intent') as string;

  // ── MARCAR FATURADO RECEBIDO ──────────────────────────────────────────────
  if (intent === 'marcar-recebido') {
    const servicoId = formData.get('servicoId') as string;
    if (!servicoId) return { ok: false as const, error: 'ID inválido.' };
    const { marcarFaturadoRecebido } = await import('~/services/servicos.server');
    const result = await marcarFaturadoRecebido(servicoId);
    if (!result.ok) return { ok: false as const, error: 'Erro ao marcar como recebido.' };
    return { ok: true as const };
  }

  // ── EDITAR SERVIÇO ────────────────────────────────────────────────────────
  if (intent === 'edit-servico') {
    const servicoId = formData.get('servicoId') as string;
    if (!servicoId) return { ok: false as const, error: 'ID inválido.' };
    const campo = formData.get('campo') as string;
    const valor = formData.get('valor') as string;
    if (!campo || valor === null || valor === undefined)
      return { ok: false as const, error: 'Dados inválidos.' };

    const { updateServico } = await import('~/services/servicos.server');
    const { adminDb } = await import('~/services/firebaseAdmin.server');
    const { Timestamp } = await import('firebase-admin/firestore');

    let camposUpdate: Record<string, any> = {};

    if (campo === 'valorCobrado') {
      camposUpdate.valorCobrado = Number(valor);
    } else if (campo === 'detalhesVeiculo') {
      camposUpdate.detalhesVeiculo = valor;
    } else if (campo === 'quemRecebeUid') {
      // Atualiza quem recebe: busca o nome do funcionário pelo uid
      if (!valor) {
        camposUpdate.receiver = '';
        camposUpdate.quemRecebeUid = '';
        camposUpdate.tipoRecebedor = 'nenhum';
      } else {
        const receptorDoc = await adminDb.collection('funcionarios').doc(valor).get();
        const receptorNome = (receptorDoc.data() as any)?.nome ?? valor;
        camposUpdate.receiver = receptorNome;
        camposUpdate.quemRecebeUid = valor;
        camposUpdate.tipoRecebedor = 'motorista';
      }
    } else if (campo === 'finalizedAt') {
      // Converte string YYYY-MM-DD para Timestamp do Firestore
      camposUpdate.finalizedAt = Timestamp.fromDate(new Date(valor + 'T12:00:00'));
    } else if (campo === 'motoristaUid') {
      // Atualiza uid E busca o nome correspondente
      const motoristaDoc = await adminDb.collection('funcionarios').doc(valor).get();
      const motoristaNome = (motoristaDoc.data() as any)?.nome ?? valor;
      camposUpdate.motoristaUid = valor;
      camposUpdate.motoristaNome = motoristaNome;
    } else {
      camposUpdate[campo] = valor;
    }

    const result = await updateServico(servicoId, camposUpdate);
    if (!result.ok) return { ok: false as const, error: 'Erro ao atualizar serviço.' };
    return { ok: true as const };
  }

  // ── EXCLUIR SERVIÇO ───────────────────────────────────────────────────────
  if (intent === 'delete-servico') {
    const servicoId = formData.get('servicoId') as string;
    if (!servicoId) return { ok: false as const, error: 'ID inválido.' };
    const { deleteServico } = await import('~/services/servicos.server');
    const result = await deleteServico(servicoId);
    if (!result.ok) return { ok: false as const, error: 'Erro ao excluir serviço.' };
    return { ok: true as const };
  }

  // ── EDITAR DESPESA ────────────────────────────────────────────────────────
  if (intent === 'edit-despesa') {
    const despesaId = formData.get('despesaId') as string;
    if (!despesaId) return { ok: false as const, error: 'ID inválido.' };
    const campo = formData.get('campo') as string;
    const valor = formData.get('valor') as string;
    if (!campo || valor === null || valor === undefined)
      return { ok: false as const, error: 'Dados inválidos.' };

    const { updateDespesa } = await import('~/services/despesas.server');

    let valorConvertido: any = valor;
    if (campo === 'valorTotal') valorConvertido = parseFloat(valor);
    if (campo === 'parcelas') valorConvertido = parseInt(valor, 10);

    const result = await updateDespesa(despesaId, { [campo]: valorConvertido } as any);
    if (!result.ok) return { ok: false as const, error: 'Erro ao atualizar despesa.' };
    return { ok: true as const };
  }

  // ── EXCLUIR DESPESA ───────────────────────────────────────────────────────
  if (intent === 'delete-despesa') {
    const despesaId = formData.get('despesaId') as string;
    if (!despesaId) return { ok: false as const, error: 'ID inválido.' };
    const { deleteDespesa } = await import('~/services/despesas.server');
    const result = await deleteDespesa(despesaId);
    if (!result.ok) return { ok: false as const, error: 'Erro ao excluir despesa.' };
    return { ok: true as const };
  }

  return { ok: false as const, error: 'Ação desconhecida.' };
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILITÁRIOS
// ─────────────────────────────────────────────────────────────────────────────

const getJsDate = (ts: any): Date | null => {
  if (!ts) return null;
  if (typeof ts.toDate === 'function') return ts.toDate();
  if (ts.seconds) return new Date(ts.seconds * 1000);
  if (ts._seconds) return new Date(ts._seconds * 1000);
  return new Date(ts);
};

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const caminhaoNomeMap: Record<string, string> = {
  A: 'Caminhão A',
  B: 'Caminhão B',
  C: 'Caminhão C',
};

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

type LinhaRelatorio = {
  date: Date;
  motorista: string;
  motoristaUid?: string;
  quemRecebe: string;
  descricao: string;
  valor: number;
  tipo: 'receita' | 'despesa' | 'faturado' | 'faturado-recebido' | 'cancelado';
  servicoId?: string;
  despesaId?: string;
  faturadoStatus?: string;
  rawValorCobrado?: number;
  rawDataISO?: string;
  rawMotoristaUid?: string;
  rawQuemRecebeUid?: string;
  rawCaminhao?: string;
};

type DeleteTarget = {
  id: string;
  tipo: 'servico' | 'despesa';
  descricao: string;
  valor: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// ESTILOS COMPARTILHADOS
// ─────────────────────────────────────────────────────────────────────────────

const inlineInputStyle: React.CSSProperties = {
  background: 'hsl(220 16% 20%)',
  color: 'hsl(0 0% 95%)',
  border: '1.5px solid hsl(217 91% 60%)',
  borderRadius: '6px',
  padding: '4px 8px',
  fontSize: '0.8rem',
  width: '100%',
  outline: 'none',
  boxShadow: '0 0 0 3px hsl(217 91% 60% / 0.2)',
};

const inlineSelectStyle: React.CSSProperties = {
  ...inlineInputStyle,
  padding: '3px 6px',
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { servicos, despesas, funcionarios, seguradoras } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  const hoje = new Date();
  const [mesSelecionado, setMesSelecionado] = useState(hoje.getMonth());
  const [anoSelecionado, setAnoSelecionado] = useState(hoje.getFullYear());

  // Estado de edição inline
  const [editingCell, setEditingCell] = useState<{ rowKey: string; field: string } | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [originalValue, setOriginalValue] = useState<string>('');

  // Estado do modal de confirmação de exclusão
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);

  const nomesMeses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  const navegarMes = (delta: number) => {
    let novoMes = mesSelecionado + delta;
    let novoAno = anoSelecionado;
    if (novoMes < 0) { novoMes = 11; novoAno--; }
    if (novoMes > 11) { novoMes = 0; novoAno++; }
    setMesSelecionado(novoMes);
    setAnoSelecionado(novoAno);
  };

  // ── Helpers de edição ──────────────────────────────────────────────────────

  /** Verifica se uma célula específica está em modo de edição */
  const isCellActive = (rowKey: string, field: string) =>
    editingCell?.rowKey === rowKey && editingCell?.field === field;

  const activateEdit = (rowKey: string, field: string, currentValue: string) => {
    setEditingCell({ rowKey, field });
    setEditingValue(currentValue);
    setOriginalValue(currentValue);
    // Foca o input/select após o render
    setTimeout(() => {
      inputRef.current?.focus();
      selectRef.current?.focus();
    }, 50);
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditingValue('');
    setOriginalValue('');
  };

  const commitEdit = (linha: LinhaRelatorio, field: string) => {
    if (editingValue.trim() === originalValue.trim()) {
      cancelEdit();
      return;
    }
    const fd = new FormData();
    if (linha.servicoId) {
      fd.append('intent', 'edit-servico');
      fd.append('servicoId', linha.servicoId);
    } else if (linha.despesaId) {
      fd.append('intent', 'edit-despesa');
      fd.append('despesaId', linha.despesaId);
    } else {
      cancelEdit();
      return;
    }
    fd.append('campo', field);
    fd.append('valor', editingValue);
    fetcher.submit(fd, { method: 'post' });
    cancelEdit();
  };

  const handleKeyDown = (e: React.KeyboardEvent, linha: LinhaRelatorio, field: string) => {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit(linha, field); }
    if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
  };

  // ── Handler de exclusão ────────────────────────────────────────────────────

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const fd = new FormData();
    if (deleteTarget.tipo === 'servico') {
      fd.append('intent', 'delete-servico');
      fd.append('servicoId', deleteTarget.id);
    } else {
      fd.append('intent', 'delete-despesa');
      fd.append('despesaId', deleteTarget.id);
    }
    fetcher.submit(fd, { method: 'post' });
    setDeleteTarget(null);
  };

  // ── Estilo para célula editável (indica ao toque que é clicável) ───────────
  const editableTd = (isEditable: boolean): React.CSSProperties => ({
    cursor: isEditable ? 'pointer' : 'default',
    userSelect: 'none',
  });

  // ── MONTAR LINHAS ──────────────────────────────────────────────────────────

  const linhas: LinhaRelatorio[] = [];

  servicos.forEach((s) => {
    const sDate = getJsDate(s.finalizedAt || s.createdAt);
    if (!sDate) return;
    const tipo = (s as any).tipoRecebedor || 'motorista';

    if (s.status === 'cancelado') {
      if (sDate.getMonth() === mesSelecionado && sDate.getFullYear() === anoSelecionado) {
        linhas.push({
          date: sDate,
          motorista: s.motoristaNome || '—',
          motoristaUid: s.motoristaUid,
          quemRecebe: s.receiver || '—',
          descricao: `[CANCELADO] ${s.detalhesVeiculo || s.placaVeiculo || 'Serviço'}`,
          valor: s.valorCobrado,
          tipo: 'cancelado',
          servicoId: s.id,
          rawValorCobrado: s.valorCobrado,
          rawDataISO: sDate.toISOString().substring(0, 10),
          rawMotoristaUid: s.motoristaUid,
          rawQuemRecebeUid: s.quemRecebeUid ?? '',
        });
      }
      return;
    }

    if (tipo === 'seguradora') {
      const fStatus = (s as any).faturadoStatus || 'pendente';
      const segNome = (s as any).seguradoraNome || s.receiver || 'Seguradora';

      if (sDate.getMonth() === mesSelecionado && sDate.getFullYear() === anoSelecionado) {
        linhas.push({
          date: sDate,
          motorista: s.motoristaNome || '—',
          motoristaUid: s.motoristaUid,
          quemRecebe: `Faturado ${segNome}`,
          descricao: s.detalhesVeiculo || s.placaVeiculo || 'Serviço',
          valor: s.valorCobrado,
          tipo: 'faturado',
          servicoId: s.id,
          faturadoStatus: fStatus,
          rawValorCobrado: s.valorCobrado,
          rawDataISO: sDate.toISOString().substring(0, 10),
          rawMotoristaUid: s.motoristaUid,
        });
      }

      if (fStatus === 'recebido') {
        const recebidoEm = getJsDate((s as any).faturadoRecebidoEm);
        if (recebidoEm && recebidoEm.getMonth() === mesSelecionado && recebidoEm.getFullYear() === anoSelecionado) {
          linhas.push({
            date: recebidoEm,
            motorista: s.motoristaNome || '—',
            quemRecebe: `Fat Recebida ${segNome}`,
            descricao: `Pgto fatura — ${s.detalhesVeiculo || s.placaVeiculo || 'Serviço'}`,
            valor: s.valorCobrado,
            tipo: 'faturado-recebido',
            // faturado-recebido é apenas visualização — sem edição
          });
        }
      }
    } else {
      if (sDate.getMonth() === mesSelecionado && sDate.getFullYear() === anoSelecionado) {
        linhas.push({
          date: sDate,
          motorista: s.motoristaNome || '—',
          motoristaUid: s.motoristaUid,
          quemRecebe: s.receiver || '—',
          descricao: s.detalhesVeiculo || s.placaVeiculo || 'Serviço',
          valor: s.valorCobrado,
          tipo: 'receita',
          servicoId: s.id,
          rawValorCobrado: s.valorCobrado,
          rawDataISO: sDate.toISOString().substring(0, 10),
          rawMotoristaUid: s.motoristaUid,
          rawQuemRecebeUid: s.quemRecebeUid ?? '',
        });
      }
    }
  });

  despesas.forEach((d) => {
    const baseDate = new Date(d.dataPagamento + 'T12:00:00');
    for (let i = 0; i < d.parcelas; i++) {
      const dParcela = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, baseDate.getDate());
      if (dParcela.getMonth() === mesSelecionado && dParcela.getFullYear() === anoSelecionado) {
        const parcInfo = d.parcelas > 1 ? ` (${i + 1}/${d.parcelas})` : '';
        linhas.push({
          date: dParcela,
          motorista: '—',
          quemRecebe: `${caminhaoNomeMap[d.caminhao] || d.caminhao} SA`,
          descricao: `${d.descricao}${parcInfo}`,
          valor: -d.valorParcela,
          tipo: 'despesa',
          despesaId: d.id,
          rawDataISO: d.dataPagamento,
          rawCaminhao: d.caminhao,
        });
      }
    }
  });

  linhas.sort((a, b) => a.date.getTime() - b.date.getTime());

  // ── CÁLCULOS ───────────────────────────────────────────────────────────────

  const receitasPorMotorista: Record<string, number> = {};
  const despesasPorCaminhao: Record<string, number> = {};

  linhas.forEach((l) => {
    if (l.tipo === 'receita') {
      receitasPorMotorista[l.motorista] = (receitasPorMotorista[l.motorista] || 0) + l.valor;
    }
    if (l.tipo === 'despesa') {
      const cam = l.quemRecebe.replace(' SA', '');
      despesasPorCaminhao[cam] = (despesasPorCaminhao[cam] || 0) + Math.abs(l.valor);
    }
  });

  const totalReceitas = linhas.filter((l) => l.tipo === 'receita' || l.tipo === 'faturado-recebido').reduce((s, l) => s + l.valor, 0);
  const totalDespesas = linhas.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + Math.abs(l.valor), 0);
  const totalFaturadosPendentes = linhas.filter((l) => l.tipo === 'faturado' && l.faturadoStatus === 'pendente').reduce((s, l) => s + l.valor, 0);
  const totalFaturadosRecebidos = linhas.filter((l) => l.tipo === 'faturado-recebido').reduce((s, l) => s + l.valor, 0);
  const saldoLiquido = totalReceitas - totalDespesas;

  const faturadosPorSeguradora: Record<string, { valor: number; itens: LinhaRelatorio[] }> = {};
  linhas.filter((l) => l.tipo === 'faturado' && l.faturadoStatus === 'pendente').forEach((l) => {
    const segNome = l.quemRecebe.replace('Faturado ', '');
    if (!faturadosPorSeguradora[segNome]) faturadosPorSeguradora[segNome] = { valor: 0, itens: [] };
    faturadosPorSeguradora[segNome].valor += l.valor;
    faturadosPorSeguradora[segNome].itens.push(l);
  });

  const recebidosPorSeguradora: Record<string, number> = {};
  linhas.filter((l) => l.tipo === 'faturado-recebido').forEach((l) => {
    const segNome = l.quemRecebe.replace('Fat Recebida ', '');
    recebidosPorSeguradora[segNome] = (recebidosPorSeguradora[segNome] || 0) + l.valor;
  });

  // ── RENDER ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-vh-100 py-4 px-3"
      style={{
        background: 'linear-gradient(160deg, hsl(220 20% 5%) 0%, hsl(230 22% 11%) 50%, hsl(260 18% 9%) 100%)',
        color: 'hsl(0 0% 95%)',
      }}
    >
      <div className="container-fluid" style={{ maxWidth: '1400px' }}>

        {/* Header */}
        <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between mb-4 gap-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <Link to="/" className="btn btn-outline-light btn-sm rounded-pill px-3">
                <i className="bi bi-arrow-left me-1"></i> Painel Inicial
              </Link>
            </div>
            <h1 className="h2 fw-bold text-white mb-0">Relatórios Financeiros</h1>
            <p className="text-secondary small mb-0">Toque em qualquer célula para editar • 🗑️ para excluir</p>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button onClick={() => navegarMes(-1)} className="btn btn-dark btn-sm rounded-circle border border-secondary d-flex align-items-center justify-content-center" style={{ width: 36, height: 36 }}>
              <i className="bi bi-chevron-left" />
            </button>
            <div className="px-4 py-2 rounded-3 border border-secondary fw-bold text-center" style={{ background: 'hsl(220 16% 13%)', minWidth: '180px' }}>
              {nomesMeses[mesSelecionado]} {anoSelecionado}
            </div>
            <button onClick={() => navegarMes(1)} className="btn btn-dark btn-sm rounded-circle border border-secondary d-flex align-items-center justify-content-center" style={{ width: 36, height: 36 }}>
              <i className="bi bi-chevron-right" />
            </button>
            <a
              href={`/api/download-relatorio?mes=${mesSelecionado + 1}&ano=${anoSelecionado}`}
              className="btn btn-sm rounded-pill px-3 fw-bold ms-2"
              style={{ background: 'linear-gradient(135deg, hsl(142 71% 40%), hsl(160 60% 35%))', color: '#fff', border: 'none' }}
            >
              <i className="bi bi-file-earmark-excel me-1" /> Baixar Excel
            </a>
          </div>
        </div>

        {/* Cards de Métricas */}
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-4 col-lg-2">
            <div className="gf-metric-card metric-success p-3">
              <span style={{ color: 'hsl(220 10% 55%)' }} className="fw-semibold small d-block mb-1">Total Receitas</span>
              <h4 className="h5 fw-bold mb-0" style={{ color: 'hsl(142 71% 50%)' }}>{fmt(totalReceitas)}</h4>
            </div>
          </div>
          <div className="col-6 col-md-4 col-lg-2">
            <div className="gf-metric-card metric-danger p-3">
              <span style={{ color: 'hsl(220 10% 55%)' }} className="fw-semibold small d-block mb-1">Total Despesas</span>
              <h4 className="h5 fw-bold mb-0" style={{ color: 'hsl(0 84% 60%)' }}>{fmt(totalDespesas)}</h4>
            </div>
          </div>
          <div className="col-6 col-md-4 col-lg-2">
            <div className="gf-metric-card metric-primary p-3">
              <span style={{ color: 'hsl(220 10% 55%)' }} className="fw-semibold small d-block mb-1">Saldo Líquido</span>
              <h4 className="h5 fw-bold mb-0" style={{ color: saldoLiquido >= 0 ? 'hsl(217 91% 60%)' : 'hsl(38 92% 50%)' }}>{fmt(saldoLiquido)}</h4>
            </div>
          </div>
          <div className="col-6 col-md-4 col-lg-2">
            <div className="gf-metric-card p-3" style={{ borderLeft: '3px solid hsl(38 92% 50%)' }}>
              <span style={{ color: 'hsl(220 10% 55%)' }} className="fw-semibold small d-block mb-1">Faturados Pendentes</span>
              <h4 className="h5 fw-bold mb-0" style={{ color: 'hsl(38 92% 50%)' }}>{fmt(totalFaturadosPendentes)}</h4>
            </div>
          </div>
          <div className="col-6 col-md-4 col-lg-2">
            <div className="gf-metric-card p-3" style={{ borderLeft: '3px solid hsl(270 60% 55%)' }}>
              <span style={{ color: 'hsl(220 10% 55%)' }} className="fw-semibold small d-block mb-1">Fat. Recebidos</span>
              <h4 className="h5 fw-bold mb-0" style={{ color: 'hsl(270 60% 55%)' }}>{fmt(totalFaturadosRecebidos)}</h4>
            </div>
          </div>
          <div className="col-6 col-md-4 col-lg-2">
            <div className="gf-metric-card metric-info p-3">
              <span style={{ color: 'hsl(220 10% 55%)' }} className="fw-semibold small d-block mb-1">Guinchos</span>
              <h4 className="h5 fw-bold mb-0" style={{ color: 'hsl(199 89% 55%)' }}>
                {linhas.filter((l) => l.tipo === 'receita' || l.tipo === 'faturado').length}
              </h4>
            </div>
          </div>
        </div>

        {/* Resumo por Motorista / Caminhão */}
        <div className="row g-3 mb-4">
          {Object.entries(receitasPorMotorista).map(([nome, valor]) => (
            <div key={nome} className="col-6 col-md-3">
              <div className="p-3 rounded-3 border border-secondary" style={{ background: 'hsl(220 16% 13%)' }}>
                <div className="d-flex align-items-center gap-2 mb-1">
                  <i className="bi bi-person-fill text-success" />
                  <span className="fw-bold text-light small">{nome}</span>
                </div>
                <span className="text-success fw-bold font-mono">{fmt(valor)}</span>
              </div>
            </div>
          ))}
          {Object.entries(despesasPorCaminhao).map(([nome, valor]) => (
            <div key={nome} className="col-6 col-md-3">
              <div className="p-3 rounded-3 border border-secondary" style={{ background: 'hsl(220 16% 13%)' }}>
                <div className="d-flex align-items-center gap-2 mb-1">
                  <i className="bi bi-truck text-danger" />
                  <span className="fw-bold text-light small">{nome} SA</span>
                </div>
                <span className="text-danger fw-bold font-mono">-{fmt(valor)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── TABELA DETALHADA ─────────────────────────────────────────────── */}
        <div className="bg-black bg-opacity-50 border border-secondary rounded-3 p-3 shadow-sm mb-4">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <h3 className="h5 fw-bold m-0 text-light">
              <i className="bi bi-table me-2" />
              Lançamentos — {nomesMeses[mesSelecionado]} {anoSelecionado}
            </h3>
            <span className="badge bg-secondary rounded-pill">{linhas.length} registros</span>
          </div>
          <p className="text-secondary small mb-3" style={{ fontSize: '0.78rem' }}>
            Toque em qualquer célula para editar diretamente.
          </p>

          <div className="table-responsive">
            <table className="table table-dark table-hover table-borderless align-middle mb-0">
              <thead>
                <tr style={{ background: 'hsl(220 16% 18%)', borderBottom: '2px solid hsl(220 10% 30%)' }}>
                  <th className="small fw-bold text-secondary py-3" style={{ width: '90px' }}>Data</th>
                  <th className="small fw-bold text-secondary py-3" style={{ width: '120px' }}>Motorista</th>
                  <th className="small fw-bold text-secondary py-3" style={{ width: '170px' }}>Quem Recebe</th>
                  <th className="small fw-bold text-secondary py-3">Descrição</th>
                  <th className="small fw-bold text-secondary py-3 text-end" style={{ width: '120px' }}>Valor (R$)</th>
                  <th className="small fw-bold text-secondary py-3 text-center" style={{ width: '44px' }}>
                    <i className="bi bi-trash3" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {linhas.length > 0 ? (
                  linhas.map((l, idx) => {
                    // Chave única por linha
                    const rowKey = l.servicoId
                      ? `s-${l.servicoId}`
                      : l.despesaId
                      ? `d-${l.despesaId}-${idx}`
                      : `r-${idx}`;

                    // Apenas linhas com id de serviço ou despesa são editáveis
                    const isEditable = !!(l.servicoId || l.despesaId);

                    let rowStyle: React.CSSProperties = {};
                    let valorClass = '';
                    let valorPrefix = '';

                    if (l.tipo === 'receita' || l.tipo === 'faturado-recebido') {
                      valorClass = 'text-success';
                      valorPrefix = '+';
                    } else if (l.tipo === 'despesa') {
                      valorClass = 'text-danger';
                      rowStyle = { background: 'hsl(0 50% 10% / 0.2)' };
                    } else if (l.tipo === 'faturado') {
                      valorClass = 'text-warning';
                      rowStyle = { background: 'hsl(38 80% 15% / 0.15)' };
                    } else if (l.tipo === 'cancelado') {
                      valorClass = 'text-secondary text-decoration-line-through';
                      rowStyle = { background: 'hsl(0 0% 15% / 0.3)' };
                    }

                    // Campo de data correto dependendo do tipo
                    const dateField = l.servicoId ? 'finalizedAt' : 'dataPagamento';

                    return (
                      <tr key={rowKey} className="border-bottom border-secondary" style={rowStyle}>

                        {/* ── DATA ──────────────────────────────────────── */}
                        <td className="py-2" style={editableTd(isEditable)}>
                          {isCellActive(rowKey, 'data') ? (
                            <input
                              ref={inputRef}
                              type="date"
                              value={editingValue}
                              style={inlineInputStyle}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onBlur={() => {
                                // Submete com o campo correto (finalizedAt ou dataPagamento)
                                if (editingValue.trim() === originalValue.trim()) { cancelEdit(); return; }
                                const fd = new FormData();
                                if (l.servicoId) { fd.append('intent', 'edit-servico'); fd.append('servicoId', l.servicoId); }
                                else if (l.despesaId) { fd.append('intent', 'edit-despesa'); fd.append('despesaId', l.despesaId); }
                                fd.append('campo', dateField);
                                fd.append('valor', editingValue);
                                fetcher.submit(fd, { method: 'post' });
                                cancelEdit();
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (editingValue.trim() !== originalValue.trim()) {
                                    const fd = new FormData();
                                    if (l.servicoId) { fd.append('intent', 'edit-servico'); fd.append('servicoId', l.servicoId); }
                                    else if (l.despesaId) { fd.append('intent', 'edit-despesa'); fd.append('despesaId', l.despesaId); }
                                    fd.append('campo', dateField);
                                    fd.append('valor', editingValue);
                                    fetcher.submit(fd, { method: 'post' });
                                  }
                                  cancelEdit();
                                }
                                if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
                              }}
                            />
                          ) : (
                            <span
                              className="text-secondary small"
                              onClick={() => isEditable && activateEdit(rowKey, 'data', l.rawDataISO ?? '')}
                            >
                              {l.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                            </span>
                          )}
                        </td>

                        {/* ── MOTORISTA ─────────────────────────────────── */}
                        <td className="py-2" style={editableTd(isEditable && !!l.servicoId)}>
                          {isCellActive(rowKey, 'motoristaUid') ? (
                            <select
                              ref={selectRef}
                              value={editingValue}
                              style={inlineSelectStyle}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onBlur={() => commitEdit(l, 'motoristaUid')}
                              onKeyDown={(e) => handleKeyDown(e, l, 'motoristaUid')}
                            >
                              {funcionarios.map((f) => (
                                <option key={f.uid} value={f.uid}>{f.displayName}</option>
                              ))}
                            </select>
                          ) : (
                            <span
                              className="fw-semibold small text-light"
                              onClick={() => {
                                if (isEditable && l.servicoId) {
                                  activateEdit(rowKey, 'motoristaUid', l.rawMotoristaUid ?? '');
                                }
                              }}
                            >
                              {l.motorista}
                            </span>
                          )}
                        </td>

                        {/* ── QUEM RECEBE / CAMINHÃO ─────────────────────── */}
                        <td
                          className="py-2"
                          style={editableTd(
                            isEditable && (!!l.despesaId || l.tipo === 'receita')
                          )}
                        >
                          {l.tipo === 'despesa' ? (
                            // Despesa: seleciona caminhão
                            isCellActive(rowKey, 'caminhao') ? (
                              <select
                                ref={selectRef}
                                value={editingValue}
                                style={inlineSelectStyle}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onBlur={() => commitEdit(l, 'caminhao')}
                                onKeyDown={(e) => handleKeyDown(e, l, 'caminhao')}
                              >
                                <option value="A">Caminhão A</option>
                                <option value="B">Caminhão B</option>
                                <option value="C">Caminhão C</option>
                              </select>
                            ) : (
                              <span
                                className="small text-danger"
                                onClick={() => isEditable && activateEdit(rowKey, 'caminhao', l.rawCaminhao ?? '')}
                              >
                                <i className="bi bi-dash-circle text-danger me-1" style={{ fontSize: '0.75rem' }} />
                                {l.quemRecebe}
                              </span>
                            )
                          ) : l.tipo === 'receita' ? (
                            // Receita: seleciona quem recebe (funcionário)
                            isCellActive(rowKey, 'quemRecebeUid') ? (
                              <select
                                ref={selectRef}
                                value={editingValue}
                                style={inlineSelectStyle}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onBlur={() => commitEdit(l, 'quemRecebeUid')}
                                onKeyDown={(e) => handleKeyDown(e, l, 'quemRecebeUid')}
                              >
                                <option value="">— Nenhum —</option>
                                {funcionarios.map((f) => (
                                  <option key={f.uid} value={f.uid}>{f.displayName}</option>
                                ))}
                              </select>
                            ) : (
                              <span
                                className="small text-light"
                                onClick={() => activateEdit(rowKey, 'quemRecebeUid', l.rawQuemRecebeUid ?? '')}
                              >
                                {l.quemRecebe}
                              </span>
                            )
                          ) : (
                            // Faturado / Faturado-Recebido: apenas visualização
                            <span className={`small ${l.tipo === 'faturado' ? 'text-warning' : l.tipo === 'faturado-recebido' ? 'text-success' : 'text-light'}`}>
                              {l.tipo === 'faturado' && <i className="bi bi-clock-history text-warning me-1" style={{ fontSize: '0.75rem' }} />}
                              {l.tipo === 'faturado-recebido' && <i className="bi bi-check-circle-fill text-success me-1" style={{ fontSize: '0.75rem' }} />}
                              {l.quemRecebe}
                            </span>
                          )}
                        </td>

                        {/* ── DESCRIÇÃO ─────────────────────────────────── */}
                        <td className="py-2" style={editableTd(isEditable)}>
                          {isCellActive(rowKey, 'descricao') ? (
                            <input
                              ref={inputRef}
                              type="text"
                              value={editingValue}
                              style={inlineInputStyle}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onBlur={() => commitEdit(l, l.servicoId ? 'detalhesVeiculo' : 'descricao')}
                              onKeyDown={(e) => handleKeyDown(e, l, l.servicoId ? 'detalhesVeiculo' : 'descricao')}
                            />
                          ) : (
                            <span
                              className="small text-light"
                              onClick={() => isEditable && activateEdit(rowKey, 'descricao', l.descricao)}
                            >
                              {l.descricao}
                            </span>
                          )}
                        </td>

                        {/* ── VALOR ─────────────────────────────────────── */}
                        <td className="py-2 text-end" style={editableTd(isEditable)}>
                          {isCellActive(rowKey, 'valor') ? (
                            <input
                              ref={inputRef}
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={editingValue}
                              style={{ ...inlineInputStyle, textAlign: 'right' }}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onBlur={() => commitEdit(l, l.servicoId ? 'valorCobrado' : 'valorTotal')}
                              onKeyDown={(e) => handleKeyDown(e, l, l.servicoId ? 'valorCobrado' : 'valorTotal')}
                            />
                          ) : (
                            <span
                              className={`fw-bold font-mono small ${valorClass}`}
                              onClick={() => isEditable && activateEdit(rowKey, 'valor', String(Math.abs(l.valor)))}
                            >
                              {valorPrefix}{fmt(Math.abs(l.valor))}
                            </span>
                          )}
                        </td>

                        {/* ── EXCLUIR ───────────────────────────────────── */}
                        <td className="py-2 text-center">
                          {isEditable && (
                            <button
                              className="btn btn-link p-0"
                              style={{ color: 'hsl(0 84% 55%)', opacity: 0.7 }}
                              title="Excluir lançamento"
                              onClick={() =>
                                setDeleteTarget({
                                  id: (l.servicoId ?? l.despesaId) as string,
                                  tipo: l.servicoId ? 'servico' : 'despesa',
                                  descricao: l.descricao,
                                  valor: Math.abs(l.valor),
                                })
                              }
                            >
                              <i className="bi bi-trash3" style={{ fontSize: '0.95rem' }} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center text-secondary py-5">
                      <i className="bi bi-inbox" style={{ fontSize: '2rem' }} />
                      <p className="mt-2 mb-0">Nenhum lançamento neste mês.</p>
                    </td>
                  </tr>
                )}
              </tbody>
              {linhas.length > 0 && (
                <tfoot>
                  <tr style={{ background: 'hsl(220 16% 15%)', borderTop: '2px solid hsl(220 10% 30%)' }}>
                    <td colSpan={5} className="fw-bold text-light py-3">TOTAL DO MÊS</td>
                    <td className={`text-end fw-bold font-mono py-3 ${saldoLiquido >= 0 ? 'text-success' : 'text-danger'}`}>
                      {saldoLiquido >= 0 ? '+' : ''}{fmt(saldoLiquido)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Painéis de Faturados */}
        <div className="row g-4 mb-4">
          {/* Faturados Pendentes */}
          <div className="col-12 col-lg-6">
            <div className="bg-black bg-opacity-50 border border-secondary rounded-3 p-3 shadow-sm h-100">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h3 className="h6 fw-bold m-0 text-light">
                  <i className="bi bi-clock-history text-warning me-2" />
                  Faturados / A Receber
                </h3>
                <span className="badge rounded-pill" style={{ background: 'hsl(38 92% 50%)' }}>
                  {fmt(totalFaturadosPendentes)}
                </span>
              </div>
              {Object.keys(faturadosPorSeguradora).length > 0 ? (
                <div className="d-flex flex-column gap-2">
                  {Object.entries(faturadosPorSeguradora).map(([segNome, { valor, itens }]) => (
                    <div key={segNome} className="p-3 rounded-3 border border-secondary" style={{ background: 'hsl(220 16% 13%)' }}>
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <div className="d-flex align-items-center gap-2">
                          <i className="bi bi-shield-check text-warning" />
                          <span className="fw-bold text-light">Faturado {segNome}</span>
                        </div>
                        <span className="text-warning fw-bold font-mono">{fmt(valor)}</span>
                      </div>
                      {itens.map((item) => (
                        <div key={item.servicoId} className="d-flex align-items-center justify-content-between py-1 border-top border-secondary">
                          <div>
                            <small className="text-secondary">{item.date.toLocaleDateString('pt-BR')}</small>
                            <small className="text-light ms-2">{item.descricao}</small>
                            <small className="text-secondary ms-1">({item.motorista})</small>
                          </div>
                          <div className="d-flex align-items-center gap-2">
                            <small className="text-warning font-mono fw-bold">{fmt(item.valor)}</small>
                            <fetcher.Form method="post" className="d-inline">
                              <input type="hidden" name="intent" value="marcar-recebido" />
                              <input type="hidden" name="servicoId" value={item.servicoId} />
                              <button
                                type="submit"
                                className="btn btn-outline-success btn-sm rounded-pill px-2 py-0"
                                style={{ fontSize: '0.7rem' }}
                                disabled={fetcher.state !== 'idle'}
                                title="Marcar como recebido"
                              >
                                <i className="bi bi-check-lg" /> Recebido
                              </button>
                            </fetcher.Form>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-secondary py-4 mb-0">
                  <i className="bi bi-check-circle" style={{ fontSize: '1.5rem' }} />
                  <br />Sem faturados pendentes neste mês.
                </p>
              )}
            </div>
          </div>

          {/* Faturados Recebidos */}
          <div className="col-12 col-lg-6">
            <div className="bg-black bg-opacity-50 border border-secondary rounded-3 p-3 shadow-sm h-100">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h3 className="h6 fw-bold m-0 text-light">
                  <i className="bi bi-check-circle-fill text-success me-2" />
                  Faturas Recebidas no Mês
                </h3>
                <span className="badge bg-success rounded-pill">{fmt(totalFaturadosRecebidos)}</span>
              </div>
              {Object.keys(recebidosPorSeguradora).length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-dark table-borderless align-middle mb-0 small">
                    <thead>
                      <tr style={{ borderBottom: '1px solid hsl(220 10% 30%)' }}>
                        <th className="text-secondary">Seguradora</th>
                        <th className="text-end text-secondary">Valor Recebido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(recebidosPorSeguradora).map(([segNome, valor]) => (
                        <tr key={segNome} className="border-bottom border-secondary">
                          <td>
                            <i className="bi bi-check-circle-fill text-success me-1" />
                            <span className="text-light fw-semibold">Fat Recebida {segNome}</span>
                          </td>
                          <td className="text-end text-success fw-bold font-mono">{fmt(valor)}</td>
                        </tr>
                      ))}
                      <tr style={{ borderTop: '2px solid hsl(220 10% 30%)' }}>
                        <td className="fw-bold text-light">Total Recebido</td>
                        <td className="text-end text-success fw-bold font-mono">{fmt(totalFaturadosRecebidos)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-secondary py-4 mb-0">
                  <i className="bi bi-hourglass-split" style={{ fontSize: '1.5rem' }} />
                  <br />Nenhuma fatura recebida neste mês.
                </p>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ── MODAL DE CONFIRMAÇÃO DE EXCLUSÃO ─────────────────────────────── */}
      {deleteTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            backdropFilter: 'blur(4px)',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null); }}
        >
          <div
            style={{
              background: 'hsl(220 18% 12%)',
              border: '1px solid hsl(0 84% 40%)',
              borderRadius: '16px',
              padding: '1.5rem',
              maxWidth: '360px',
              width: '100%',
              boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
            }}
          >
            <div className="text-center mb-3">
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'hsl(0 84% 20%)', border: '2px solid hsl(0 84% 40%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                <i className="bi bi-exclamation-triangle-fill text-danger" style={{ fontSize: '1.5rem' }} />
              </div>
            </div>
            <h5 className="text-white fw-bold text-center mb-2">Confirmar Exclusão</h5>
            <p className="text-secondary text-center small mb-1">Você está prestes a excluir permanentemente:</p>
            <div className="text-center mb-4 p-2 rounded-3" style={{ background: 'hsl(0 50% 10%)', border: '1px solid hsl(0 84% 25%)' }}>
              <span className="text-light fw-semibold small">{deleteTarget.descricao}</span>
              <br />
              <span className="text-danger fw-bold font-mono">{fmt(deleteTarget.valor)}</span>
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn-secondary flex-fill rounded-pill fw-semibold" onClick={() => setDeleteTarget(null)}>
                Cancelar
              </button>
              <button
                className="btn flex-fill rounded-pill fw-bold"
                style={{ background: 'linear-gradient(135deg, hsl(0 84% 45%), hsl(0 70% 35%))', color: '#fff', border: 'none' }}
                onClick={confirmDelete}
                disabled={fetcher.state !== 'idle'}
              >
                {fetcher.state !== 'idle'
                  ? <><span className="spinner-border spinner-border-sm me-1" /> Excluindo...</>
                  : <><i className="bi bi-trash3 me-1" /> Confirmar Exclusão</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
