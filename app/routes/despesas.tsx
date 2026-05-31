import { useEffect, useRef, useState } from 'react';
import { useFetcher, Link } from 'react-router';
import { requireAdmin } from '~/services/session.server';
import { postNovaDespesa } from '~/services/despesas';
import type { Route } from './+types/despesas';

export const meta = () => [{ title: 'Lançar Despesa — GuinchoFácil' }];

export const loader = async ({ request }: Route.LoaderArgs) => {
  await requireAdmin(request);
  return {};
};

export const action = async ({ request }: Route.ActionArgs) => {
  await requireAdmin(request);
  const formData = await request.formData();
  const caminhao = formData.get('caminhao') as 'A' | 'B' | 'C';
  const valorTotalRaw = formData.get('valorTotal') as string;
  const descricao = (formData.get('descricao') as string)?.trim();
  const dataPagamento = formData.get('dataPagamento') as string;
  const parcelasRaw = formData.get('parcelas') as string;

  if (!caminhao || !['A', 'B', 'C'].includes(caminhao)) {
    return { ok: false as const, error: 'Selecione um caminhão da frota.' };
  }

  const valorTotal = parseFloat(valorTotalRaw);
  if (isNaN(valorTotal) || valorTotal <= 0 || valorTotal > 100000) {
    return { ok: false as const, error: 'Insira um valor de custo válido.' };
  }

  if (!descricao || descricao.length < 2) {
    return { ok: false as const, error: 'Forneça uma descrição detalhada da despesa.' };
  }

  if (!dataPagamento) {
    return { ok: false as const, error: 'Insira a data do pagamento da despesa.' };
  }

  const parcelas = parseInt(parcelasRaw, 10);
  if (isNaN(parcelas) || parcelas < 1 || parcelas > 48) {
    return { ok: false as const, error: 'Quantidade de parcelas deve ser entre 1 e 48.' };
  }

  const result = await postNovaDespesa(caminhao, valorTotal, descricao, dataPagamento, parcelas);
  if (!result.ok) {
    return { ok: false as const, error: 'Erro ao registrar despesa no Firestore.' };
  }

  return { ok: true as const };
};

