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

A infraestrutura e a entrega da aplicacao usam workflows separados:

1. Execute `.github/workflows/bootstrap-state.yml` uma vez antes do primeiro Terraform. Informe um bucket S3 globalmente unico com prefixo `factoryhub-state-`; o workflow protege o bucket e mostra o nome para cadastrar em `TF_STATE_BUCKET`.
2. Execute `.github/workflows/terraform.yml` manualmente para `init`, validacao, `plan` e `apply` com state remoto S3. O `apply` ocorre automaticamente apos o `plan`; o workflow pode criar recursos e gerar custos.
3. Para publicar, execute `.github/workflows/publish-dockerhub.yml` manualmente na branch `main`. Depois dos quality gates, publica as imagens Flask e Java no Docker Hub, envia o build React ao S3 e invalida o cache CloudFront. Antes da primeira publicacao, configure `FRONTEND_BUCKET_NAME` e `CLOUDFRONT_DISTRIBUTION_ID` usando os outputs Terraform.
4. O workflow `.github/workflows/deploy-ssm.yml` e iniciado manualmente com o SHA completo de 40 caracteres ja publicado. Ele atualiza os servicos backend na EC2 privada via Systems Manager, sem abrir a porta 22, e executa:
   ```bash
   docker compose -f docker-compose.cloud.yml pull
   docker compose -f docker-compose.cloud.yml up -d --remove-orphans
   ```

A interface React e servida por CloudFront/S3; as requisicoes `/api/*` seguem pelo ALB ate a EC2 privada. Publicar frontend e imagens nao faz deploy do backend: essa etapa requer o workflow SSM separado.