# Roadmap Técnico — EngClinica Pro

Este documento registra a evolução planejada do EngClinica Pro a partir da cópia técnica independente do projeto original criado no Lovable.

## Objetivo geral

Transformar o protótipo atual em um sistema seguro, organizado e escalável para gestão de engenharia clínica e assistência técnica hospitalar.

## Fase 1 — Organização inicial do projeto

Status: em andamento.

### Objetivos

- Renomear o projeto.
- Documentar a finalidade do sistema.
- Criar arquivos base de configuração.
- Criar documentação técnica inicial.
- Mapear os módulos existentes.
- Preparar o projeto para futura persistência em banco de dados.

### Entregas

- `README.md` atualizado.
- `.env.example` criado.
- Pasta `docs/` criada.
- Roadmap técnico inicial.
- Registro dos módulos atuais.
- Identificação dos principais riscos técnicos.

## Fase 2 — Modelo de dados e banco

Status: planejado.

### Objetivos

Substituir progressivamente o armazenamento em memória por persistência real em banco de dados.

### Entidades prioritárias

- Usuários
- Empresas
- Equipamentos
- Ordens de Serviço
- Orçamentos
- Protocolos
- Procedimentos de preventiva
- Campos gerenciais
- Anexos
- Auditoria

### Decisão técnica inicial

Avaliar uso de Supabase/PostgreSQL para validação rápida, mantendo possibilidade futura de migração para backend próprio.

## Fase 3 — Autenticação e permissões

Status: planejado.

### Perfis previstos

- Administrador
- Gestor
- Técnico
- Orçamentista
- Financeiro
- Cliente externo

### Requisitos

- Login seguro.
- Controle de sessão.
- Recuperação de senha.
- Bloqueio de rotas.
- Permissões por perfil.
- Auditoria de ações críticas.

## Fase 4 — Operação interna

Status: planejado.

### Melhorias previstas

- Dashboard com indicadores reais.
- Histórico completo por equipamento.
- Controle de preventivas.
- Controle de calibrações.
- Relatórios de OS por técnico.
- Anexos e fotos por OS.
- PDFs padronizados.
- Exportações em Excel/PDF.

## Fase 5 — Preparação comercial

Status: planejado.

### Melhorias previstas

- Estrutura multiempresa.
- Separação de dados por cliente.
- Backups automáticos.
- Monitoramento.
- Deploy profissional.
- Termos de uso.
- Política de privacidade.
- Adequação à LGPD.
- Modelo de planos/assinaturas.

## Riscos técnicos atuais

1. Dados ainda estão em memória no frontend.
2. Não há autenticação real.
3. Não há controle de permissões.
4. Não há auditoria.
5. IDs são gerados no frontend.
6. Relacionamentos usam nomes em vez de IDs em algumas áreas.
7. Dashboard contém valores estáticos.
8. Ainda não há estratégia formal de backup.
9. Ainda não há segregação multiempresa.
10. Ainda não há backend/API dedicada.

## Prioridade imediata

A prioridade imediata é estabilizar a base técnica, documentar o estado atual e preparar a migração futura para banco de dados e autenticação.