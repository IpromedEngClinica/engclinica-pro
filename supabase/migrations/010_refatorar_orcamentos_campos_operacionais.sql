-- ============================================================
-- EngClinica Pro
-- Migration: 010_refatorar_orcamentos_campos_operacionais.sql
-- Objetivo:
-- - Adicionar campos operacionais ao orcamento
-- - Suportar orcamento de servico, pecas e pecas + servicos
-- - Suportar orcamento avulso ou vinculado a OS
-- - Adicionar campos financeiros e comerciais
-- ============================================================

alter table public.orcamentos
add column if not exists tipo_orcamento text not null default 'servico';

alter table public.orcamentos
add column if not exists origem text not null default 'avulso';

alter table public.orcamentos
add column if not exists forma_pagamento text;

alter table public.orcamentos
add column if not exists modo_pagamento text;

alter table public.orcamentos
add column if not exists numero_parcelas integer;

alter table public.orcamentos
add column if not exists valor_entrada numeric(14,2);

alter table public.orcamentos
add column if not exists valor_parcela numeric(14,2);

alter table public.orcamentos
add column if not exists valor_pecas numeric(14,2) not null default 0;

alter table public.orcamentos
add column if not exists valor_servicos numeric(14,2) not null default 0;

alter table public.orcamentos
add column if not exists prazo_entrega text;

alter table public.orcamentos
add column if not exists frete text;

alter table public.orcamentos
add column if not exists detalhes_orcamento text;

alter table public.orcamentos
add column if not exists responsavel_orcamentista text not null default 'Icaro Rezende';

alter table public.orcamentos
drop constraint if exists orcamentos_tipo_orcamento_check;

alter table public.orcamentos
add constraint orcamentos_tipo_orcamento_check check (
  tipo_orcamento in ('servico', 'pecas', 'pecas_servicos')
);

alter table public.orcamentos
drop constraint if exists orcamentos_origem_check;

alter table public.orcamentos
add constraint orcamentos_origem_check check (
  origem in ('os', 'avulso')
);

alter table public.orcamentos
drop constraint if exists orcamentos_forma_pagamento_check;

alter table public.orcamentos
add constraint orcamentos_forma_pagamento_check check (
  forma_pagamento is null
  or forma_pagamento in ('dinheiro', 'cartao', 'boleto', 'pix')
);

alter table public.orcamentos
drop constraint if exists orcamentos_modo_pagamento_check;

alter table public.orcamentos
add constraint orcamentos_modo_pagamento_check check (
  modo_pagamento is null
  or modo_pagamento in ('avista', 'parcelado', 'entrada_parcela')
);

alter table public.orcamentos
drop constraint if exists orcamentos_frete_check;

alter table public.orcamentos
add constraint orcamentos_frete_check check (
  frete is null
  or frete in ('cif', 'fob')
);

alter table public.orcamento_itens
drop constraint if exists orcamento_itens_tipo_check;

alter table public.orcamento_itens
add constraint orcamento_itens_tipo_check check (
  tipo in ('servico', 'peca', 'deslocamento', 'outro')
);

alter table public.orcamento_itens
add column if not exists garantia text;

alter table public.orcamento_itens
add column if not exists tipo_servico_id uuid null references public.tipos_os(id) on delete set null;

alter table public.orcamento_itens
add column if not exists tipo_equipamento_id uuid null references public.tipos_equipamento(id) on delete set null;

alter table public.orcamento_itens
add column if not exists peca_id uuid null references public.pecas(id) on delete set null;

alter table public.orcamento_itens
add column if not exists peca_nome text;

create or replace function public.recalcular_total_orcamento(p_orcamento_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orcamentos
  set
    valor_pecas = coalesce(
      (
        select sum(valor_total)
        from public.orcamento_itens
        where orcamento_id = p_orcamento_id
          and tipo = 'peca'
      ),
      0
    ),
    valor_servicos = coalesce(
      (
        select sum(valor_total)
        from public.orcamento_itens
        where orcamento_id = p_orcamento_id
          and tipo in ('servico', 'deslocamento', 'outro')
      ),
      0
    ),
    valor_total = coalesce(
      (
        select sum(valor_total)
        from public.orcamento_itens
        where orcamento_id = p_orcamento_id
      ),
      0
    )
  where id = p_orcamento_id;
end;
$$;

alter function public.recalcular_total_orcamento(uuid) owner to postgres;

create index if not exists idx_orcamentos_tipo_orcamento
on public.orcamentos (tipo_orcamento);

create index if not exists idx_orcamentos_origem
on public.orcamentos (origem);

create index if not exists idx_orcamento_itens_tipo_servico
on public.orcamento_itens (tipo_servico_id);

create index if not exists idx_orcamento_itens_tipo_equipamento
on public.orcamento_itens (tipo_equipamento_id);

create index if not exists idx_orcamento_itens_peca
on public.orcamento_itens (peca_id);
