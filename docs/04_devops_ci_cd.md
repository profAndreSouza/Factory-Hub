# Referência Técnica: Integração e Entrega Contínua (DevOps)

> **Unidade Curricular:** Integração e Entrega Contínua — DevOps (40 horas / 20 Semanas)  
> **Objetivo:** Estabelecer uma esteira automatizada de build, testes, empacotamento em contêineres versionados e entrega contínua na AWS.

---

## 1. Princípios DevOps e Cultura CALMS

O ecossistema Factory Hub é fundamentado nos cinco pilares do framework **CALMS**:
- **Culture (Cultura):** Colaboração contínua entre desenvolvedores, cientistas de dados e engenheiros de automação.
- **Automation (Automação):** Eliminação de passos manuais de build, testes e deploy através do GitHub Actions.
- **Lean (Fluxo Enxuto):** Entregas frequentes em lotes pequenos (*small batches*) reduzindo o tempo de ciclo (*lead time*).
- **Measurement (Medição):** Observabilidade em tempo real com health-checks, logs estruturados e métricas de sistema.
- **Sharing (Compartilhamento):** Rastreabilidade total entre Issues, Pull Requests, Commits e Imagens Docker imutáveis.

---

## 2. Estratégia de Versionamento e Fluxo GitFlow

### 2.1. Topologia de Branches
```
main ─────────────●──────[v1.0.0]────────────────────────●──────[v1.1.0]───
                   \                                    /
release/v1.1.0      \                             ●────● (Homologação)
                     \                           /
develop ──────────────●────────●────────────────●──────────────────────────
                       \      /                /
feature/oee-calc        ●────●                /
                               \             /
feature/neural-flask            ●───────────●
```

- **`main`:** Contém o código estável em produção na EC2. Todo merge gera uma tag SemVer imutável.
- **`develop`:** Linha de integração principal. Novos merges disparam suíte de testes de integração.
- **`feature/<nome>`:** Branches temporárias para novas funcionalidades, criadas a partir de `develop`.
- **`release/vX.Y.Z`:** Preparação e estabilização para lançamento.
- **`hotfix/<nome>`:** Correções emergenciais em produção ramificadas diretamente de `main`.

### 2.2. Conventional Commits e SemVer
Todo commit deve seguir a padronização:
```text
<tipo>[escopo opcional][! se breaking change]: <descrição no imperativo>
```
- `feat(oee): adiciona cálculo de perda por velocidade` -> Incrementa **MINOR** (`1.1.0` -> `1.2.0`).
- `fix(mqtt): corrige reconexão em caso de timeout` -> Incrementa **PATCH** (`1.1.0` -> `1.1.1`).
- `feat(api)!: altera formato do payload de predição` -> Incrementa **MAJOR** (`1.1.0` -> `2.0.0`).

---

## 3. Piramide de Testes & Quality Gates

O projeto combina testes unitarios, integracao HTTP, E2E no Chromium, lint estatico e construcao de imagens Docker sem publicacao. A suite E2E sobe a integracao React + Nginx + Java + Flask via Docker Compose; suites unitarias e de API usam fixtures para nao depender da AWS, RDS ou InfluxDB.

### Quality Gate Obrigatorio no CI
O workflow `ci.yml` chama o workflow reutilizavel `quality-gates.yml` em pull requests, pushes para `main`/`develop` e execucoes manuais. A publicacao manual chama os mesmos gates e so inicia o job do Docker Hub quando todos passam:

1. **Python lint:** Ruff verifica o codigo Flask, Lambda e testes.
2. **React lint:** ESLint verifica TypeScript, imports, hooks e variaveis nao utilizadas.
3. **Flask:** testes unitarios de preparacao temporal/treinamento e de integracao das rotas.
4. **Java:** testes de integracao HTTP e contratos REST com MockMvc.
5. **Lambda SQS:** testes unitarios do Line Protocol e de processamento parcial/validacao de payload.
6. **React:** testes unitarios, verificacao TypeScript e build de producao.
7. **E2E:** Chromium valida navegador -> Nginx -> API Java -> Flask em Docker Compose, alem do fluxo isolado com fixtures.
8. **Containers:** BuildKit construi as duas imagens de servico para producao com `push: false`; o frontend React e verificado pelo build estatico. O Compose E2E inicia e verifica os servicos integrados.

Qualquer falha bloqueia o job `publish`, que depende de `quality-gates`. Configure os jobs de lint, testes, E2E e Docker exibidos pela execucao `ci.yml` como checks obrigatorios nas regras de branch se quiser bloquear merges.
---

## 4. Workflows do GitHub Actions

O repositório possui pipelines separados:

1. `.github/workflows/deploy-ssm.yml` é acionado manualmente em **Actions → Deploy through SSM → Run workflow**. Informe o SHA completo de 40 caracteres de um commit já publicado. O workflow usa a imagem `sha-<commit>` e atualiza o código de configuração para o mesmo commit. A EC2 recebe o comando via Systems Manager Run Command; o SSM Agent usa conexão de saída HTTPS/443, sem abrir a porta 22. O workflow prepara Docker/Compose se necessário, lê os parâmetros de runtime no SSM, atualiza `.env` e executa:
   ```bash
   docker compose -f docker-compose.cloud.yml pull
   docker compose -f docker-compose.cloud.yml up -d --remove-orphans
   ```

2. `.github/workflows/terraform.yml` é iniciado manualmente e executa `init`, validação, `plan` e `apply` usando state remoto S3. O `apply` ocorre automaticamente após o `plan` dentro da mesma execução; iniciar o workflow provisiona recursos e pode gerar custos.

Para publicar, execute `.github/workflows/publish-dockerhub.yml` manualmente na branch `main`. Depois dos quality gates, o workflow publica as imagens Flask e Java no Docker Hub e envia o build estatico React ao S3, invalidando o cache CloudFront. Isso nao faz deploy do backend: inicie `deploy-ssm.yml` com o SHA completo publicado. O frontend e servido pelo CloudFront; `/api/*` segue pelo ALB ate a EC2 privada.
