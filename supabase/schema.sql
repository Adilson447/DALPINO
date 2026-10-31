-- Dalpino Clinic · registro anônimo da Dara (rode uma vez no SQL Editor do Supabase)
-- Sem nome, telefone ou IP. Retenção de 90 dias.

create table if not exists public.chat_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  pergunta text not null,
  procedimento_sugerido text,
  clicou_whatsapp boolean not null default false
);

-- Contador do limite por visitante: hash do IP (nunca o IP) + janela de 1 hora.
create table if not exists public.chat_rate (
  ip_hash text not null,
  janela text not null,
  total int not null default 0,
  primary key (ip_hash, janela)
);

create or replace function public.contar_mensagem(p_hash text, p_janela text)
returns int language sql security definer set search_path = public as $$
  insert into chat_rate (ip_hash, janela, total) values (p_hash, p_janela, 1)
  on conflict (ip_hash, janela) do update set total = chat_rate.total + 1
  returning total;
$$;

-- Só a chave de serviço (usada pela função da Vercel) acessa. O navegador nunca fala com o Supabase.
alter table public.chat_logs enable row level security;
alter table public.chat_rate enable row level security;
revoke all on public.chat_logs, public.chat_rate from anon, authenticated;
revoke execute on function public.contar_mensagem(text, text) from anon, authenticated, public;

-- Limpeza diária: logs com mais de 90 dias e contadores com mais de 2 dias.
create extension if not exists pg_cron;
select cron.schedule('dalpino-limpeza', '15 3 * * *', $$
  delete from public.chat_logs where created_at < now() - interval '90 days';
  delete from public.chat_rate where janela < to_char(now() - interval '2 days', 'YYYY-MM-DD"T"HH24');
$$);

-- Relatório para a mensalidade: conversas e cliques no WhatsApp por mês.
create or replace view public.chat_resumo_mensal as
select date_trunc('month', created_at) as mes,
       count(*) as conversas,
       count(*) filter (where clicou_whatsapp) as cliques_whatsapp,
       mode() within group (order by procedimento_sugerido) as categoria_mais_pedida
from public.chat_logs group by 1 order by 1 desc;
