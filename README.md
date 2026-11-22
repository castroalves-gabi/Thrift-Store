# Ammi Maju

Loja virtual em React e Vite, com catálogo e painel administrativo integrados ao Supabase. O carrinho e os favoritos ficam no navegador; preços, estoque, cupons e pedidos são validados no servidor. Os pagamentos são encaminhados ao Mercado Pago.

## Requisitos

- Node.js 20.19+ ou 22.12+.
- Projeto Supabase.
- Projeto Vercel para publicar as funções de API (ou Vercel CLI para executá-las localmente).
- Credenciais Mercado Pago para habilitar pagamentos.
- Token Melhor Envio, CEP de origem e dimensões/pesos reais dos produtos para cotações.

## Configuração

1. Instale as dependências com `npm install`.
2. Copie `.env.example` para `.env.local` e preencha as variáveis. Não publique nem compartilhe esse arquivo.
3. No Supabase, revise e execute manualmente `supabase/migrations/20261122060000_create_store.sql`. A migração cria tabelas, políticas RLS, funções de reserva de estoque e o bucket de imagens; ela não é executada pela aplicação.
4. Crie uma conta de usuário pelo Supabase Auth. Depois, promova somente a conta da responsável a administradora no SQL Editor, usando o UUID do usuário:

   ```sql
   update public.profiles
   set role = 'admin'
   where id = 'UUID-DO-USUARIO';
   ```

5. Configure as variáveis de ambiente da Vercel e faça o deploy. `APP_URL` deve ser a URL pública HTTPS da loja; a URL do webhook de pagamento é `/api/checkout/webhook`.
6. Entre em `/admin`, cadastre produtos reais com fotos, peso e dimensões da embalagem, e configure retirada, política de privacidade e condições de compra. O checkout permanece bloqueado enquanto as políticas não estiverem publicadas.

`SUPABASE_SERVICE_ROLE_KEY`, `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_WEBHOOK_SECRET` e `MELHOR_ENVIO_TOKEN` são segredos de servidor. Nunca use prefixo `VITE_` nessas chaves. Apenas URL e chave pública anon do Supabase e o telefone público do WhatsApp devem ser expostos ao frontend.

## Desenvolvimento e validação

`npm run dev` inicia somente o frontend Vite. Como as rotas em `api/` são funções serverless, use a Vercel CLI para testar o aplicativo integrado localmente:

```sh
npx vercel dev
```

Configure as variáveis no ambiente local da Vercel ou em `.env.local` antes de testar APIs. Sem credenciais e configuração do Supabase, checkout, administração, catálogo remoto, pagamentos e frete não estarão disponíveis.

```sh
npm test
npm run build
```

Não há produtos de demonstração: o catálogo começa vazio e só publica itens cadastrados pela administração.

## Operação do checkout

- O servidor recalcula preços e estoque e reserva as peças durante 20 minutos.
- O Mercado Pago confirma os pedidos pelo webhook assinado; pagamentos aprovados fora da reserva não são aceitos como pedido e podem ser estornados.
- Frete exige dimensões e pesos verdadeiros, CEP de origem e credenciais Melhor Envio. Confirme a configuração no ambiente da loja antes de aceitar pedidos.
- Retirada fica indisponível até a equipe informar um endereço no painel. A entrega local é restrita a Porto Alegre, tem custo combinado à parte pelo WhatsApp e não é somada ao valor cobrado pelo Mercado Pago.
- Não execute a migração de banco em produção sem revisar primeiro o SQL e escolher o projeto/ambiente corretos.
