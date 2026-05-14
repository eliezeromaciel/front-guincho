import { useEffect, useRef, useState } from 'react'
import { useFetcher } from 'react-router'
import { postNovoVeiculo } from '~/services/veiculos'
import { requireAuth } from '~/services/session.server'
import type { Route } from './+types/veiculos'

export const loader = async ({ request }: Route.LoaderArgs) => {
  await requireAuth(request);
  return {};
};

export const action = async ({ request }: Route.ActionArgs) => {
  await requireAuth(request)
  const formData = await request.formData()
  const placa = formData.get('placa') as string
  const modelo = formData.get('modelo') as string

  if (placa.length !== 7) {
    return { ok: false as const, error: 'Placa incompleta' }
  }

  const result = await postNovoVeiculo(placa, modelo)
  if (!result.ok) {
    console.log('[veiculos action] erro:', result.error)
    return { ok: false as const, error: 'Erro ao cadastrar veículo. Tente novamente.' }
  }
  return { ok: true as const }
}

const Veiculos = () => {
  const fetcher = useFetcher<typeof action>()
  const [placa, setPlaca] = useState<string>('')
  const [modelo, setModelo] = useState<string>('')
  const wasSubmitting = useRef(false)

  const handlePlacaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let valor: string = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (valor.length > 7) valor = valor.slice(0, 7)

    const padraoMercosul = [
      /^[A-Z]$/,
      /^[A-Z]$/,
      /^[A-Z]$/,
      /^[0-9]$/,
      /^[A-Z0-9]$/,
      /^[0-9]$/,
      /^[0-9]$/,
    ]

    let validValue = ''
    for (let i = 0; i < valor.length; i++) {
      if (padraoMercosul[i].test(valor[i])) {
        validValue += valor[i]
      } else {
        break
      }
    }

    setPlaca(validValue)
  }

  useEffect(() => {
    if (fetcher.state === 'submitting') {
      wasSubmitting.current = true
    }
    if (fetcher.state === 'idle' && wasSubmitting.current) {
      wasSubmitting.current = false
      if (fetcher.data?.ok) {
        setPlaca('')
        setModelo('')
        alert('Veículo cadastrado com sucesso')
      } else if (fetcher.data && !fetcher.data.ok) {
        alert(`Erro ao cadastrar o veículo: ${fetcher.data.error}`)
      }
    }
  }, [fetcher.state, fetcher.data])

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="border border-secondary p-4 rounded">
            <h3 className="text-secondary mb-3">Cadastro de Veículos</h3>

            <fetcher.Form
              method="post"
              className="needs-validation"
              onSubmit={(e) => {
                if (placa.length !== 7) {
                  e.preventDefault()
                  alert('Placa incompleta')
                }
              }}
            >
              <div className="mb-3">
                <h6>Placa:</h6>
              </div>
              <div className="mb-3">
                <input
                  className="form-control"
                  type="text"
                  name="placa"
                  placeholder="ex: ABC-0123"
                  maxLength={30}
                  value={placa}
                  onChange={handlePlacaChange}
                  required
                />
              </div>

              <div className="mb-3">
                <h6>Modelo:</h6>
              </div>
              <div className="mb-3">
                <input
                  className="form-control"
                  type="text"
                  name="modelo"
                  placeholder="ex: kadett"
                  maxLength={30}
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                  required
                />
              </div>

              <div className="d-grid">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={fetcher.state !== 'idle'}
                >
                  {fetcher.state !== 'idle' ? 'Salvando...' : 'Criar'}
                </button>
              </div>
            </fetcher.Form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Veiculos
