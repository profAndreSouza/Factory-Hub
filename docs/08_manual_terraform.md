# Manual do Terraform e da infraestrutura AWS

Este manual explica a configuração Terraform do Factory Hub, os arquivos do diretório, os recursos provisionados e seus fluxos. O exemplo foi preparado para o AWS Academy Learner Lab.

> Terraform chama APIs AWS por HTTPS. A EC2 não recebe SSH: administração e deploy usam Systems Manager (SSM). O frontend é servido em HTTP, porta 80.

## 1. Arquitetura AWS provisionada

O Terraform cria os recursos AWS gerenciados. A aplicação, incluindo InfluxDB, Java, Flask e React, roda como containers Docker Compose dentro da EC2; não são serviços AWS separados.

~~~mermaid
flowchart TB
    DEVICE[ESP32 / Wokwi]
    subgraph AWS[Conta e região AWS]
      subgraph INGEST[Ingestão AWS]
        IOT[AWS IoT Core<br/>Topic Rule]
        SQS[Amazon SQS<br/>fila de telemetria]
        DLQ[Amazon SQS<br/>dead-letter queue]
        LAMBDA[AWS Lambda<br/>consumidor]
        IOT -->|Regra envia mensagens| SQS
        SQS -->|Event source mapping| LAMBDA
        SQS -.->|Após tentativas excedidas| DLQ
      end
      subgraph VPC[VPC Factory Hub · 10.40.0.0/16]
        IGW[Internet Gateway]
        subgraph PUBLIC[Sub-rede pública · AZ 1]
          EC2[EC2 · Amazon Linux 2023<br/>Docker + SSM Agent]
          subgraph DOCKER[Docker Compose na EC2]
            WEB[React / Nginx<br/>porta 80]
            JAVA[Backend Java<br/>porta interna 8080]
            FLASK[API Flask<br/>porta interna 5000]
            INFLUX[InfluxDB<br/>porta 8086]
          end
          EC2 --- WEB
          EC2 --- JAVA
          EC2 --- FLASK
          EC2 --- INFLUX
        end
        subgraph PRIVATE[Sub-redes privadas · 2 AZs]
          RDS[(RDS PostgreSQL<br/>privado · 5432)]
          ENI[ENIs da Lambda<br/>acesso à VPC]
          LOGS[Interface VPC Endpoint<br/>CloudWatch Logs]
        end
        EC2 -->|HTTPS de saída · 443| IGW
        JAVA -->|PostgreSQL · 5432| RDS
        ENI -->|InfluxDB · 8086| INFLUX
        ENI -->|Logs · 443| LOGS
      end
      PARAMS[Systems Manager<br/>Parameter Store]
      SSM[Systems Manager<br/>Run Command]
      GHA[GitHub Actions]
      S3[(Bucket S3 de state<br/>pré-criado)]
      IAM[Roles e instance profile IAM<br/>preexistentes]
      GHA <-->|State remoto e lock| S3
      GHA -->|Provisionamento · HTTPS 443| AWSAPI[AWS APIs]
      GHA -->|Comando de deploy · HTTPS 443| SSM
      SSM -.->|Agente inicia conexão HTTPS| EC2
      EC2 -->|Lê parâmetros de runtime| PARAMS
      IAM -.-> EC2
      LAMBDA -.->|Configuração VPC| ENI
      IAM -.-> LAMBDA
      IAM -.-> IOT
    end
    DEVICE -->|MQTTS · 8883| IOT
~~~

### Fluxos principais

1. O ESP32 publica no tópico MQTT industria/smartn1/telemetria. O certificado, chave e IoT Policy do dispositivo são configurados fora desta stack.
2. A Topic Rule envia a mensagem à fila SQS. O event source mapping aciona a Lambda; após falhas repetidas, a mensagem pode ir para a DLQ.
3. A Lambda grava a telemetria bruta no InfluxDB da EC2 e envia logs pelo endpoint privado de CloudWatch Logs.
4. Java, Flask, React e InfluxDB são containers. O Java acessa o RDS; portas 8080, 5000 e 8086 não têm entrada pública.
5. SSM envia comandos sem abrir a porta 22. O agente da EC2 inicia conexão de saída HTTPS.
6. O workflow do Terraform salva state e lock no bucket S3 pré-criado, que não pertence ao state da stack.

## 2. Recursos criados e pré-requisitos externos

O Terraform cria VPC, Internet Gateway, sub-redes pública e privadas, rota pública, DB subnet group, security groups e endpoint de interface para CloudWatch Logs. Também cria EC2 com Amazon Linux 2023, Docker/SSM, RDS PostgreSQL privado, filas SQS (principal e DLQ), IoT Topic Rule, Lambda consumidora, event source mapping, senhas aleatórias e parâmetros no Systems Manager Parameter Store.

São pré-requisitos, ou ficam fora do state:

