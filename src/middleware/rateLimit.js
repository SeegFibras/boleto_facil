// Rate limiting - máximo 10 consultas por minuto por IP
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    erro: 'Muitas consultas realizadas. Aguarde um momento e tente novamente.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { apiLimiter };
