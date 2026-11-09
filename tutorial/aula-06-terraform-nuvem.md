# Aula 6 — Terraform e provisionamento AWS

## Ponte com a prática anterior

Os alunos já criaram EC2 e Kubernetes usando a interface gráfica. Use essa experiência como ponto de partida: eles conhecem o resultado que desejam obter. Esta aula explora como representar recursos, configurações e dependências num arquivo revisável, versionado e repetível. O foco não é refazer uma EC2 no console; é comparar criação manual com infraestrutura como código.

## Objetivos

- Explicar infraestrutura como código (IaC) e o modelo declarativo do Terraform.
- Distinguir provider, resource, variable, output e state.
- Entender `init`, `validate`, `plan` e `apply`.
- Localizar VPC, subnets, regras de segurança, EC2, RDS, IoT, SQS e Lambda nos arquivos do projeto.
- Entender por que state remoto S3 e credenciais temporárias importam.
- Comparar provisionamento Terraform com deploy de containers via SSM.

## O que Terraform é — e o que não é

Terraform descreve o estado desejado da infraestrutura. O provider AWS traduz recursos HCL em chamadas às APIs AWS. A ferramenta compara código, state e recursos remotos e propõe uma mudança. Em vez de clicar repetidamente em telas, a turma mantém uma descrição revisável no Git.

Terraform **não** é o backend da aplicação, não treina o modelo, não publica automaticamente as imagens e não é a ferramenta que atualiza os containers da EC2 neste projeto. O provisionamento termina com recursos preparados; publicação e deploy pertencem a workflows separados.

## Traduzindo ações gráficas para IaC

| Ação conhecida pela interface | Representação que vamos estudar |
|---|---|
| Criar uma VPC | `resource "aws_vpc"` |
| Criar subnets e rota pública | recursos de subnet, route table e gateway |
| Configurar porta e origem de acesso | security group e regras explícitas |
| Criar EC2 e associar role | instância, instance profile e user data |
| Criar banco relacional | RDS subnet group, security group e `aws_db_instance` |
| Criar ingestão IoT | regra IoT, SQS/DLQ e Lambda |
| Anotar um valor para reutilizar | input variable |
| Mostrar endpoint após criar | output |
| Verificar o que já foi criado | state remoto e refresh/plan |

O projeto anterior com Kubernetes também pode ser comparado, sem afirmar que este Terraform cria um cluster Kubernetes: aqui os containers de aplicação são executados na EC2 com Docker Compose.

## Vocabulário essencial

- **Provider:** plugin que conversa com uma plataforma, por exemplo AWS.
- **Resource:** objeto que Terraform gerencia, como VPC, fila ou instância.
- **Variable:** parâmetro de entrada, como região, nome de role ou tamanho de instância.
- **Output:** valor útil ao final, como hostname ou URL.
- **Dependency graph:** ordem calculada a partir de referências entre recursos.
- **State:** registro de identidade e atributos dos recursos gerenciados.
- **Plan:** proposta de criação, alteração ou remoção.
- **Drift:** diferença entre infraestrutura descrita e recurso alterado por fora do Terraform.

## Ciclo de execução

1. **`terraform init`:** baixa providers e configura o backend de state.
2. **`terraform fmt` / `validate`:** padroniza e valida arquivos HCL.
3. **`terraform plan`:** consulta APIs e mostra mudanças previstas.
4. **Revisão:** verificar substituições, exclusões, portas, CIDRs e custos.
5. **`terraform apply`:** aplica o plano aprovado.
6. **Outputs e state:** registrar resultado sem divulgar segredos.

No pipeline atual o workflow é manual, e o `apply` acontece depois do `plan` na mesma execução. Por isso, executar o workflow pode criar recursos e gerar custos.

## State remoto e credenciais

O runner do GitHub é descartável; guardar state apenas na máquina do runner faria a execução seguinte perder referência dos recursos. O projeto usa state remoto S3 com criptografia e lockfile. O bucket precisa existir antes do primeiro `init`, deve ter acesso público bloqueado e versionamento habilitado.

As credenciais temporárias do Learner Lab entram como GitHub Secrets; valores não secretos como região ficam em Variables. A sessão expira e deve ser renovada. Roles como instance profile e roles de IoT/Lambda podem ser fornecidas pelo ambiente acadêmico.

Um `AccessDenied` de `iam:PassRole` com deny explícito é uma restrição de política do laboratório. Acrescentar uma permissão no arquivo Terraform não remove um deny explícito externo.

## Rede e portas: separar os planos

- Terraform chama APIs AWS por HTTPS/443 a partir do runner.
- Deploy usa API AWS Systems Manager por HTTPS/443.
- O SSM Agent na EC2 mantém conexão de saída aos endpoints.
- Docker Hub é acessado pela instância para baixar imagens via HTTPS.
- Este fluxo não exige abrir SSH/22 para Terraform ou deploy.
- Regras dos containers e comunicação entre serviços são outra camada de rede e ficam nos security groups e na rede Docker.

## Leitura guiada do repositório

1. `providers.tf`/`versions.tf`: provider e versão do Terraform.
2. `variables.tf`: entradas e valores esperados.
3. `network.tf`: VPC, subnets, gateway e rotas.
4. `security_groups.tf`: limites de tráfego.
5. `database.tf`: RDS e redes associadas.
6. `ingestion.tf` e `lambda/`: IoT Rule, filas e função.
7. `outputs.tf`: valores publicados após criação.
8. `.github/workflows/terraform.yml`: credenciais, init remoto, plan e apply.

## Prática sem criar recursos

1. Escolher um resource da infraestrutura que a turma já criou pela interface.
2. Localizar o bloco equivalente no código.
3. Identificar entradas, dependências, atributos sensíveis e outputs.
4. Ler o workflow e mapear de onde vêm as credenciais e o state.
5. Analisar um plano já registrado ou executar `validate` sem `apply`.
6. Separar mudanças sem custo de itens que podem gerar cobranças.

Não execute `apply` sem confirmação do docente, laboratório válido, bucket de state existente, revisão do plano e procedimento de limpeza.

## Evidência de aprendizagem

O aluno explica para um recurso selecionado: “qual clique anterior ele substitui, qual bloco o descreve, de quais recursos depende, como o state acompanha a identidade e o que aconteceria ao removê-lo?”.

## Tarefa

Criar um mapa de dependências com cinco recursos da configuração e indicar qual mudança no plano exigiria maior cuidado e por quê.

## Referências

- [README Terraform](../terraform/README.md)
- [Aula de computação em nuvem](../docs/03_computacao_em_nuvem.md)
- [AWS Academy/Learner Lab](../docs/06_guia_aws_academy.md)
- [Workflow Terraform](../.github/workflows/terraform.yml)
