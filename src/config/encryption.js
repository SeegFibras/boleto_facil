// Módulo de criptografia AES-256-GCM para proteger credenciais da API
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;
const PBKDF2_ITERATIONS = 100000;

// Deriva chave de criptografia a partir da master key usando PBKDF2
function deriveKey(masterKey, salt) {
  return crypto.pbkdf2Sync(masterKey, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha512');
}

// Criptografa dados com AES-256-GCM
function encrypt(data, masterKey) {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey(masterKey, salt);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const jsonData = JSON.stringify(data);

  let encrypted = cipher.update(jsonData, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  // Formato: salt + iv + tag + dados criptografados
  return {
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    data: encrypted
  };
}

// Descriptografa dados
function decrypt(encryptedObj, masterKey) {
  const salt = Buffer.from(encryptedObj.salt, 'hex');
  const iv = Buffer.from(encryptedObj.iv, 'hex');
  const tag = Buffer.from(encryptedObj.tag, 'hex');
  const key = deriveKey(masterKey, salt);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encryptedObj.data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return JSON.parse(decrypted);
}

// Gera master key aleatória
function generateMasterKey() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = { encrypt, decrypt, generateMasterKey };
