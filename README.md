# SEEG FIBRAS - Sistema de Impressao de Boletos

Sistema para consulta e impressao de boletos do IXC Provedor, com uso em totem/quiosque e backend centralizado em VPS.

## Pré-requisitos

- **Node.js 18+** ([Download](https://nodejs.org/))
- **Google Chrome** (para modo quiosque)

## Instalação local (desenvolvimento)

```bash
# 1. Instalar dependências
npm install

# 2. Configurar o sistema (credenciais da API)
npm run setup

# 3. Iniciar o servidor
npm start
```

Acesse: **http://localhost:3000**

## Deploy em VPS (Hostinger)

Arquitetura recomendada:

Totens -> Internet -> Nginx (443/HTTPS) -> Node.js (127.0.0.1:3000)

### 1. Preparar servidor

No VPS Ubuntu 22.04, execute o script [deploy.sh](deploy.sh).

```bash
chmod +x deploy.sh
sudo ./deploy.sh
```

O script instala Node.js 18, PM2, UFW, Nginx e configura a base do servidor.

### 2. Configurar Nginx e dominio

- Arquivo de Nginx: [nginx/boleto-seeg.conf](nginx/boleto-seeg.conf)
- Dominio: substitua `SEU-DOMINIO.EXEMPLO` pelo seu subdominio real
- Restricao de acesso por IP: substitua `SEU.IP.PUBLICO.AQUI` pelo IP permitido

### 3. Gerar certificado HTTPS

Depois de apontar o DNS do dominio para o IP da VPS:

```bash
sudo certbot --nginx -d seu-subdominio.seudominio.com
```

Importante: durante a emissão inicial do certificado, a porta 80 deve estar acessível para validação do Let's Encrypt.
Depois da emissão, mantenha a restrição de IP ativa no bloco HTTPS (porta 443).

### 4. Subir aplicacao com PM2

```bash
npm install --production
npm run setup
pm2 start ecosystem.config.js
pm2 save
```

## Modo Quiosque (Totem)

Execute o arquivo `start-kiosk.bat` para:
1. Abrir o Chrome em modo tela cheia (kiosk)
2. Acessar o sistema remoto em `https://SEU-DOMINIO.EXEMPLO`

### Inicialização automática no Windows

1. Pressione `Win + R`, digite `shell:startup` e pressione Enter
2. Crie um atalho para o arquivo `start-kiosk.bat` nessa pasta
3. O sistema iniciará automaticamente ao ligar o computador

## Atualizar Credenciais

Execute novamente o setup:

```bash
npm run setup
```

## Estrutura

- `server.js` - Servidor Express
- `setup.js` - Configuração interativa
- `src/` - Backend (rotas, serviços, middleware)
- `public/` - Frontend (interface do quiosque)
- `data/` - Banco SQLite e credenciais criptografadas
- `logs/` - Logs diários de consultas

## Segurança

- Credenciais criptografadas com AES-256-GCM
- Rate limiting (10 consultas/min)
- `trust proxy` habilitado para funcionar corretamente atras do Nginx
- Node.js executando em localhost (127.0.0.1) atras de reverse proxy
- Restricao de acesso por IP no Nginx (valor configurável)
- CPF/CNPJ mascarado nos logs
- Headers de seguranca (Helmet.js)
