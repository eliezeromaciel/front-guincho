import { enviarNotificacaoServidor } from '~/services/webpush.server';
import { getServicosAgendadosParaHoje, marcarServicoComoNotificadoCron } from '~/services/servicos.server';
export const loader = async ({ request }: { request: Request }) => {
  // O Vercel envia um cabeçalho de autorização contendo a CRON_SECRET, se configurada.
  // Protege o endpoint para que não seja chamado livremente pela web.
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const today = new Date();
    // Determinar o início e o fim do dia de hoje (em timezone local/servidor Vercel)
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    // Buscar todos os serviços pendentes agendados para hoje
    const servicosHoje = await getServicosAgendadosParaHoje(startOfDay, endOfDay);

    if (servicosHoje.length === 0) {
      return new Response('Nenhum serviço pendente agendado para hoje.', { status: 200 });
    }

    let count = 0;
    for (const servico of servicosHoje) {
      // Ignora se o motorista não estiver definido ou se já tivermos notificado através do cron
      if (!servico.motoristaUid || servico.cronNotificado) continue;

      const {
        motoristaUid,
        detalhesVeiculo,
        placaVeiculo,
        pickUpAdress,
        deliveryAdress,
        tipoRecebedor,
        seguradoraNome
      } = servico;

      await enviarNotificacaoServidor(
        motoristaUid,
        'Lembrete: Serviço agendado para hoje!',
        [
          detalhesVeiculo && placaVeiculo ? `Veículo: ${detalhesVeiculo} (${placaVeiculo})` :
          detalhesVeiculo ? `Veículo: ${detalhesVeiculo}` :
          placaVeiculo ? `Placa: ${placaVeiculo}` : null,
          pickUpAdress ? `De: ${pickUpAdress}` : null,
          deliveryAdress ? `Para: ${deliveryAdress}` : null,
          tipoRecebedor === 'seguradora' ? `Faturado: ${seguradoraNome}` : null,
        ].filter(Boolean).join(' — ') || 'Você tem um serviço agendado para hoje.'
      );

      // Marca o serviço como notificado pelo cron para não reenviar caso a task rode novamente
      if (servico.id) {
        await marcarServicoComoNotificadoCron(servico.id);
      }
      count++;
    }

    return new Response(`Cron finalizado. ${count} notificações de agendamento enviadas.`, { status: 200 });
  } catch (err: any) {
    console.error('[cron.notificar-diario] Erro:', err);
    return new Response('Erro interno do servidor', { status: 500 });
  }
};
