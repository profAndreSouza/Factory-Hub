# 🖥️ Frontend Factory Hub — Portal & Apostila Viva

Este é o frontend da plataforma **Factory Hub**, desenvolvido em **React 18**, **TypeScript**, **Vite** e **Tailwind CSS**.

Na AWS, o Vite gera arquivos estáticos que o workflow publica no S3 privado; o CloudFront entrega a interface e encaminha `/api/*` ao ALB e ao backend Java na EC2 privada. O container Nginx deste repositório é usado para execução local e testes E2E, não para servir o frontend na stack AWS.

### Integração com as APIs

O navegador consome somente a API Java (`VITE_API_BASE_URL`, padrão local `http://localhost:8080`). A API Java encaminha internamente as inferências ao serviço Flask e agrega os estados dos serviços para o painel. O frontend não precisa conhecer nem acessar o endereço do Flask.

Rotas de negócio usadas pelo frontend: `/api/v1/maquinas`, `/api/v1/telemetria/{deviceId}/recente`, `/api/v1/indicadores/{deviceId}/oee`, `/api/v1/alertas`, `/api/v1/health` e `POST /api/v1/predicoes`. Consulte [os contratos da API](../docs/05_contratos_e_especificacoes.md) para os formatos esperados.

Ele foi projetado como um **Portal Educacional Interativo e Apostila Viva**, integrando as 4 disciplinas:
1. **Automação Industrial:** Teoria de sinais OT/IT, protocolo MQTT, ciclo de vida de alertas e telemetria do ESP32 no Wokwi encaminhada pelo AWS IoT Core.
2. **Ciência de Dados:** Metodologia CRISP-DM, séries temporais, calculadora interativa de OEE e playground de manutenção preditiva. As predições passam pelo backend Java e pelo modelo Flask treinado com o histórico do InfluxDB, que pode combinar dados de demonstração e telemetria recebida.
3. **Computação em Nuvem:** Topologia AWS Academy (VPC, ALB, NAT Gateway, EC2 privada, S3/CloudFront, SQS e RDS) e simulador do buffer SQS sob rajada.
4. **DevOps:** GitFlow, construtor guiado de Conventional Commits com cálculo de SemVer e visualizador da esteira GitHub Actions.
5. **Célula Fabril Smart N1:** Dashboard operacional com telemetria contínua e status de linha em tempo real.

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- Node.js 18+ ou 20+ instalado.
- NPM ou Yarn.

### Passo a Passo

1. Entre na pasta do frontend:
   ```bash
   cd "Factory Hub/frontend-react"
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

4. Acesse no navegador:
   👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🐳 Executando com Docker

1. Construir a imagem local:
   ```bash
   docker build -t factoryhub-frontend:latest .
   ```

2. Executar o contêiner:
   ```bash
   docker run -d -p 80:80 --name factoryhub-ui factoryhub-frontend:latest
   ```

3. Acesse em: `http://localhost`.

