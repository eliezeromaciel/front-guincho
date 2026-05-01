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
  const [selecionando, setSelecionando] = useState(false);

  useEffect(() => {
    const salvo = localStorage.getItem(STORAGE_KEY);
    if (!salvo) setMostrar(true);
  }, []);

  const handleSelecionar = async (nome: string) => {
    setSelecionando(true);
    localStorage.setItem(STORAGE_KEY, nome);
    await registrarSubscription(nome);
    setSelecionando(false);
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
              onClick={() => handleSelecionar(nome)}
              disabled={selecionando}
            >
              {selecionando ? (
                <span className="spinner-border spinner-border-sm me-2" role="status" />
              ) : null}
              {nome}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SeletorFuncionario;
