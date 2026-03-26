// Rota de health check
const express = require('express');
const router = express.Router();
const { getUltimaConsulta } = require('../config/database');

router.get('/health', (req, res) => {
  const ultima = getUltimaConsulta();
  res.json({
    status: 'online',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    ultimaConsulta: ultima ? ultima.created_at : null
  });
});

module.exports = router;
