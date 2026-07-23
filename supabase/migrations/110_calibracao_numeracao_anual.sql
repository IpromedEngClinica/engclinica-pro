-- ============================================================
-- Ipromed - Sistema de Gestao
-- Migration: 110_calibracao_numeracao_anual.sql
-- Objetivo:
-- - Gerar certificados no formato AAAAMMNNNN
-- - Manter o contador sequencial durante o ano e reinicia-lo no ano seguinte
-- - Preservar numeros informados explicitamente em importacoes historicas
-- - Renumerar os dois certificados que inauguram a sequencia em julho/2026
-- ============================================================

create table if not exists public.calibracao_numero_contadores (
  organizacao_id uuid not null references public.organizacoes(id) on delete cascade,
  ano integer not null,
  ultimo_numero integer not null default 0,
  updated_at timestamp with time zone not null default now(),
  primary key (organizacao_id, ano),
  constraint calibracao_numero_contadores_ano_check check (ano between 2000 and 9999),
  constraint calibracao_numero_contadores_valor_check check (ultimo_numero between 0 and 9999)
);

alter table public.calibracao_numero_contadores enable row level security;

alter table public.calibracao_execucoes
  alter column numero_certificado drop identity if exists;

alter table public.calibracao_execucoes
  drop constraint if exists calibracao_execucoes_numero_certificado_key;

create unique index if not exists ux_calibracao_execucoes_organizacao_numero
  on public.calibracao_execucoes (organizacao_id, numero_certificado);

create or replace function public.proximo_numero_certificado_calibracao(
  p_organizacao_id uuid,
  p_data_emissao date default current_date
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_data date := coalesce(p_data_emissao, current_date);
  v_ano integer := extract(year from v_data)::integer;
  v_mes integer := extract(month from v_data)::integer;
  v_sequencial integer;
begin
  if p_organizacao_id is null then
    raise exception 'Organizacao obrigatoria para gerar o numero do certificado.';
  end if;

  insert into public.calibracao_numero_contadores (
    organizacao_id,
    ano,
    ultimo_numero,
    updated_at
  )
  values (p_organizacao_id, v_ano, 1, now())
  on conflict (organizacao_id, ano) do update
  set
    ultimo_numero = public.calibracao_numero_contadores.ultimo_numero + 1,
    updated_at = now()
  returning ultimo_numero into v_sequencial;

  if v_sequencial > 9999 then
    raise exception 'Limite anual de 9999 certificados de calibracao atingido para %.', v_ano;
  end if;

  return (
    v_ano::text
    || lpad(v_mes::text, 2, '0')
    || lpad(v_sequencial::text, 4, '0')
  )::bigint;
end;
$$;

revoke all on function public.proximo_numero_certificado_calibracao(uuid, date) from public;

create or replace function public.definir_numero_certificado_calibracao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.numero_certificado is null then
    new.numero_certificado := public.proximo_numero_certificado_calibracao(
      new.organizacao_id,
      coalesce(new.data_emissao, new.data_calibracao, current_date)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_definir_numero_certificado_calibracao
  on public.calibracao_execucoes;

create trigger trg_definir_numero_certificado_calibracao
before insert on public.calibracao_execucoes
for each row execute function public.definir_numero_certificado_calibracao();

-- Os dois certificados abaixo foram as primeiras emissoes da nova numeracao.
update public.calibracao_execucoes
set
  numero_certificado = 2026070001,
  pdf_storage_path = 'ef36d886-f864-4957-aac9-2631a779a546/86f46b65-0971-445b-9d26-8147ba6658e7/CAL-2026070001.pdf',
  pdf_hash = '927e83a4b24f8e34e882c3328788dbcf613cdbddc802da06c0bc6c98e7e05b15'
where id = '86f46b65-0971-445b-9d26-8147ba6658e7'
  and numero_certificado = 9;

update public.calibracao_execucoes
set
  numero_certificado = 2026070002,
  pdf_storage_path = 'ef36d886-f864-4957-aac9-2631a779a546/f20aba07-009f-4a8a-bf2f-ab2e32232079/CAL-2026070002.pdf',
  pdf_hash = '8fedd9f89bca1f33e764b4f22b745a6bb454c779ec15c041fef46bbfa4e2296a'
where id = 'f20aba07-009f-4a8a-bf2f-ab2e32232079'
  and numero_certificado = 10;

update public.ordens_servico os
set descricao_servico = 'Calibracao executada. Certificado CAL-2026070001.'
from public.calibracao_execucoes ce
where ce.id = '86f46b65-0971-445b-9d26-8147ba6658e7'
  and os.id = ce.os_id
  and os.descricao_servico = 'Calibracao executada. Certificado CAL-000009.';

update public.ordens_servico os
set descricao_servico = 'Calibracao executada. Certificado CAL-2026070002.'
from public.calibracao_execucoes ce
where ce.id = 'f20aba07-009f-4a8a-bf2f-ab2e32232079'
  and os.id = ce.os_id
  and os.descricao_servico = 'Calibracao executada. Certificado CAL-000010.';

insert into public.calibracao_numero_contadores (
  organizacao_id,
  ano,
  ultimo_numero,
  updated_at
)
values (
  'ef36d886-f864-4957-aac9-2631a779a546',
  2026,
  2,
  now()
)
on conflict (organizacao_id, ano) do update
set
  ultimo_numero = greatest(public.calibracao_numero_contadores.ultimo_numero, 2),
  updated_at = now();

notify pgrst, 'reload schema';

-- Fim da migration 110_calibracao_numeracao_anual.sql
