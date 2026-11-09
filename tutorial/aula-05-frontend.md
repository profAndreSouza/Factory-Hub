# Aula 5 — Frontend React e contrato de integração

## Objetivos

- Entender componentes, páginas, serviços HTTP e tipos do React.
- Demonstrar a regra de comunicação navegador → Java.
- Relacionar resposta REST a cards, gráficos, tabelas e alertas.
- Apresentar estados de carregamento, erro e ausência de dados.

## Explicação para a turma

O frontend é uma aplicação React/TypeScript servida pelo Nginx. As funções em `frontend-react/src/services` enviam requisições para `/api`. No ambiente cloud, o Nginx encaminha esse caminho ao backend Java. Isso mantém Flask, InfluxDB e PostgreSQL fora do bundle e do tráfego direto do navegador.

Tipos TypeScript registram o contrato esperado, mas o backend continua sendo a fonte de verdade. A interface precisa tratar falhas, valores ausentes, datas e diferentes origens de dados sem inventar estados de serviços localmente.

## Prática guiada

1. Localizar a página inicial, o dashboard Smart N1 e a página de Ciência de Dados.
2. Abrir `telemetryService.ts` e identificar a rota Java usada por cada tabela.
3. No navegador, observar requisições `/api/v1/...`; confirmar que não existem chamadas diretas para a URL do Flask ou dos bancos.
4. No dashboard, comparar leituras brutas do InfluxDB com consolidações do RDS.
5. Identificar no painel indicação de carregamento, erro e tabela vazia.
6. Alterar uma página localmente, executar `npm test`, `npm run lint` e `npm run build`.

## Evidência de aprendizagem

Entregar um diagrama de sequência com navegador, Nginx, Java e Flask para uma solicitação de predição, indicando os corpos da requisição e da resposta.

## Tarefa

Adicionar uma descrição curta a um indicador existente e conferir que a alteração continua passando lint, teste e build.

## Referências

- [Frontend React](../frontend-react/)
- [Contratos da API](../docs/05_contratos_e_especificacoes.md)
- [Nginx e proxy da API](../frontend-react/nginx.conf)
