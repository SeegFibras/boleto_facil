// Sanitização de inputs - permite apenas números no CPF/CNPJ
function sanitizeCpfCnpj(req, res, next) {
  if (req.body && req.body.documento) {
    req.body.documento = req.body.documento.replace(/\D/g, '');

    if (req.body.documento.length < 11 || req.body.documento.length > 14) {
      return res.status(400).json({ erro: 'Documento inválido. Digite um CPF ou CNPJ válido.' });
    }
  }
  next();
}

module.exports = { sanitizeCpfCnpj };
