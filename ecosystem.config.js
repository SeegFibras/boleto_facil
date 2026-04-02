module.exports = {
  apps: [
    {
      name: "boletos-seeg-fibras",
      script: "./server.js",
      instances: 1, // ou "max" para usar todos os núcleos
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOST: "127.0.0.1", // Rodando atrás do Nginx (segurança)
        PUBLIC_ORIGIN: "https://boleto.seegfibras.com.br"
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss Z"
    }
  ]
};