- Bucket S3 de state, criado antes do primeiro workflow, privado, criptografado e com versionamento.
- Instance profile EC2, role IoT→SQS e role de execução Lambda; no Learner Lab são fornecidos como recursos IAM existentes.
- Certificado, chave e IoT Policy do ESP32.
- Secrets/variables do GitHub, imagens Docker Hub e os workflows de CI/publicação/deploy.
- HTTPS de entrada, domínio, load balancer, NAT Gateway e SSH não são criados. O frontend usa HTTP/80.

## 3. Arquivos, um por um

Terraform carrega todos os arquivos .tf deste diretório como uma configuração raiz. A divisão abaixo ajuda a leitura; não estabelece ordem de execução. Dependências são identificadas pelas referências aos recursos.

| Arquivo | O que faz |
|---|---|
| [backend.tf](../terraform/backend.tf) | Declara backend S3 sem valores embutidos. O workflow informa bucket, chave, região, criptografia e lock no terraform init. |
| [versions.tf](../terraform/versions.tf) | Define Terraform mínimo 1.10, providers AWS 5.x, Archive 2.7.x e Random 3.6.x; configura região AWS e tags padrão. |
| [main.tf](../terraform/main.tf) | Consulta AZs disponíveis e a AMI AL2023 publicada no SSM; gera senha RDS, token InfluxDB e senha InfluxDB; define AZs e tags locais comuns. |
| [variables.tf](../terraform/variables.tf) | Documenta tipos, descrições e defaults das entradas: região, ambiente, roles IAM existentes, usuário Docker Hub, CIDR, tamanhos, banco, InfluxDB, seed, repositório e prefixo. |
| [network.tf](../terraform/network.tf) | Cria VPC, Internet Gateway, uma sub-rede pública, duas sub-redes privadas para banco/Lambda, rota pública e DB subnet group. |
| [security_groups.tf](../terraform/security_groups.tf) | Permite HTTP/80 à EC2 segundo app_http_cidrs; EC2→RDS/5432; Lambda→Influx/8086 e Logs/443, com ingress correspondentes. Não cria regra SSH/22. |
| [compute.tf](../terraform/compute.tf) | Cria EC2 AL2023 na sub-rede pública, IP público, instance profile existente, disco gp3 criptografado de 30 GB, IMDSv2 obrigatório e user data. |
| [bootstrap.sh.tftpl](../terraform/bootstrap.sh.tftpl) | Inicializa EC2: atualiza sistema, instala Docker/Git e curl-minimal se necessário, ativa SSM Agent, instala Docker Compose, clona o repositório e escreve .env inicial. |
| [storage.tf](../terraform/storage.tf) | Cria RDS PostgreSQL privado, por padrão db.t3.micro, armazenamento gp3 criptografado e retenção de backup de um dia. A senha vem do provider Random. |
| [ingestion.tf](../terraform/ingestion.tf) | Cria SQS e DLQ, Topic Rule IoT, arquivo ZIP da Lambda, função Python 3.12 na VPC e associação entre SQS e Lambda. |
| [lambda/telemetry_consumer.py](../terraform/lambda/telemetry_consumer.py) | Código executado pela Lambda: processa mensagens recebidas da fila e grava medições no InfluxDB usando variáveis de ambiente. |
| [runtime_parameters.tf](../terraform/runtime_parameters.tf) | Cria parâmetros SSM para conexão RDS e configuração de runtime. Credenciais e tokens sensíveis são SecureString. |
| [outputs.tf](../terraform/outputs.tf) | Expõe ID/IP EC2, URL frontend, endpoint RDS, prefixos SSM, URL da fila, nome Lambda e VPC. A senha RDS é output sensível. |
| [terraform.tfvars.example](../terraform/terraform.tfvars.example) | Modelo de valores para execução local. Substitua placeholders; não coloque credenciais AWS ou tokens neste arquivo. |
| [.terraform.lock.hcl](../terraform/.terraform.lock.hcl) | Registra versões/checksums dos providers para instalações reproduzíveis. Deve ser versionado, não editado manualmente. |
| [README.md](../terraform/README.md) | Instruções operacionais de configuração GitHub, state remoto, provisionamento, custos e deploy SSM. |

O diretório .terraform/, __pycache__/ e o ZIP da Lambda são artefatos gerados; não são fontes a editar.

## 4. Variáveis e credenciais

| Entrada | Fonte/default | Função |
|---|---|---|
| aws_region | Repository variable AWS_REGION; default us-east-1 | Região dos recursos. |
| environment | academy | Ambiente em tags e prefixos SSM. |
| ec2_instance_profile_name | EC2_INSTANCE_PROFILE_NAME | Perfil IAM existente para SSM e leitura de parâmetros na EC2. |
| iot_sqs_role_arn | IOT_SQS_ROLE_ARN | Role IAM existente que permite à IoT Rule escrever na SQS. |
| lambda_execution_role_arn | LAMBDA_EXECUTION_ROLE_ARN | Role IAM existente para Lambda, logs, ENIs e leitura/remoção SQS. |
| dockerhub_username | Secret DOCKERHUB_USERNAME | Namespace das imagens. O token de publicação é usado pelo workflow Docker Hub. |
| app_http_cidrs | 0.0.0.0/0 | CIDRs autorizados no frontend HTTP. Restrinja à rede da escola quando possível. |
| vpc_cidr | 10.40.0.0/16 | Faixa privada da VPC; evite colisão com redes conectadas. |
| instance_type, db_instance_class | t3.small, db.t3.micro | Tamanhos padrão EC2 e RDS para laboratório. |
| db_name, db_username | factoryhub, factoryhub_admin | Banco e usuário inicial; senha aleatória. |
| influxdb_org, influxdb_bucket | factoryhub, telemetry | Organização e bucket de telemetria. |
| seed_telemetry_days | 14 | Histórico didático inicial do InfluxDB. |
| github_repository_url | URL HTTPS do projeto | Repositório clonado no bootstrap. |
| name_prefix | factoryhub | Prefixo de nomes AWS e parâmetros. |

