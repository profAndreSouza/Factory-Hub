# Aula 5 — Frontend React e contrato de integração

## Objetivos

- Entender componentes, páginas, serviços HTTP e tipos do React.
- Demonstrar a regra de comunicação navegador → Java.
- Relacionar resposta REST a cards, gráficos, tabelas e alertas.
- Apresentar estados de carregamento, erro e ausência de dados.

## Explicação para a turma

O frontend é uma aplicação React/TypeScript. No ambiente local e no E2E, o Nginx serve o build e encaminha `/api` ao backend Java. Na AWS, o build é publicado como arquivos estáticos no S3 privado e servido por CloudFront; o comportamento `/api/*` do CloudFront encaminha as chamadas ao ALB público e daí ao backend Java na EC2 privada. Em ambos os ambientes, o navegador chama somente a API Java e não acessa Flask, InfluxDB ou PostgreSQL diretamente.

Tipos TypeScript registram o contrato esperado, mas o backend continua sendo a fonte de verdade. A interface precisa tratar falhas, valores ausentes, datas e diferentes origens de dados sem inventar estados de serviços localmente.

## Prática guiada

1. Localizar a página inicial, o dashboard Smart N1 e a página de Ciência de Dados.
2. Abrir `telemetryService.ts` e identificar a rota Java usada por cada tabela.
3. No navegador, observar requisições `/api/v1/...`; confirmar que não existem chamadas diretas para a URL do Flask ou dos bancos.
4. No dashboard, comparar leituras brutas do InfluxDB com consolidações do RDS.
5. Identificar no painel indicação de carregamento, erro e tabela vazia.
6. Alterar uma página localmente, executar `npm test`, `npm run lint` e `npm run build`.

## Evidência de aprendizagem

Entregar diagramas de sequência local e cloud para uma solicitação de predição: navegador → Nginx → Java no Compose local e navegador → CloudFront → ALB → Java na AWS; em ambos, Java chama Flask internamente. Indicar os corpos da requisição e da resposta.

## Tarefa

Adicionar uma descrição curta a um indicador existente e conferir que a alteração continua passando lint, teste e build.

## Referências

- [Frontend React](../frontend-react/)
- [Contratos da API](../docs/05_contratos_e_especificacoes.md)
- [Nginx e proxy da API](../frontend-react/nginx.conf)
