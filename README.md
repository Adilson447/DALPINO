# Site Dalpino Clinic · v2

Site estático (HTML, CSS e JS sem framework) + duas funções na Vercel (`/api/chat` e `/api/clique`) para a Dara, a assistente virtual.

## Rodar no computador

```bash
npm install
npm run dev
```

Abre em http://localhost:4321. Sem `ANTHROPIC_API_KEY` no `.env.local`, a Dara responde em **modo de ensaio**, sem IA: dá para testar a tela, o cartão de procedimento e o botão do WhatsApp. A mensagem "erro" simula a falha de rede.

## Testar a Dara de verdade (os 9 casos do briefing)

1. Copie `.env.example` para `.env.local` e cole a sua `ANTHROPIC_API_KEY`.
2. Rode `npm run testar-dara`.
3. O resultado sai em `testes/resultado-dara.md`. Leia cada resposta, porque a conferência automática não substitui o olho.

## Publicar (Vercel)

1. Importe a pasta `v2` como projeto na Vercel, numa conta **Pro** (uso comercial).
2. Em Settings › Environment Variables, cadastre as variáveis do `.env.example`.
3. No Supabase (plano gratuito), rode `supabase/schema.sql` no SQL Editor e cadastre `SUPABASE_URL` e `SUPABASE_SERVICE_KEY` (a chave service_role, que fica só no servidor).
4. No console da Anthropic, defina o **limite mensal de gasto** (sugestão: US$ 10).
5. Em Analytics, ligue o Vercel Analytics.
6. Quando o domínio estiver definido, rode `SITE_URL=https://dominio npm run definir-url`, cadastre o domínio em `ALLOWED_ORIGINS` e publique de novo.

A Hostinger comum não roda a Dara, porque lá só existem arquivos parados. Para usar Cloudflare Pages no lugar da Vercel, as duas funções precisam ser adaptadas para o formato `functions/api/*.js` do Cloudflare (a lógica em `api/_lib/` é a mesma).

## Como a Ana atualiza um procedimento

Tudo sai de um único arquivo: **`data/catalogo.json`**. O site e a Dara leem o mesmo arquivo.

- **Mudar o nome ou a duração:** edite `"nome"` ou `"duracao"` do item.
- **Incluir um procedimento:** copie um item da mesma categoria, troque `id`, `nome` e `duracao`. O `id` precisa ser único (ex.: `estetica-facial--peeling-quimico`). `busca` são palavras que a pessoa pode digitar (sem acento).
- **Descrição:** o campo `"detalhe"` é opcional. Use só texto da clínica, com no máximo 2 frases, sem "garantido", "definitivo", "cura" ou preço.
- **Selo "Começa por uma avaliação":** `"comeca_por_avaliacao": true` na categoria.
- **Preço:** nunca. O site e a Dara não mostram valores.

Depois de salvar, publique de novo. A Dara passa a conhecer a mudança na próxima conversa.

## Onde fica cada coisa

| Arquivo | O que é |
|---|---|
| `index.html`, `assets/css/site.css`, `assets/js/site.js` | a página |
| `data/catalogo.json` | catálogo único (9 categorias, 107 itens) |
| `api/system-prompt.md` | as regras da Dara (o catálogo é inserido no lugar de `{{CATALOGO}}`) |
| `api/_lib/dara.js` | chamada ao Claude e conferência da resposta (só procedimentos que existem, sem preço, sem link) |
| `api/_lib/registro.js` | limite por visitante (hash do IP) e registro anônimo no Supabase |
| `supabase/schema.sql` | tabelas, limpeza automática de 90 dias e resumo mensal |
| `privacidade.html` | política de privacidade (texto-modelo, revisar) |
| `scripts/` | servidor local, testes da Dara, troca de domínio, gerador inicial do catálogo |
