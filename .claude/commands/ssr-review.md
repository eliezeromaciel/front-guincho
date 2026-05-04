---
name: ssr-review
description: Revisa código React Router 7 (SSR) do projeto de manutenção predial.
             Use quando quiser revisar loaders, actions, componentes de rota,
             padrões de data fetching ou problemas de hidratação SSR.
allowed-tools: Read, Grep, Glob
---

# Revisão de SSR — React Router 7

Analise o código fornecido considerando os padrões deste projeto (React Router 7 com `ssr: true`, React 19, TypeScript).

## O que verificar

### Loaders e Actions
- Dados que pertencem ao servidor devem estar em `loader`, não em `useEffect` + fetch no cliente
- `loader` e `action` devem ter tipos explícitos via `Route.LoaderArgs` / `Route.ActionArgs`
- Retornos de `loader` devem ser tipados — nunca `any`
- Mutations de formulário devem usar `action` + `useFetcher`, não chamadas diretas no cliente

### Hidratação
- Verificar divergências entre o HTML renderizado no servidor e o renderizado no cliente
- `useEffect` não deve ser usado para inicializar estado que vem do servidor (use `loader`)
- Evitar acesso a `window`, `document` ou APIs de browser fora de `useEffect`

### Componentes de rota
- Cada arquivo em `app/routes/` deve exportar `default` para o componente e opcionalmente `loader`, `action`, `meta`
- Não criar árvores `<Route>` manuais — usar apenas file-based routing
- Links internos devem usar `<Link>` ou `<NavLink>` do `react-router`, nunca `<a>`

### TypeScript
- Sem `any` — usar `unknown` + narrowing quando necessário
- Todo `useState` deve ter tipo explícito
- Props de componente devem ter `interface` definida

## Formato de saída

Para cada problema encontrado:
- **Severidade**: Alta / Média / Baixa
- **Localização**: arquivo:linha
- **Problema**: o que está errado e por quê é problemático em SSR
- **Correção**: exemplo de código correto
