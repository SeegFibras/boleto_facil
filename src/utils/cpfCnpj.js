// Validação de CPF e CNPJ

function validarCPF(cpf) {
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cpf.charAt(i)) * (10 - i);
  let resto = 11 - (soma % 11);
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(9))) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cpf.charAt(i)) * (11 - i);
  resto = 11 - (soma % 11);
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(10))) return false;

  return true;
}

function validarCNPJ(cnpj) {
  cnpj = cnpj.replace(/\D/g, '');
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let soma = 0;
  for (let i = 0; i < 12; i++) soma += parseInt(cnpj.charAt(i)) * pesos1[i];
  let resto = soma % 11;
  const dig1 = resto < 2 ? 0 : 11 - resto;
  if (parseInt(cnpj.charAt(12)) !== dig1) return false;

  soma = 0;
  for (let i = 0; i < 13; i++) soma += parseInt(cnpj.charAt(i)) * pesos2[i];
  resto = soma % 11;
  const dig2 = resto < 2 ? 0 : 11 - resto;
  if (parseInt(cnpj.charAt(13)) !== dig2) return false;

  return true;
}

function validar(documento) {
  const limpo = documento.replace(/\D/g, '');
  if (limpo.length <= 11) return validarCPF(limpo);
  return validarCNPJ(limpo);
}

// Mascara CPF/CNPJ para log (ex: ***.490.***-78)
function mascarar(documento) {
  const limpo = documento.replace(/\D/g, '');
  if (limpo.length <= 11) {
    return `***.${limpo.substring(3, 6)}.***-${limpo.substring(9, 11)}`;
  }
  return `**.***.${limpo.substring(4, 7)}/****-${limpo.substring(12, 14)}`;
}

module.exports = { validarCPF, validarCNPJ, validar, mascarar };
