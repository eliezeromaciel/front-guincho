import { useEffect, useRef, useState } from 'react';
import { useLoaderData, useFetcher, Form, Link } from 'react-router';
import { requireAuth } from '~/services/session.server';
import { registrarSubscriptionAutomaticamente } from '~/services/notificacoes';
import type { Route } from './+types/home';

export const meta = () => [
  { title: 'Painel GuinchoFácil' },
  { name: 'description', content: 'Gestão inteligente de serviços de guincho.' },
];

export const loader = async ({ request }: Route.LoaderArgs) => {
  const sessao = await requireAuth(request);
  let servicoAtivo = null;
  let fotosCount = 0;
  let fotosUrls: string[] = [];

  // Se for motorista (readonly), buscar o serviço ativo dele
  if (sessao.role === 'readonly') {
    const { getServicoAtivoMotorista, getFotosServico } = await import('~/services/servicos.server');
    servicoAtivo = await getServicoAtivoMotorista(sessao.uid);
    if (servicoAtivo && servicoAtivo.id) {
      fotosUrls = await getFotosServico(servicoAtivo.id);
      fotosCount = fotosUrls.length;
    }
  }

  return { sessao, servicoAtivo, fotosCount, fotosUrls };
};

export const action = async ({ request }: Route.ActionArgs) => {
  const sessao = await requireAuth(request);
  const formData = await request.formData();
  const intent = formData.get('intent') as 'upload_foto' | 'finalizar' | 'cancelar';
  const servicoId = ((formData.get('servicoId') as string) ?? '').trim();

  // IDs gerados pelo Firestore são alfanuméricos com 20 caracteres.
  // Rejeitar qualquer coisa fora desse formato antes de tocar no banco.
  if (!servicoId || !/^[a-zA-Z0-9]{10,}$/.test(servicoId)) {
    return { ok: false, error: 'ID do serviço inválido.' };
  }

  // Verifica propriedade do serviço antes de qualquer ação (evita IDOR)
  const { adminDb } = await import('~/services/firebaseAdmin.server');
  const doc = await adminDb.collection('servicos').doc(servicoId).get();
  if (!doc.exists || doc.data()?.motoristaUid !== sessao.uid) {
    return { ok: false, error: 'Acesso negado.' };
  }

  if (intent === 'upload_foto') {
    const base64 = formData.get('base64') as string;
    if (!base64) return { ok: false, error: 'Dados incompletos para upload.' };
    if (!base64.startsWith('data:image/jpeg') && !base64.startsWith('data:image/png')) {
      return { ok: false, error: 'Tipo de arquivo não permitido.' };
    }
    if (base64.length > 1_400_000) {
      return { ok: false, error: 'Imagem muito grande. Máximo 1 MB.' };
    }
    const { uploadFotoServico } = await import('~/services/servicos.server');
    return await uploadFotoServico(servicoId, base64);
  }

  if (intent === 'finalizar') {
    if (!doc.data()?.fotosEnviadas) {
      return { ok: false, error: 'Envie pelo menos 1 foto obrigatória antes de finalizar.' };
    }
    const { finalizarServico } = await import('~/services/servicos.server');
    return await finalizarServico(servicoId);
  }

  if (intent === 'cancelar') {
    const { cancelarServicoMotorista } = await import('~/services/servicos.server');
    return await cancelarServicoMotorista(servicoId);
  }

  return { ok: false, error: 'Intenção inválida.' };
};

