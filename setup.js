// Script interativo de configuração inicial - SEEG FIBRAS
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { encrypt, generateMasterKey } = require('./src/config/encryption');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function pergunta(texto) {
  return new Promise(resolve => rl.question(texto, resolve));
}

function mascararToken(token) {
  if (!token || token.length < 8) return '****';
  return '****...' + token.substring(token.length - 4);
}

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   SEEG FIBRAS — Configuração do Sistema      ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');

  // Valores padrão
  const defaults = {
    url: 'https://ixc.seegfibras.com.br',
    userId: '66',
    token: '',
    port: '3000',
    telefone: ''
  };

  // Coleta de dados
  const url = (await pergunta(`URL do IXC Provedor [${defaults.url}]: `)).trim() || defaults.url;
  const userId = (await pergunta(`ID do usuário API [${defaults.userId}]: `)).trim() || defaults.userId;

  if (defaults.token) {
    console.log(`Token da API [${mascararToken(defaults.token)}]: (Enter para manter)`);
  } else {
    console.log('Token da API [obrigatorio]:');
  }

  const tokenInput = (await pergunta('> ')).trim();
  const token = tokenInput || defaults.token;

  if (!token) {
    console.log('');
    console.log('❌ O token da API e obrigatorio. Execute o setup novamente e informe o token.');
    rl.close();
    process.exit(1);
  }

  const port = (await pergunta(`Porta do servidor [${defaults.port}]: `)).trim() || defaults.port;
  const telefone = (await pergunta('Telefone de atendimento []: ')).trim() || defaults.telefone;

  console.log('');
  console.log('⏳ Testando conexão com a API...');

  // Testa a conexão
  try {
    const axios = require('axios');
    const authToken = Buffer.from(`${userId}:${token}`).toString('base64');
    const response = await axios({
      method: 'POST',
      url: `${url}/webservice/v1/cliente`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authToken}`,
        'ixcsoft': 'listar'
      },
      data: {
        qtype: 'cliente.id',
        query: '1',
        oper: '>',
        page: '1',
        rp: '1',
        sortname: 'cliente.id',
        sortorder: 'desc'
      },
      timeout: 15000
    });
    console.log('✅ Conexão OK! API respondendo corretamente.');
  } catch (error) {
    console.log('');
    console.log('❌ Falha na conexão com a API!');
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      if (error.response.status === 401) {
        console.log('   Motivo: Credenciais inválidas (token ou ID incorreto)');
      }
    } else {
      console.log(`   Motivo: ${error.message}`);
    }
    const retry = await pergunta('\nDeseja continuar mesmo assim? (s/N): ');
    if (retry.toLowerCase() !== 's') {
      console.log('Setup cancelado.');
      rl.close();
      process.exit(1);
    }
  }

  console.log('');
  console.log('🔐 Criptografando credenciais...');

  // Gera master key
  const masterKey = generateMasterKey();

  // Criptografa credenciais
  const credenciais = {
    apiUrl: url,
    userId: userId,
    apiToken: token
  };

  const encrypted = encrypt(credenciais, masterKey);

  // Cria pastas necessárias
  const dirs = ['data', 'logs'];
  for (const dir of dirs) {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`✅ ${dir}/ criada`);
    }
  }

  // Salva credenciais criptografadas
  const encPath = path.join(__dirname, 'data', 'credentials.enc');
  fs.writeFileSync(encPath, JSON.stringify(encrypted, null, 2));
  console.log('✅ Credenciais salvas em data/credentials.enc');

  // Cria/atualiza .env
  const envContent = `# Gerado automaticamente pelo setup - NÃO edite manualmente
MASTER_KEY=${masterKey}
PORT=${port}
TELEFONE_ATENDIMENTO=${telefone}
`;

  fs.writeFileSync(path.join(__dirname, '.env'), envContent);
  console.log('✅ Arquivo .env criado');

  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log('✅ Configuração concluída!');
  console.log('');
  console.log('Para iniciar o servidor:');
  console.log('  npm start');
  console.log('');
  console.log(`Acesse: http://localhost:${port}`);
  console.log('═══════════════════════════════════════════════');

  rl.close();
}

main().catch(err => {
  console.error('Erro no setup:', err.message);
  rl.close();
  process.exit(1);
});
