#!/bin/bash
# =============================================================================
# deploy.sh — Script de configuração do servidor VPS para SEEG FIBRAS Boletos
# Testado em: Ubuntu 22.04 LTS (Hostinger VPS)
#
# USO:
#   1. Conectar ao VPS via SSH:  ssh usuario@IP_DA_VPS
#   2. Copiar este arquivo para o servidor e executar:
#      chmod +x deploy.sh && sudo ./deploy.sh
# =============================================================================

set -e  # Interrompe em qualquer erro

DOMINIO="boleto.seegfibras.com.br"
APP_DIR="/opt/boleto-seeg"
APP_USER="seeg"
IP_PERMITIDO="45.233.136.8"
EMAIL_CERTBOT="ti@seegfibras.com.br"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   SEEG FIBRAS — Deploy Servidor de Boletos       ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ---------------------------------------------------------------------------
# FASE 1 — Pacotes base
# ---------------------------------------------------------------------------
echo "[ 1/7 ] Atualizando sistema e instalando dependências..."
apt-get update -q
apt-get upgrade -y -q
apt-get install -y -q curl git ufw nginx

# ---------------------------------------------------------------------------
# FASE 2 — Node.js 18+ via NodeSource
# ---------------------------------------------------------------------------
echo "[ 2/7 ] Instalando Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y -q nodejs

echo "   Node.js: $(node --version)"
echo "   npm:     $(npm --version)"

# Instalar PM2 globalmente
npm install -g pm2 --quiet
echo "   PM2: $(pm2 --version)"

# ---------------------------------------------------------------------------
# FASE 3 — Firewall UFW
# ---------------------------------------------------------------------------
echo "[ 3/7 ] Configurando firewall UFW..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP (redireciona para HTTPS)
ufw allow 443/tcp   # HTTPS
ufw --force enable
echo "   Regras ativas:"
ufw status numbered

# ---------------------------------------------------------------------------
# FASE 4 — Usuário da aplicação
# ---------------------------------------------------------------------------
echo "[ 4/7 ] Criando usuário '$APP_USER'..."
if ! id "$APP_USER" &>/dev/null; then
    useradd --system --shell /bin/bash --home-dir "$APP_DIR" --create-home "$APP_USER"
    echo "   Usuário criado: $APP_USER"
else
    echo "   Usuário já existe: $APP_USER"
fi

# ---------------------------------------------------------------------------
# FASE 5 — Diretório da aplicação
# ---------------------------------------------------------------------------
echo "[ 5/7 ] Preparando diretório da aplicação em $APP_DIR..."
mkdir -p "$APP_DIR"
mkdir -p "$APP_DIR/data"
mkdir -p "$APP_DIR/logs"
chown -R "$APP_USER":"$APP_USER" "$APP_DIR"

echo ""
echo "┌─────────────────────────────────────────────────────────────────┐"
echo "│  PRÓXIMO PASSO MANUAL: Upload do código                         │"
echo "│                                                                  │"
echo "│  Transfira os arquivos do projeto via SFTP/WinSCP para:          │"
echo "│  $APP_DIR                                    │"
echo "│                                                                  │"
echo "│  NÃO enviar: .env  data/credentials.enc  data/*.db  node_modules │"
echo "└─────────────────────────────────────────────────────────────────┘"
echo ""
read -p "Pressione ENTER quando o upload estiver concluído..."

# Instala dependências Node.js
cd "$APP_DIR"
npm install --production --quiet
chown -R "$APP_USER":"$APP_USER" "$APP_DIR"

# ---------------------------------------------------------------------------
# FASE 6 — Nginx (configuração HTTP temporária para validação do Certbot)
# ---------------------------------------------------------------------------
echo "[ 6/7 ] Configurando Nginx (modo temporário HTTP)..."

cat >/etc/nginx/sites-available/boleto-seeg <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMINIO};

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }
}
EOF

# Remove site padrão e ativa o novo
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/boleto-seeg /etc/nginx/sites-enabled/boleto-seeg

nginx -t
systemctl reload nginx
echo "   Nginx temporário aplicado (HTTP)."

# ---------------------------------------------------------------------------
# FASE 7 — Certbot (Let's Encrypt)
# ---------------------------------------------------------------------------
echo "[ 7/7 ] Instalando Certbot e emitindo certificado SSL..."
apt-get install -y -q snapd
snap install --classic certbot 2>/dev/null || apt-get install -y -q certbot python3-certbot-nginx

echo ""
echo "┌────────────────────────────────────────────────────────────────┐"
echo "│  VERIFICAR ANTES DE CONTINUAR:                                  │"
echo "│  O DNS do domínio '$DOMINIO'        │"
echo "│  já deve apontar para o IP desta VPS.                           │"
echo "│  Sem isso, o Certbot vai falhar.                                 │"
echo "└────────────────────────────────────────────────────────────────┘"
echo ""
read -p "O DNS já está apontando? (s/N) " dns_ok

if [[ "$dns_ok" =~ ^[Ss]$ ]]; then
    certbot --nginx -d "$DOMINIO" --non-interactive --agree-tos --email "$EMAIL_CERTBOT" --redirect
    echo ""
    echo "   Certificado SSL emitido com sucesso!"
    echo "   Renovação automática já configurada pelo Certbot."

    echo "   Aplicando configuração final com HTTPS e restrição de IP..."
    cat >/etc/nginx/sites-available/boleto-seeg <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMINIO};

    location /.well-known/acme-challenge/ {
        allow all;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMINIO};

    # Restrição de IP
    allow ${IP_PERMITIDO};
    deny all;

    ssl_certificate     /etc/letsencrypt/live/${DOMINIO}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMINIO}/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy no-referrer-when-downgrade always;

    client_max_body_size 1m;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }

    access_log /var/log/nginx/boleto-seeg-access.log;
    error_log  /var/log/nginx/boleto-seeg-error.log warn;
}
EOF

    nginx -t
    systemctl reload nginx
    echo "   Configuração final HTTPS aplicada."
else
    echo ""
    echo "   Certificado SSL adiado. Quando o DNS estiver configurado, execute:"
    echo "   sudo certbot --nginx -d $DOMINIO"
    echo ""
    echo "   Depois do certificado, aplique a configuração final com:"
    echo "   sudo cp $APP_DIR/nginx/boleto-seeg.conf /etc/nginx/sites-available/boleto-seeg"
    echo "   sudo nginx -t && sudo systemctl reload nginx"
    echo ""
fi

# ---------------------------------------------------------------------------
# INSTRUÇÕES FINAIS
# ---------------------------------------------------------------------------
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║   Infraestrutura pronta! Falta iniciar a aplicação   ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "Execute os comandos abaixo para finalizar:"
echo ""
echo "  # Mudar para o usuário da aplicação"
echo "  su - $APP_USER --shell /bin/bash"
echo ""
echo "  # Entrar no diretório"
echo "  cd $APP_DIR"
echo ""
echo "  # Configurar credenciais IXC (gera .env e credentials.enc)"
echo "  node setup.js"
echo ""
echo "  # Iniciar com PM2"
echo "  pm2 start ecosystem.config.js"
echo "  pm2 save"
echo "  pm2 startup systemd -u $APP_USER --hp $APP_DIR"
echo ""
echo "  # Testar"
echo "  curl http://127.0.0.1:3000/api/health"
echo ""
