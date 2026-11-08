# 🚀 Referência Técnica: Integração e Entrega Contínua (DevOps)

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

## 3. Pirâmide de Testes & Quality Gates

```
       / \
      / E2E \       Testes Ponta a Ponta (Simulação ESP32 até Dashboard React)
     /───────\
    / Integração \   Testes de Rotas HTTP, processamento SQS pela Lambda e conexões InfluxDB/PostgreSQL
   /───────────────\
  /    Unitários    \ Testes Isolados (JUnit 5 para regras OEE, Pytest para ML)
 /───────────────────\
```

### Quality Gate Obrigatório no CI:
O pipeline do GitHub Actions impede o merge para `main` se:
1. Qualquer teste unitário ou de integração falhar.
2. A cobertura de código for inferior a **80%**.
3. O linter acusar violações de estilo de código.

---

## 4. Pipeline de CI/CD (GitHub Actions)

O arquivo `.github/workflows/ci-cd.yml` orquestra o ciclo completo:
1. **Job `test`:** Executa a matriz de testes para Java (Maven) e Python (Pytest).
2. **Job `build-and-push`:** Constrói as imagens Docker multi-stage e publica no Docker Hub com duas tags: `latest` e o SHA do commit (`sha-${{ github.sha }}`).
3. **Job `deploy`:** Autentica nas APIs AWS com as credenciais temporárias do Learner Lab, envia um `AWS-RunShellScript` pelo Systems Manager Run Command e acompanha o resultado. A EC2 recebe o comando pelo SSM Agent usando apenas conexões de saída HTTPS/443; a porta 22 não é aberta. O comando executa:
   ```bash
   cd /opt/factoryhub
   git fetch origin main && git reset --hard origin/main
   IMAGE_TAG=sha-${GITHUB_SHA} docker compose -f docker-compose.cloud.yml pull
   IMAGE_TAG=sha-${GITHUB_SHA} docker compose -f docker-compose.cloud.yml up -d --remove-orphans
   ```

O workflow está em `.github/workflows/deploy-ssm.yml`. O GitHub Actions precisa dos secrets `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`, `DOCKERHUB_USERNAME` e `DOCKERHUB_TOKEN`; renove as credenciais AWS Academy quando expirarem.