export default function LançarDespesa() {
  const fetcher = useFetcher<typeof action>();
  const formRef = useRef<HTMLFormElement>(null);
  const wasSubmitting = useRef(false);
  const [opcaoPredefinida, setOpcaoPredefinida] = useState<string>('');
  const [descricaoCustomizada, setDescricaoCustomizada] = useState<string>('');

  useEffect(() => {
    if (fetcher.state === 'submitting') {
      wasSubmitting.current = true;
    }
    if (fetcher.state === 'idle' && wasSubmitting.current) {
      wasSubmitting.current = false;
      if (fetcher.data?.ok) {
        alert('Despesa operada e registrada com sucesso!');
        formRef.current?.reset();
        setOpcaoPredefinida('');
        setDescricaoCustomizada('');
      } else if (fetcher.data && !fetcher.data.ok) {
        alert(`Erro: ${fetcher.data.error}`);
      }
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <div className="min-vh-100 bg-dark text-white py-5 px-3 d-flex align-items-center justify-content-center">
      <div 
        className="w-100 rounded-4 p-4 p-md-5 border border-secondary shadow-lg bg-opacity-75 bg-black" 
        style={{ maxWidth: '600px', backdropFilter: 'blur(10px)' }}
      >
        <div className="d-flex align-items-center justify-content-between mb-4">
          <Link to="/" className="btn btn-outline-light btn-sm rounded-pill px-3">
            <i className="bi bi-arrow-left me-1"></i> Voltar
          </Link>
          <h2 className="h4 fw-bold m-0 text-gradient bg-gradient-to-r from-red-400 to-amber-500 bg-clip-text text-transparent">
            GuinchoFácil
          </h2>
        </div>

        <h1 className="h3 fw-bold mb-1 text-white">Lançar Despesa da Frota</h1>
        <p className="text-secondary mb-4" style={{ fontSize: '0.95rem' }}>
          Registre e parcele custos operacionais de cada caminhão.
        </p>

        <fetcher.Form ref={formRef} method="post" className="needs-validation">
          
          <div className="mb-3">
            <label className="form-label fw-semibold text-light">Selecione o Caminhão</label>
            <select
              name="caminhao"
              className="form-select form-select-lg bg-dark text-white border-secondary focus:border-primary text-base min-h-[48px]"
              required
            >
              <option value="">Escolha um caminhão da frota...</option>
              <option value="A">Caminhão A (Gabriel)</option>
              <option value="B">Caminhão B (Daniel)</option>
              <option value="C">Caminhão C (Novo / Planejado)</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold text-light">Valor do Custo (R$)</label>
            <input
              type="number"
              name="valorTotal"
              step="0.01"
              min="0.01"
              max="100000"
              className="form-control form-control-lg bg-dark text-white border-secondary focus:border-primary text-base min-h-[48px]"
              placeholder="Ex: 350.00"
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold text-light">Categoria / Descrição rápida</label>
            <select
              className="form-select form-select-lg bg-dark text-white border-secondary focus:border-primary text-base min-h-[48px] mb-2"
              value={opcaoPredefinida}
              onChange={(e) => {
                const val = e.target.value;
                setOpcaoPredefinida(val);
                if (val !== 'outra') setDescricaoCustomizada(val);
              }}
            >
              <option value="">Selecione uma categoria comum...</option>
              <option value="Abastecimento (Diesel)">Abastecimento (Diesel)</option>
              <option value="Manutenção Preventiva">Manutenção Preventiva</option>
              <option value="Troca de Óleo">Troca de Óleo</option>
              <option value="Compra de Pneu">Compra de Pneu</option>
              <option value="Lavagem / Polimento">Lavagem / Polimento</option>
              <option value="Seguro do Caminhão">Seguro do Caminhão</option>
              <option value="IPVA / Licenciamento">IPVA / Licenciamento</option>
              <option value="outra">Outra descrição personalizada...</option>
            </select>

            {opcaoPredefinida === 'outra' || !opcaoPredefinida ? (
              <input
                type="text"
                name="descricao"
                value={descricaoCustomizada}
                onChange={(e) => setDescricaoCustomizada(e.target.value)}
                className="form-control form-control-lg bg-dark text-white border-secondary focus:border-primary text-base min-h-[48px]"
                placeholder="Digite a descrição da despesa..."
                required
                minLength={2}
                maxLength={100}
              />
            ) : (
              <input type="hidden" name="descricao" value={descricaoCustomizada} />
            )}
          </div>

          <div className="row">
            <div className="col-12 col-md-6 mb-3">
              <label className="form-label fw-semibold text-light">Data do Pagamento</label>
              <input
                type="date"
                name="dataPagamento"
                className="form-control form-control-lg bg-dark text-white border-secondary focus:border-primary text-base min-h-[48px]"
                required
                defaultValue={new Date().toISOString().substring(0, 10)}
              />
            </div>

            <div className="col-12 col-md-6 mb-3">
              <label className="form-label fw-semibold text-light">Parcelas (Meses)</label>
              <select
                name="parcelas"
                className="form-select form-select-lg bg-dark text-white border-secondary focus:border-primary text-base min-h-[48px]"
                required
                defaultValue="1"
              >
                <option value="1">À vista (1x)</option>
                <option value="2">2 meses</option>
                <option value="3">3 meses</option>
                <option value="4">4 meses</option>
                <option value="6">6 meses</option>
                <option value="10">10 meses</option>
                <option value="12">12 meses (1 ano)</option>
                <option value="24">24 meses (2 anos)</option>
              </select>
            </div>
          </div>

          {fetcher.data && !fetcher.data.ok ? (
            <div className="alert alert-danger py-2 px-3 mb-3 border-0 bg-danger bg-opacity-25 text-danger rounded-3" role="alert">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {fetcher.data.error}
            </div>
          ) : null}

          <div className="d-grid mt-4">
            <button
              type="submit"
              className="btn btn-danger btn-lg fw-bold rounded-3 min-h-[48px]"
              disabled={fetcher.state !== 'idle'}
            >
              {fetcher.state !== 'idle' ? (
                <>
                  <span className="spinner-border spinner-border-sm role-status me-2" aria-hidden="true"></span>
                  Lançando Custo...
                </>
              ) : (
                'Salvar Despesa'
              )}
            </button>
          </div>
        </fetcher.Form>
      </div>
    </div>
  );
}
