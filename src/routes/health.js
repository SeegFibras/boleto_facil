// Rota de health check
const express = require('express');
const router = express.Router();
const { getUltimaConsulta, getDatabase } = require('../config/database');

router.get('/health', (req, res) => {
  let dbStatus = 'ok';
  try {
    const db = getDatabase();
    db.prepare('SELECT 1').get();
  } catch {
    dbStatus = 'error';
  }

  const ultima = getUltimaConsulta();
  res.json({
    status: dbStatus === 'ok' ? 'online' : 'degraded',
    database: dbStatus,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    ultimaConsulta: ultima ? ultima.created_at : null
  });
});

module.exports = router;