O workflow também exige TF_STATE_BUCKET como Repository variable e os Secrets temporários AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY e AWS_SESSION_TOKEN. Credenciais Learner Lab expiram; atualize-as quando a sessão mudar. O Terraform não cria as roles IAM citadas: a identidade de execução também precisa poder passar essas roles (iam:PassRole).

## 5. Execução do Terraform

O workflow [terraform.yml](../.github/workflows/terraform.yml) é manual: **Actions → Provisionar infraestrutura AWS → Run workflow**. Ele verifica configurações e o bucket; configura credenciais; inicializa state remoto; roda fmt -check, validate, plan e aplica o plano criado no mesmo job.

O bucket deve existir antes da execução, com bloqueio público, criptografia e versionamento. A chave do state é factoryhub/terraform.tfstate; o lock nativo usa arquivo S3. Proteja o bucket: state pode conter dados sensíveis, mesmo quando outputs estão marcados como sensitive.

> O workflow executa apply automaticamente após gerar o plano. Uma execução pode criar recursos e gerar custos. Revise alterações e credenciais antes de iniciá-la. Se houver falha parcial, corrija a causa e rode novamente usando o mesmo state; não remova recursos do state manualmente.

## 6. Segurança, limites e custos

- A EC2 não aceita SSH. O acesso administrativo usa SSM, com agente e role válidos, via HTTPS de saída.
- HTTP/80 não usa TLS e o CIDR default permite acesso público; restrinja app_http_cidrs ou adicione uma solução TLS para produção.
- RDS é privado e aceita 5432 apenas da EC2. InfluxDB aceita 8086 da Lambda; Java/8080 e Flask/5000 não são públicos.
- Lambda roda nas sub-redes privadas, sem NAT Gateway; usa endpoint VPC para logs e event source mapping da SQS.
- Trust policies e permissões das roles IAM existentes não são criadas nem corrigidas por estes arquivos.
- Segredos podem residir no state. Controle acesso ao S3.
- RDS tem skip_final_snapshot = true e proteção contra exclusão desativada: destruição pode perder dados sem snapshot.
- EC2 t3.small, RDS db.t3.micro, endpoint de interface, volumes, SQS e Lambda podem gerar custos. Não há NAT Gateway nem Load Balancer.

## 7. Outputs e conferência

Outputs úteis: frontend_url, ec2_instance_id, ec2_public_ip, rds_endpoint, rds_parameter_prefix, runtime_parameter_prefix, sqs_queue_url, sqs_dlq_arn, lambda_function_name e vpc_id. Consulte-os com Terraform autenticado ao mesmo state; não divulgue outputs sensíveis.

Após o apply, confira EC2 Online no Systems Manager, filas e DLQ, IoT Rule, Lambda e RDS. O bootstrap pode levar alguns minutos. Provisionar a infraestrutura não publica imagens nem conclui deploy: são fluxos separados.

## 8. Ordem dos workflows

**Primeira instalação ou mudança de infraestrutura:** Terraform → aguardar EC2 Online → CI/quality gates → publicar imagens na branch main → deploy manual via SSM com o SHA completo publicado.

**Atualização normal da aplicação:** CI/quality gates → publicação manual, que repete os gates e grava tags latest e sha-<commit> → deploy manual informando o SHA completo do mesmo commit. Terraform não precisa rodar em toda publicação.

## 9. Destruição e state

Não há workflow de destruição nesta configuração. Para remover a stack, use as mesmas credenciais, backend e state; preserve os dados necessários antes. O RDS será apagado sem snapshot final, os dados dos containers/volume EC2 podem ser perdidos e filas também podem ser removidas. Mantenha o bucket S3 e o state até confirmar a remoção completa.

## 10. Glossário

- **Provider:** plugin que traduz configuração em chamadas às APIs AWS.
- **Resource:** objeto que o Terraform cria, atualiza ou remove.
- **Data source:** consulta informação existente, como AMI ou zonas disponíveis.
- **State:** registro que relaciona configuração e recursos reais.
- **Plan / apply:** previsão das mudanças / execução dessas mudanças.
- **Instance profile:** identidade IAM associada à EC2 para ela chamar serviços AWS sem guardar chaves permanentes.
