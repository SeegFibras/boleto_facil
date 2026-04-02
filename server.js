// Servidor Express principal - Sistema de Boletos SEEG FIBRAS
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const path = require('path');
const logger = require('./src/utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

function normalizeOrigin(value) {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function getAllowedOrigins(req) {
  const allowedOrigins = new Set();
  const configuredOrigin = normalizeOrigin(process.env.PUBLIC_ORIGIN);

  if (configuredOrigin) {
    allowedOrigins.add(configuredOrigin);
  }

  const forwardedHost = req.get('X-Forwarded-Host');
  const requestHost = forwardedHost || req.get('host');
  const forwardedProto = req.get('X-Forwarded-Proto');
  const requestProtocol = (forwardedProto || req.protocol || 'http').split(',')[0].trim();
  const requestOrigin = normalizeOrigin(`${requestProtocol}://${requestHost}`);

  if (requestOrigin) {
    allowedOrigins.add(requestOrigin);
  }

  return allowedOrigins;
}

// Validação de variáveis de ambiente obrigatórias
const requiredEnvVars = ['MASTER_KEY'];
const missing = requiredEnvVars.filter(v => !process.env[v]);
if (missing.length > 0) {
  logger.error(`Variáveis de ambiente obrigatórias não definidas: ${missing.join(', ')}. Execute: npm run setup`);
  process.exit(1);
}

// Necessário para rate limiting e logs de IP corretos quando rodando atrás do Nginx
app.set('trust proxy', 1);

// Segurança - Headers HTTP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      frameSrc: ["'self'"],
      connectSrc: ["'self'"]
    }
  }
}));

// Rejeita apenas origens divergentes da origem publicada ou do host atual
app.use('/api', (req, res, next) => {
  const origin = normalizeOrigin(req.get('Origin'));

  if (!origin) {
    return next();
  }

  const allowedOrigins = getAllowedOrigins(req);
  if (!allowedOrigins.has(origin)) {
    return res.status(403).json({ erro: 'Origem não autorizada para esta API.' });
  }

  next();
});

// Parser JSON
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Arquivos estáticos (sem cache para JS/CSS/HTML)
app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  setHeaders: (res, filePath) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.set('Pragma', 'no-cache');
  }
}));

// Rotas da API
app.use('/api', require('./src/routes/api'));
app.use('/api', require('./src/routes/health'));

// Rota config pública (telefone de atendimento)
app.get('/api/config', (req, res) => {
  res.json({
    telefone: process.env.TELEFONE_ATENDIMENTO || '',
    provedor: 'SEEG FIBRAS'
  });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Tratamento de erros global
app.use((err, req, res, next) => {
  logger.error(`Erro não tratado: ${err.message}`);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
});

// Iniciar servidor (configurável via host/env)
const HOST = process.env.HOST || '127.0.0.1';
const server = app.listen(PORT, HOST, () => {
  logger.info(`Servidor SEEG FIBRAS iniciado em http://${HOST}:${PORT}`);
  logger.info('Acesse: http://localhost:' + PORT);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Encerrando servidor...');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  logger.info('Encerrando servidor...');
  server.close(() => process.exit(0));
});
