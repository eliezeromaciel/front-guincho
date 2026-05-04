---
name: security-review
description: Revisa o código do projeto de manutenção predial em busca de vulnerabilidades
             de segurança. Cobre Firebase Auth, Firestore, React Router SSR e exposição
             de dados sensíveis. Use ao revisar autenticação, autorização ou qualquer
             fluxo que lide com dados de usuários.
allowed-tools: Read, Grep, Glob
---

# Revisão de Segurança — Manutenção Predial

Analise o código considerando o stack deste projeto: Firebase Auth, Firestore, React Router 7 SSR, TypeScript.

## Crítico

- **Credenciais expostas**: chaves de API, `firebaseConfig` com dados sensíveis commitados sem proteção
- **Injeção em queries Firestore**: concatenação de strings em caminhos de coleção/documento com input do usuário
- **Bypass de autenticação**: rotas acessíveis sem verificar `user` no `AuthContext` ou no `loader`
- **Bypass de autorização**: ações restritas a `admin`/`gerente` executáveis por `visualizador` ou usuário não autenticado

## Alto

- **Validação de input ausente**: dados de formulário enviados diretamente ao Firestore sem sanitização
- **Role manipulation**: `role` do usuário lido de fonte não confiável (ex: localStorage, parâmetro de URL) em vez do Firestore
- **Usuário desativado com acesso**: fluxo de `ativo: false` não bloqueia corretamente sessões ativas
- **Dados sensíveis em logs**: `console.log` expondo senhas, tokens ou dados pessoais

## Médio

- **Proteção apenas no cliente**: verificação de `role` feita só no React, sem validação no `loader`/`action` do servidor
- **Links internos com `<a>`**: uso de `<a href>` em vez de `<Link>` do React Router (pode causar recarregamento e perda de estado de auth)
- **Mensagens de erro verbosas**: erros do Firebase expostos diretamente na UI revelando detalhes internos
- **CORS / headers de segurança**: ausência de headers como `X-Frame-Options`, `Content-Security-Policy` na resposta SSR

## Baixo

- **Dependências desatualizadas**: pacotes com CVEs conhecidos (`npm audit`)
- **Secrets em variáveis de ambiente sem `.env` no `.gitignore`**

## Formato de saída

Para cada problema encontrado:
- **Severidade**: Crítico / Alto / Médio / Baixo
- **Localização**: arquivo:linha
- **Problema**: descrição clara do risco
- **Correção**: exemplo de código corrigido
