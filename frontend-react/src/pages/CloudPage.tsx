import React, { useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { SectionTabs } from '../components/common/SectionTabs';
import { TheoryBox } from '../components/common/TheoryBox';

const TABS = [
  { id: 'teoria', label: '📚 Teoria' },
  { id: 'lab', label: '🧪 Laboratório' },
];

interface QueueMessage {
  id: number;
  content: string;
  age: number;
}

let msgCounter = 0;
function makeMsg(): QueueMessage {
  msgCounter += 1;
  return {
    id: msgCounter,
    content: `MSG-${String(msgCounter).padStart(4, '0')}`,
    age: 0,
  };
}

export const CloudPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('teoria');

  // SQS Simulator
  const [queue, setQueue] = useState<QueueMessage[]>([]);
  const [processed, setProcessed] = useState(0);
  const [animating, setAnimating] = useState(false);

  // Cost Calculator
  const [ec2Hours, setEc2Hours] = useState(720);
  const [rdsHours, setRdsHours] = useState(720);
  const EC2_RATE = 0.0116; // t2.micro us-east-1
  const RDS_RATE = 0.017;  // db.t3.micro
  const totalCost = parseFloat((ec2Hours * EC2_RATE + rdsHours * RDS_RATE).toFixed(2));
  const budget = 100;
  const remaining = parseFloat((budget - totalCost).toFixed(2));

  const burstMessages = () => {
    const newMsgs = Array.from({ length: 10 }, makeMsg);
    setQueue(prev => [...prev, ...newMsgs].slice(0, 50));
  };

  const consumeBatch = () => {
    if (animating) return;
    setAnimating(true);
    setQueue(prev => {
      const batch = prev.slice(0, 5);
      setProcessed(p => p + batch.length);
      return prev.slice(5);
    });
    setTimeout(() => setAnimating(false), 500);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        icon="☁️"
        title="Nuvem AWS"
        subtitle="EC2 · RDS · SQS · VPC · AWS Academy"
        badge="Semanas 7–9"
        badgeColor="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
      />

      <SectionTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'teoria' && (
        <div className="space-y-6">
          {/* AWS Academy Restrictions */}
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-3">🎓 AWS Academy — Restrições e Recursos</h2>
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm bg-white dark:bg-gray-800">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    <th className="px-4 py-3 text-left font-semibold">Serviço</th>
                    <th className="px-4 py-3 text-left font-semibold">Recurso Utilizado</th>
                    <th className="px-4 py-3 text-left font-semibold">Restrição Academy</th>
                    <th className="px-4 py-3 text-left font-semibold">Custo/h (us-east-1)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {[
                    ['EC2', 't2.micro', 'Sem GPU, sem instances reservadas', '$0.0116'],
                    ['RDS', 'db.t3.micro PostgreSQL', 'Single-AZ apenas, sem Multi-AZ', '$0.017'],
                    ['SQS', 'Standard Queue', 'Sem FIFO em Academy básico', '$0.00/1M msgs'],
                    ['VPC', '1 VPC, 2 subnets', 'Sem Transit Gateway', 'Gratuito'],
                    ['S3', 'Bucket padrão', 'Sem Intelligent-Tiering', '$0.023/GB'],
                  ].map(([svc, res, rest, cost]) => (
                    <tr key={svc} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 font-bold text-orange-500">{svc}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">{res}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{rest}</td>
                      <td className="px-4 py-3 font-mono text-green-600 dark:text-green-400 text-xs">{cost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* VPC Topology */}
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-3">🌐 Topologia VPC — Factory Hub</h2>
            <figure className="mb-4 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              <img src="/assets/lessons/vpc-public-private.jpg" alt="Diagrama educacional de uma VPC dividida em sub-rede pública e sub-rede privada" loading="lazy" className="mx-auto max-h-96 w-full object-contain p-3" />
              <figcaption className="border-t border-gray-100 px-4 py-2 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">Compare a camada pública, que recebe tráfego externo controlado, com a camada privada, usada para recursos de dados sem exposição direta.</figcaption>
            </figure>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm font-mono text-xs">
              <div className="border-2 border-blue-400 rounded-xl p-4">
                <div className="text-blue-500 font-bold mb-3">🌐 VPC: 10.0.0.0/16 (factory-hub-vpc)</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-green-400 rounded-lg p-3">
                    <div className="text-green-500 font-bold mb-2">🌍 Public Subnet: 10.0.1.0/24</div>
                    <div className="space-y-1 text-gray-500 dark:text-gray-400">
                      <div className="bg-green-50 dark:bg-green-900/20 rounded px-2 py-1">
                        📦 EC2 t2.micro (Backend Java :8080)
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 rounded px-2 py-1">
                        🤖 EC2 t2.micro (Flask AI :5000)
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded px-2 py-1">
                        🔀 Internet Gateway
                      </div>
                    </div>
                  </div>
                  <div className="border border-red-400 rounded-lg p-3">
                    <div className="text-red-500 font-bold mb-2">🔒 Private Subnet: 10.0.2.0/24</div>
                    <div className="space-y-1 text-gray-500 dark:text-gray-400">
                      <div className="bg-red-50 dark:bg-red-900/20 rounded px-2 py-1">
                        🗄️ RDS db.t3.micro PostgreSQL :5432
                      </div>
                      <div className="bg-orange-50 dark:bg-orange-900/20 rounded px-2 py-1">
                        📬 SQS Queue (Telemetry Buffer)
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-gray-400 text-center">
                  ↕ Security Groups: sg-backend (8080), sg-ai (5000), sg-db (5432)
                </div>
              </div>
            </div>
          </div>

          {/* Terraform learning module */}
          <section aria-labelledby="terraform-heading" className="space-y-4">
            <div>
              <h2 id="terraform-heading" className="text-base font-bold text-gray-800 dark:text-gray-200 mb-2">🏗️ Terraform — infraestrutura explicada passo a passo</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">Terraform é uma ferramenta de Infraestrutura como Código (IaC): você descreve o estado desejado da infraestrutura em arquivos de texto, revisa as mudanças e pede ao Terraform para reconciliar a nuvem com essa descrição. No Factory Hub, isso torna a topologia reproduzível, revisável por Git e mais fácil de recriar em outro laboratório.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { step: '1', title: 'Descrever', text: 'Escreva recursos, entradas e saídas em HCL. O arquivo declara o que deve existir; não é uma sequência de cliques.' },
                { step: '2', title: 'Planejar', text: 'O plan compara configuração, estado salvo e recursos observados. Ele mostra inclusões, alterações e remoções antes de aplicá-las.' },
                { step: '3', title: 'Aplicar', text: 'O apply executa o plano usando o provider e as credenciais configuradas. Depois, o state registra a associação entre os blocos e os recursos reais.' },
              ].map(item => <article key={item.step} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold mb-3">{item.step}</div>
                <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200 mb-1">{item.title}</h3>
                <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">{item.text}</p>
              </article>)}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <article className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200 mb-2">Peças de um projeto Terraform</h3>
                <dl className="space-y-2 text-xs leading-relaxed">
                  {[
                    ['Provider', 'Plugin que conversa com uma plataforma, como AWS. Define a região e integra as APIs do provedor.'],
                    ['Resource', 'Um objeto que Terraform administra: VPC, subnet, security group, fila ou instância.'],
                    ['Variable', 'Entrada configurável para não fixar região, CIDR, nome ou tamanho diretamente no recurso.'],
                    ['Output', 'Valor útil apresentado após o apply, como IP público, endpoint de banco ou URL de fila.'],
                    ['Data source', 'Consulta um recurso já existente sem declará-lo como propriedade deste projeto; útil para localizar a LabRole.'],
                    ['Module', 'Conjunto reutilizável de recursos e interfaces. Ajuda a separar rede, aplicação e dados quando o projeto cresce.'],
                  ].map(([term, definition]) => <div key={term} className="grid grid-cols-[100px_1fr] gap-2"><dt className="font-semibold text-orange-600 dark:text-orange-400">{term}</dt><dd className="text-gray-600 dark:text-gray-400">{definition}</dd></div>)}
                </dl>
              </article>

              <article className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200 mb-2">Exemplo comentado: EC2 na AWS Academy</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">O exemplo ilustra a declaração. O nome da role existente, a AMI, a região e as permissões precisam ser conferidos no laboratório da turma.</p>
                <pre className="overflow-x-auto rounded-lg bg-gray-950 text-green-300 p-4 text-[11px] leading-relaxed"><code>{`variable "ami_id" {\n  type = string\n}\n\nvariable "instance_type" {\n  type    = string\n  default = "t2.micro"\n}\n\nvariable "subnet_id" {\n  type = string\n}\n\n# Perfil já fornecido pela Academy.\n# Não crie uma role IAM nova no Learner Lab.\ndata "aws_iam_instance_profile" "lab" {\n  name = "LabInstanceProfile"\n}\n\nresource "aws_instance" "app" {\n  ami                  = var.ami_id\n  instance_type        = var.instance_type\n  subnet_id            = var.subnet_id\n  iam_instance_profile = data.aws_iam_instance_profile.lab.name\n\n  tags = {\n    Name = "factory-hub-app"\n  }\n}\n\noutput "app_public_ip" {\n  value = aws_instance.app.public_ip\n}`}</code></pre>
              </article>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TheoryBox type="info" title="O ciclo de trabalho no terminal">
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li><code>terraform init</code> baixa e configura os providers e módulos.</li>
                  <li><code>terraform fmt</code> padroniza a formatação; <code>terraform validate</code> verifica a estrutura.</li>
                  <li><code>terraform plan</code> revisa a proposta. Salve um plano para revisão/aplicação controlada quando necessário.</li>
                  <li><code>terraform apply</code> pede confirmação e realiza as mudanças aprovadas.</li>
                  <li><code>terraform output</code> consulta os resultados; <code>terraform destroy</code> remove recursos gerenciados, após revisão cuidadosa.</li>
                </ol>
              </TheoryBox>
              <TheoryBox type="warning" title="State e segurança: conceitos que não podem ser ignorados">
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>O state é o mapa que permite ao Terraform saber quais recursos correspondem à configuração; não é apenas cache.</li>
                  <li>State local não deve ser compartilhado por cópia. Em equipe, use backend remoto suportado, controle de acesso e bloqueio.</li>
                  <li>State e arquivos de variáveis podem conter dados sensíveis: não os comite. Use <code>.gitignore</code> e segredos do ambiente.</li>
                  <li>Não edite o state manualmente; use comandos de gerenciamento e faça backup antes de operações excepcionais.</li>
                </ul>
              </TheoryBox>
            </div>

            <article className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
              <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200 mb-3">Como isso se conecta ao Factory Hub</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  ['Rede', 'VPC, subnets, rotas e security groups definem onde os serviços podem conversar.'],
                  ['Aplicação', 'EC2 hospeda os containers. Outputs podem expor o IP ou DNS usados no acesso e no deploy.'],
                  ['Dados e filas', 'RDS e SQS são recursos declarados com parâmetros explícitos e permissões mínimas.'],
                  ['Identidade', 'No Learner Lab, reutilize a role/perfil permitido (LabRole); não presuma permissão para criar IAM roles.'],
                ].map(([title, description]) => <div key={title} className="rounded-lg bg-gray-50 dark:bg-gray-900 p-3"><h4 className="text-xs font-bold text-orange-600 dark:text-orange-400 mb-1">{title}</h4><p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{description}</p></div>)}
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-600 dark:text-gray-400">
                <div><h4 className="font-bold text-gray-800 dark:text-gray-200 mb-1">Boas práticas para aprender</h4><ul className="list-disc list-inside space-y-1"><li>Faça commits pequenos e revise o plan antes de aplicar.</li><li>Separe configuração por responsabilidade e use variáveis para diferenças entre ambientes.</li><li>Fixe versões de providers e registre o arquivo de lock para builds reproduzíveis.</li><li>Use tags para identificar projeto, ambiente e responsável pelos recursos.</li></ul></div>
                <div><h4 className="font-bold text-gray-800 dark:text-gray-200 mb-1">Erros comuns e como interpretar</h4><ul className="list-disc list-inside space-y-1"><li>Credencial expirada: reinicie/renove a sessão do Learner Lab e tente novamente.</li><li>AccessDenied: confira limites da Academy; alterar HCL não concede permissão IAM.</li><li>Recurso já existe: importe-o ou ajuste a configuração; não tente recriá-lo às cegas.</li><li>Mudança inesperada no plan: pare, confira state, região e variáveis antes de aplicar.</li></ul></div>
              </div>
            </article>
          </section>

          {/* SQS Comparison */}
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-3">📬 SQS — Assíncrono vs Síncrono</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TheoryBox type="warning" title="❌ Sem SQS — Acoplamento Síncrono">
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>ESP32 → Backend diretamente via HTTP POST</li>
                  <li>Se Backend cair, perde dados de telemetria</li>
                  <li>Picos de tráfego derrubam o RDS</li>
                  <li>Não há retry automático em falhas</li>
                </ul>
              </TheoryBox>
              <TheoryBox type="example" title="✅ Com SQS — Buffer Assíncrono">
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>ESP32 → MQTT Broker → SQS (buffer)</li>
                  <li>Backend consome em batches de 10 msgs</li>
                  <li>Resiliente: mensagens persistem 4 dias</li>
                  <li>Escala automaticamente em picos de produção</li>
                </ul>
              </TheoryBox>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'lab' && (
        <div className="space-y-6">
          {/* SQS Simulator */}
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-3">📬 Simulador SQS</h2>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
              <div className="flex items-center gap-4 mb-5 flex-wrap">
                <button
                  onClick={burstMessages}
                  className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors"
                >
                  ⚡ Burst (+10 msgs)
                </button>
                <button
                  onClick={consumeBatch}
                  disabled={queue.length === 0 || animating}
                  className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
                >
                  ▶ Consume Batch (5)
                </button>
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span>Queue: <strong className="text-gray-800 dark:text-gray-200">{queue.length}</strong> msgs</span>
                  <span>Processed: <strong className="text-green-600 dark:text-green-400">{processed}</strong></span>
                </div>
              </div>

              {/* Queue visualization */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 min-h-24">
                <div className="text-xs text-gray-400 mb-3 font-semibold">SQS Queue — factory-hub-telemetry</div>
                {queue.length === 0 ? (
                  <div className="flex items-center justify-center h-16 text-gray-400 text-sm">
                    Queue vazia
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {queue.map((msg, idx) => (
                      <div
                        key={msg.id}
                        className={`px-2 py-1 rounded text-xs font-mono font-bold border transition-all ${
                          idx < 5
                            ? 'bg-green-100 dark:bg-green-900/30 border-green-400 text-green-700 dark:text-green-300'
                            : 'bg-blue-100 dark:bg-blue-900/30 border-blue-400 text-blue-700 dark:text-blue-300'
                        }`}
                      >
                        {msg.content}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                🟢 Verde = próximo batch a consumir | 🔵 Azul = aguardando na fila
              </p>
            </div>
          </div>

          {/* Cost Calculator */}
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-3">💰 Calculadora de Custos AWS</h2>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-5">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">EC2 t2.micro (horas)</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200">{ec2Hours}h</span>
                    </div>
                    <input
                      type="range" min={0} max={744} value={ec2Hours}
                      onChange={e => setEc2Hours(Number(e.target.value))}
                      className="w-full h-2 rounded-full accent-orange-500"
                    />
                    <div className="text-xs text-gray-400 mt-0.5">
                      Custo: ${(ec2Hours * EC2_RATE).toFixed(2)} (@ $0.0116/h)
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">RDS db.t3.micro (horas)</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200">{rdsHours}h</span>
                    </div>
                    <input
                      type="range" min={0} max={744} value={rdsHours}
                      onChange={e => setRdsHours(Number(e.target.value))}
                      className="w-full h-2 rounded-full accent-blue-500"
                    />
                    <div className="text-xs text-gray-400 mt-0.5">
                      Custo: ${(rdsHours * RDS_RATE).toFixed(2)} (@ $0.017/h)
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 flex flex-col justify-center gap-3">
                  <div className="text-sm text-gray-500 dark:text-gray-400 font-semibold">Resumo de Custos</div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Total estimado:</span>
                    <span className="font-bold text-2xl text-gray-800 dark:text-gray-200">${totalCost}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Budget Academy:</span>
                    <span className="font-bold text-gray-700 dark:text-gray-300">${budget}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Saldo restante:</span>
                    <span className={`font-bold ${remaining >= 20 ? 'text-green-600 dark:text-green-400' : remaining >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                      ${remaining}
                    </span>
                  </div>
                  <div className="mt-1">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${totalCost / budget > 0.9 ? 'bg-red-500' : totalCost / budget > 0.7 ? 'bg-amber-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(100, (totalCost / budget) * 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-400 mt-1 text-center">
                      {((totalCost / budget) * 100).toFixed(0)}% do budget utilizado
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