export default function Home() {
  const { sessao, servicoAtivo, fotosCount, fotosUrls } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const inputFotoRef = useRef<HTMLInputElement>(null);
  const [carregandoFoto, setCarregandoFoto] = useState(false);
  const wasSubmitting = useRef(false);

  useEffect(() => {
    // Registrar push notification automaticamente após o login
    registrarSubscriptionAutomaticamente();
  }, []);

  useEffect(() => {
    if (fetcher.state === 'submitting') {
      wasSubmitting.current = true;
    }
    if (fetcher.state === 'idle' && wasSubmitting.current) {
      wasSubmitting.current = false;
      setCarregandoFoto(false);
      const res = fetcher.data as { ok: boolean; error?: string; totalFotos?: number } | undefined;
      if (res?.ok) {
        if (res.totalFotos !== undefined) {
          alert(`Foto carregada com sucesso! (${res.totalFotos} de 4)`);
        } else {
          alert('Serviço finalizado com sucesso! Bom trabalho!');
        }
      } else if (res && !res.ok) {
        alert(`Erro: ${res.error}`);
      }
    }
  }, [fetcher.state, fetcher.data]);

  // Função para comprimir a foto no cliente e converter em Base64 de alta performance
  const handleSelecionarFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivos = e.target.files;
    if (!arquivos || arquivos.length === 0) return;

    setCarregandoFoto(true);
    const file = arquivos[0];
    const leitor = new FileReader();

    leitor.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 640; // Otimizado para celular
        const scale = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scale;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          // Comprimir como JPEG com 65% de qualidade
          const base64 = canvas.toDataURL('image/jpeg', 0.65);

          const uploadData = new FormData();
          uploadData.append('intent', 'upload_foto');
          uploadData.append('servicoId', servicoAtivo?.id ?? '');
          uploadData.append('base64', base64);

          fetcher.submit(uploadData, { method: 'post' });
        }
      };
      img.src = event.target?.result as string;
    };
    leitor.readAsDataURL(file);
  };

  return (
    <div className="min-vh-100 d-flex flex-column" style={{ background: 'linear-gradient(160deg, hsl(220 20% 5%) 0%, hsl(230 22% 11%) 50%, hsl(260 18% 9%) 100%)' }}>

      {/* Navbar Superior */}
      <header className="navbar navbar-expand-lg navbar-dark gf-navbar px-4 py-3">
        <div className="container-fluid d-flex align-items-center justify-content-between">
          <Link to="/" className="navbar-brand p-0 d-flex align-items-center gap-2">
            <h1 className="h3 fw-bold text-white mb-0 tracking-tight">GuinchoFácil</h1>
          </Link>

          <div className="d-flex align-items-center gap-3">
            <span className="text-secondary small d-none d-sm-inline">
              Olá, <strong className="text-light">{sessao.displayName}</strong> ({sessao.role === 'admin' ? 'Administrador' : 'Motorista'})
            </span>
            <Form method="post" action="/logout" className="m-0">
              <button type="submit" className="btn btn-outline-danger btn-sm rounded-pill px-3 fw-bold">
                Sair
              </button>
            </Form>
          </div>
        </div>
      </header>

      {/* Corpo da Página */}
      <main className="flex-grow-1 py-2 px-3">
        <div className="container" style={{ maxWidth: '960px' }}>

          {/* PAINEL ADMINISTRATIVO (ADMIN) */}
          {sessao.role === 'admin' && (
            <div>
              <div className="text-center m-2">
                <img
                  src="/app/assets/img/logotipo-guincho-farias.jpg"
                  alt="GuinchoFácil"
                  className="img-fluid rounded-3 border mb-2 border-secondary shadow"
                  style={{ height: '70px' }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>

              {/* Grid de Opções Operacionais */}
              <div className="row g-4 justify-content-center gf-stagger mb-5">
                <div className="col-12 col-sm-6 col-md-4 gf-animate-in-up">
                  <Link to="/novoservico" className="card-link">
                    <div className="gf-card hover-glow hover-scale text-center h-100" style={{ background: 'hsl(220 16% 13%)' }}>
                      <div className="text-primary mb-3">
                        <i className="bi bi-plus-circle-dotted display-4"></i>
                      </div>
                      <h3 className="h5 fw-bold text-white mb-2">Novo Serviço</h3>
                      <p className="text-secondary small mb-0">Cadastre e distribua novos guinchos para a frota.</p>
                    </div>
                  </Link>
                </div>

                <div className="col-12 col-sm-6 col-md-4 gf-animate-in-up">
                  <Link to="/relatoriosfinanceiros" className="card-link">
                    <div className="gf-card hover-glow hover-scale text-center h-100" style={{ background: 'hsl(220 16% 13%)' }}>
                      <div className="text-success mb-3">
                        <i className="bi bi-graph-up-arrow display-4"></i>
                      </div>
                      <h3 className="h5 fw-bold text-white mb-2">Painel Financeiro</h3>
                      <p className="text-secondary small mb-0">Veja receitas, guinchos e diluições de despesas.</p>
                    </div>
                  </Link>
                </div>

                <div className="col-12 col-sm-6 col-md-4 gf-animate-in-up">
                  <Link to="/despesas" className="card-link">
                    <div className="gf-card hover-glow hover-scale text-center h-100" style={{ background: 'hsl(220 16% 13%)' }}>
                      <div className="text-danger mb-3">
                        <i className="bi bi-wallet2 display-4"></i>
                      </div>
                      <h3 className="h5 fw-bold text-white mb-2">Lançar Despesa</h3>
                      <p className="text-secondary small mb-0">Registre custos e parcelas de caminhões da frota.</p>
                    </div>
                  </Link>
                </div>

                <div className="col-12 col-sm-6 col-md-4 gf-animate-in-up">
                  <Link to="/cadastros" className="card-link">
                    <div className="gf-card hover-glow hover-scale text-center h-100" style={{ background: 'hsl(220 16% 13%)' }}>
                      <div className="text-warning mb-3">
                        <i className="bi bi-person-badge display-4"></i>
                      </div>
                      <h3 className="h5 fw-bold text-white mb-2">Cadastros</h3>
                      <p className="text-secondary small mb-0">Motoristas e caminhões da frota.</p>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* PAINEL DO MOTORISTA / LEITOR (READONLY) */}
          {sessao.role === 'readonly' && (
            <div>
              {servicoAtivo ? (
                <div className="bg-black bg-opacity-50 border border-secondary rounded-4 p-4 p-md-5 shadow-lg">
                  <div className="d-flex align-items-center justify-content-between mb-4 border-bottom border-secondary pb-3">
                    <div>
                      <span className="badge bg-warning text-dark uppercase fw-bold mb-1">Serviço Ativo</span>
                      <h2 className="h3 fw-bold text-white m-0">Ordem de Serviço</h2>
                    </div>
                    <span className="text-primary fw-bold font-mono h4 m-0">R$ {servicoAtivo.valorCobrado.toFixed(2)}</span>
                  </div>

                  {/* Informações da Rota */}
                  <div className="row g-4 mb-4">
                    <div className="col-12 col-md-6">
                      <div className="d-flex gap-3">
                        <div className="text-primary h3 m-0">
                          <i className="bi bi-geo-alt-fill"></i>
                        </div>
                        <div>
                          <span className="text-secondary small fw-semibold uppercase d-block">Retirada (Busca)</span>
                          <span className="text-light fw-bold">{servicoAtivo.pickUpAdress || <span className="text-secondary fst-italic">Não informado</span>}</span>
                        </div>
                      </div>
                    </div>

                    <div className="col-12 col-md-6">
                      <div className="d-flex gap-3">
                        <div className="text-success h3 m-0">
                          <i className="bi bi-flag-fill"></i>
                        </div>
                        <div>
                          <span className="text-secondary small fw-semibold uppercase d-block">Entrega (Destino)</span>
                          <span className="text-light fw-bold">{servicoAtivo.deliveryAdress || <span className="text-secondary fst-italic">Não informado</span>}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Detalhes do Veículo */}
                  <div className="bg-dark p-2 rounded-3 border border-secondary mb-4 opacity-75">
                    <div className="row align-items-center">
                      <div className="col-6">
                        <span className="text-secondary text-xs uppercase d-block">Veículo Guinchado</span>
                        <span className="text-light small">{(servicoAtivo as any).detalhesVeiculo || <span className="text-secondary fst-italic">Não informado</span>}</span>
                      </div>
                      <div className="col-6 border-start border-secondary ps-3">
                        <span className="text-secondary text-xs uppercase d-block">Placa</span>
                        <span className="text-light small font-mono m-0">{(servicoAtivo as any).placaVeiculo || <span className="text-secondary fst-italic" style={{ fontSize: '0.75rem' }}>Não informada</span>}</span>
                      </div>
                    </div>
                  </div>

                  {/* FLUXO OBRIGATÓRIO DE FOTOS */}
                  <div className="border border-secondary rounded-3 p-3 bg-black bg-opacity-30 mb-4">
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <div>
                        <h4 className="h6 fw-bold text-light mb-1 uppercase">Fotos do Veículo</h4>
                        <span className="text-secondary text-xs">Envie no mínimo 1 foto para liberar a conclusão</span>
                      </div>
                      <span className={`badge ${fotosCount >= 1 ? 'bg-success' : 'bg-danger'} font-mono px-3 py-2`}>
                        {fotosCount} foto{fotosCount !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Alerta de Fotos Pendentes */}
                    {fotosCount < 1 ? (
                      <div className="alert alert-danger bg-danger bg-opacity-10 border-0 text-danger p-3 mb-3 small d-flex align-items-start gap-2 rounded-3 animate-pulse">
                        <i className="bi bi-exclamation-octagon-fill h5 m-0"></i>
                        <div>
                          <strong>Atenção Motorista:</strong> Você deve fotografar o veículo no local de retirada para poder concluir o serviço.
                        </div>
                      </div>
                    ) : (
                      <div className="alert alert-success bg-success bg-opacity-10 border-0 text-success p-3 mb-3 small d-flex align-items-center gap-2 rounded-3">
                        <i className="bi bi-check-circle-fill h5 m-0"></i>
                        <div>
                          <strong>Excelente!</strong> Mínimo de fotos atingido. O botão de finalização está liberado.
                        </div>
                      </div>
                    )}

                    {/* Input Oculto de Captura de Imagem */}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      ref={inputFotoRef}
                      className="d-none"
                      onChange={handleSelecionarFoto}
                    />

                    {/* Botão de Envio */}
                    <div className="d-grid mb-3">
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-lg rounded-3 fw-bold min-h-[48px] d-flex align-items-center justify-content-center gap-2"
                        onClick={() => inputFotoRef.current?.click()}
                        disabled={carregandoFoto}
                      >
                        {carregandoFoto ? (
                          <>
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                            Comprimindo e Enviando...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-camera-fill h5 m-0"></i>
                            {fotosCount === 0 ? 'Tirar e Enviar Foto' : 'Tirar Mais Fotos'}
                          </>
                        )}
                      </button>
                    </div>

                    {/* Grid de Thumbnails das Fotos Enviadas */}
                    <div className="row g-2">
                      {fotosUrls.map((url, idx) => (
                        <div key={idx} className="col-3">
                          <div className="ratio ratio-1x1 border border-secondary rounded overflow-hidden shadow-sm bg-dark">
                            <img src={url} alt={`Registro ${idx + 1}`} style={{ objectFit: 'cover' }} />
                          </div>
                        </div>
                      ))}
                      {Array.from({ length: Math.max(0, 1 - fotosCount) }).map((_, idx) => (
                        <div key={idx} className="col-3">
                          <div className="ratio ratio-1x1 border border-dashed border-secondary rounded d-flex align-items-center justify-content-center bg-dark bg-opacity-20 text-secondary">
                            <i className="bi bi-image h4 m-0"></i>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Ação de Conclusão de Serviço */}
                  <fetcher.Form method="post" className="d-grid gap-2">
                    <input type="hidden" name="servicoId" value={servicoAtivo.id} />

                    <button
                      type="submit"
                      name="intent"
                      value="finalizar"
                      className="btn btn-success btn-lg fw-bold rounded-3 min-h-[48px]"
                      disabled={fotosCount < 1 || fetcher.state !== 'idle'}
                    >
                      {fetcher.state !== 'idle' ? 'Processando...' : 'Finalizar Serviço de Guincho'}
                    </button>

                    <button
                      type="submit"
                      name="intent"
                      value="cancelar"
                      className="btn btn-outline-danger fw-bold rounded-3 min-h-[48px] mt-2"
                      disabled={fetcher.state !== 'idle'}
                      onClick={(e) => {
                        if (!confirm('Tem certeza que deseja CANCELAR este serviço? Ele será encerrado imediatamente.')) {
                          e.preventDefault();
                        }
                      }}
                    >
                      <i className="bi bi-x-circle me-2"></i>
                      Cancelar Serviço de Guincho
                    </button>
                  </fetcher.Form>
                </div>
              ) : (
                <div className="bg-black bg-opacity-50 border border-secondary rounded-4 p-5 text-center shadow-lg">
                  <div className="text-success mb-3">
                    <i className="bi bi-shield-check display-3"></i>
                  </div>
                  <h2 className="h3 fw-bold text-white mb-2">Sem Serviços Ativos</h2>
                  <p className="text-secondary">Você não possui guinchos pendentes ou em andamento no momento.</p>
                  <p className="text-secondary small mb-0">Aguarde novas notificações web push do administrador.</p>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* Rodapé Padrão */}
      <footer className="py-4 gf-footer">
        <div className="container text-center">
          <p className="text-secondary small mb-0">© 2026 GuinchoFácil. Todos os direitos reservados.</p>
        </div>
      </footer>

    </div>
  );
}



