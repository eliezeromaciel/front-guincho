import { useState, useEffect } from 'react';
import { registrarSubscription } from '~/services/notificacoes';

const FUNCIONARIOS = ['Daniel', 'Gabriel'];
const STORAGE_KEY = 'funcionario_atual';

export const getFuncionarioAtual = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
};

const SeletorFuncionario = () => {
  const [mostrar, setMostrar] = useState(false);
  const [etapa, setEtapa] = useState<'nome' | 'pin'>('nome');
  const [nomeSelecionado, setNomeSelecionado] = useState('');
  const [pin, setPin] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    const salvo = localStorage.getItem(STORAGE_KEY);
    if (!salvo) setMostrar(true);
  }, []);

  const handleSelecionarNome = (nome: string) => {
    setNomeSelecionado(nome);
    setPin('');
    setErro('');
    setEtapa('pin');
  };

  const handleConfirmarPin = async () => {
    if (pin.length < 4) {
      setErro('Digite o PIN completo.');
      return;
    }
    setCarregando(true);
    setErro('');
    const sucesso = await registrarSubscription(nomeSelecionado, pin);
    setCarregando(false);
    if (!sucesso) {
      setErro('PIN incorreto ou erro ao registrar. Tente novamente.');
      setPin('');
      return;
    }
    localStorage.setItem(STORAGE_KEY, nomeSelecionado);
    setMostrar(false);
  };

  if (!mostrar) return null;

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 9999 }}
    >
      <div
        className="bg-white rounded-3 p-4 mx-3 text-center shadow-lg"
        style={{ maxWidth: 360, width: '100%' }}
      >
        {etapa === 'nome' ? (
          <>
            <i className="bi bi-person-circle text-primary mb-3 d-block" style={{ fontSize: '3rem' }} />
            <h5 className="fw-bold mb-1">Quem é você?</h5>
            <p className="text-secondary mb-4" style={{ fontSize: '0.9rem' }}>
              Escolha seu nome para receber notificações de novos serviços no seu celular.
            </p>
            <div className="d-grid gap-3">
              {FUNCIONARIOS.map((nome) => (
                <button
                  key={nome}
                  className="btn btn-primary py-3 fs-5 fw-semibold"
                  onClick={() => handleSelecionarNome(nome)}
                >
                  {nome}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <i className="bi bi-shield-lock text-primary mb-3 d-block" style={{ fontSize: '3rem' }} />
            <h5 className="fw-bold mb-1">Olá, {nomeSelecionado}!</h5>
            <p className="text-secondary mb-4" style={{ fontSize: '0.9rem' }}>
              Digite seu PIN para confirmar sua identidade.
            </p>
            <input
              type="password"
              inputMode="numeric"
              className="form-control form-control-lg text-center mb-3"
              placeholder="PIN"
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmarPin(); }}
              autoFocus
            />
            {erro && <p className="text-danger small mb-3">{erro}</p>}
            <div className="d-grid gap-2">
              <button
                className="btn btn-primary py-3 fs-5 fw-semibold"
                onClick={handleConfirmarPin}
                disabled={carregando}
              >
                {carregando && (
                  <span className="spinner-border spinner-border-sm me-2" role="status" />
                )}
                Confirmar
              </button>
              <button
                className="btn btn-outline-secondary"
                onClick={() => { setEtapa('nome'); setErro(''); }}
                disabled={carregando}
              >
                Voltar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SeletorFuncionario;
