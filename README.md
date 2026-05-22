# EngClinica Pro

Sistema de gestão para engenharia clínica e assistência técnica hospitalar.

Este projeto tem como objetivo centralizar o controle operacional de empresas, equipamentos médico-hospitalares, ordens de serviço, orçamentos, protocolos de recolhimento/entrega, procedimentos de manutenção preventiva e campos gerenciais utilizados na rotina de assistência técnica.

## Status do projeto

Projeto em fase inicial de estruturação técnica.

A versão atual foi originada a partir de um protótipo criado no Lovable e está sendo evoluída em uma cópia independente para permitir melhorias estruturais, maior segurança, organização do código, futura integração com banco de dados e preparação para uso interno e posterior comercialização.

## Stack atual

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- React Router
- TanStack Query
- jsPDF
- jsPDF AutoTable
- Recharts
- Zod

## Módulos atuais

- Painel de controle
- Empresas
- Equipamentos
- Contratos
- Ordens de Serviço
- Orçamentos
- Protocolos
  - Protocolo de recolhimento
  - Protocolo de entrega
- Procedimentos de preventiva
- Campos gerenciais
  - Tipos de equipamento
  - Tipos de OS
  - Estados da OS
  - Peças

## Observação técnica importante

A versão atual ainda utiliza estado local em React para armazenar e manipular dados em memória.

Ainda não há, nesta etapa:

- banco de dados persistente;
- autenticação de usuários;
- controle de permissões;
- auditoria;
- backup;
- segregação multiempresa;
- API backend dedicada.

Esses itens fazem parte do roadmap técnico e serão implementados progressivamente.

## Objetivos da evolução técnica

1. Organizar a base do projeto.
2. Documentar a estrutura atual.
3. Remover dependência operacional do protótipo original no Lovable.
4. Criar estrutura preparada para banco de dados.
5. Implementar autenticação e permissões.
6. Migrar dados locais para persistência real.
7. Criar relatórios e documentos em PDF.
8. Preparar o sistema para uso interno seguro.
9. Futuramente preparar a base para modelo SaaS.

## Como rodar localmente

Instale as dependências:

```bash
npm install