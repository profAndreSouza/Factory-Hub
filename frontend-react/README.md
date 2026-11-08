# 🖥️ Frontend Factory Hub — Portal & Apostila Viva

Este é o frontend da plataforma **Factory Hub**, desenvolvido em **React 18**, **TypeScript**, **Vite** e **Tailwind CSS**.

Ele foi projetado como um **Portal Educacional Interativo e Apostila Viva**, integrando as 4 disciplinas:
1. **Automação Industrial:** Teoria de sinais OT/IT, protocolo MQTT, ciclo de vida de alertas com histerese e simulador ESP32 Wokwi mock.
2. **Ciência de Dados:** Metodologia CRISP-DM, séries temporais, calculadora interativa de OEE e playground com inferência da Rede Neural MLP.
3. **Computação em Nuvem:** Topologia AWS Academy (VPC, LabRole, SQS, EC2, RDS) e simulador do buffer SQS sob rajada.
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

