# 📊 Referência Técnica: Ciência de Dados & Redes Neurais

> **Unidade Curricular:** Ciência de Dados (80 horas / 20 Semanas)  
> **Objetivo:** Transformar medições de telemetria industrial em diagnósticos preditivos através do ciclo CRISP-DM, redes neurais e indicadores OEE.

---

## 1. Metodologia CRISP-DM Aplicada ao Factory Hub

O ciclo **CRISP-DM (Cross-Industry Standard Process for Data Mining)** orienta a solução de inteligência artificial da célula fabril:

```mermaid
flowchart LR
    BU["1. Business\nUnderstanding"] --> DU["2. Data\nUnderstanding"]
    DU --> DP["3. Data\nPreparation"]
    DP --> M["4. Modeling\n(Rede Neural)"]
    M --> E["5. Evaluation\n(Custos de Erro)"]
    E --> D["6. Deployment\n(Flask API)"]
    E -.->|Refinamento| BU
```

1. **Business Understanding (Entendimento do Negócio):**
   - Paradas não programadas no fuso de usinagem geram perdas de até \$1.500/hora.
   - O custo de um **Falso Negativo (deixar quebrar)** é drasticamente superior ao custo de um **Falso Positivo (inspeção preventiva desnecessária)**.
2. **Data Understanding (Entendimento dos Dados):**
   - Análise de correlação entre Temperatura do Mancal, Vibração RMS e Velocidade de Rotação (RPM).
   - Identificação de ruídos de amostragem e valores ausentes (*missing values*).
3. **Data Preparation (Preparação dos Dados):**
   - Normalização dos atributos via `StandardScaler` ($\mu = 0, \sigma = 1$).
   - Construção de janelas deslizantes (*sliding windows*) para incorporar dinâmica temporal.
4. **Modeling (Modelagem):**
   - Treinamento de Rede Neural **MLP (Multilayer Perceptron)** para classificação supervisionada de risco de anomalia.
5. **Evaluation (Avaliação):**
   - Priorização da métrica **Recall** para a classe de anomalia, complementada por F1-Score e Curva ROC-AUC.
6. **Deployment (Implantação):**
   - Exportação dos pesos do modelo (`.joblib` / `.pt`) e disponibilização via microsserviço Python Flask com endpoint `/predict`.

---

## 2. Séries Temporais Industriais (Time Series)

A telemetria dos sensores é modelada como uma série temporal multivariada:
$$Y(t) = T(t) + S(t) + R(t)$$
Onde:
- $T(t)$ (**Tendência**): Degradação lenta e contínua do rolamento ao longo de horas ou dias de trabalho.
- $S(t)$ (**Sazonalidade**): Flutuação de temperatura decorrente do aquecimento diurno no galpão industrial.
- $R(t)$ (**Resíduo / Anomalia**): Choques mecânicos abruptos, perda momentânea de lubrificação ou vibração excêntrica.

### Médias Móveis Ponderadas (EWMA)
Para suavizar ruído de amostragem instantâneo sem atrasar a detecção de anomalias:
$$\text{EWMA}_t = \alpha \cdot Y_t + (1 - \alpha) \cdot \text{EWMA}_{t-1}$$
Onde $\alpha \in [0.1, 0.3]$ confere maior peso às leituras recentes.

---

## 3. Arquitetura da Rede Neural (MLP)

A rede neural supervisionada atua na classificação binária:
- `Classe 0`: Operação Estável / Regular.
- `Classe 1`: Risco Iminente de Falha / Anomalia Mecânica.

### 3.1. Topologia da Rede
```text
Entrada (3 atributos): [Temperatura Normalizada, Vibração Normalizada, RPM Normalizado]
       │
       ▼
Camada Oculta 1: Dense(64 neurônios, ativação ReLU)
       │
       ▼
Camada de Regularização: Dropout(taxa = 0.20)
       │
       ▼
Camada Oculta 2: Dense(32 neurônios, ativação ReLU)
       │
       ▼
Camada de Saída: Dense(1 neurônio, ativação Sigmoide) -> Probabilidade p ∈ [0, 1]
```

### 3.2. Função de Perda (Binary Cross-Entropy com Pesos)
Para compensar o desbalanceamento de classes (falhas ocorrem em menos de 5% das amostras normais):
$$\mathcal{L} = - \left( w_1 \cdot y \log(\hat{p}) + w_0 \cdot (1 - y) \log(1 - \hat{p}) \right)$$
Onde $w_1 > w_0$ penaliza severamente os falsos negativos.

---

## 4. OEE — Overall Equipment Effectiveness

O OEE é o indicador global de eficiência fabril adotado pelo padrão internacional:
$$\text{OEE} = \text{Disponibilidade} \times \text{Performance} \times \text{Qualidade}$$

### 4.1. As Três Dimensões
1. **Disponibilidade ($A$):**
   $$A = \frac{\text{Tempo Operacional}}{\text{Tempo Planejado de Produção}} \times 100\%$$
   *Perdas:* Quebras de máquina, falta de energia, setup demorado.
2. **Performance ($P$):**
   $$P = \frac{\text{Produção Real}}{\text{Capacidade Nominal Teórica}} \times 100\%$$
   *Perdas:* Pequenas paradas de alimentação, velocidade reduzida por operador.
3. **Qualidade ($Q$):**
   $$Q = \frac{\text{Peças Boas}}{\text{Peças Totais Produzidas}} \times 100\%$$
   *Perdas:* Peças refugadas, retrabalho e defeitos dimensionais.

### 4.2. Classificação de Classe Mundial
- **OEE < 65%:** Baixa eficiência; perdas financeiras expressivas.
- **65% ≤ OEE < 85%:** Padrão industrial típico com oportunidades claras de melhoria.
- **OEE ≥ 85%:** *World Class Manufacturing* (Classe Mundial).

