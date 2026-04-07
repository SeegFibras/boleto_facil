#!/bin/bash
# =============================================================================
# Deploy Manual Forçado — SEEG FIBRAS Boletos
# Uso: bash /opt/boleto-seeg/deploy-force.sh
# =============================================================================

set -euo pipefail

PROJECT_DIR="/opt/boleto-seeg"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/deploy.log"
LOCK_FILE="/tmp/boleto-seeg-deploy.lock"
DEPLOY_INFO="$PROJECT_DIR/deploy-info.json"
APP_USER="seeg"
PM2_APP="boletos-seeg-fibras"
HEALTH_URL="http://127.0.0.1:3000/"
EXECUTABLE_PATH="/opt/boleto-seeg/.cache-puppeteer/chrome/linux-146.0.7680.153/chrome-linux64/chrome"

mkdir -p "$LOG_DIR"

log() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo "$msg" >> "$LOG_FILE"
    echo "$msg"  # Também imprime no terminal
}

# Lock
exec 200>"$LOCK_FILE"
if ! flock -n 200; then
    echo "ERRO: Deploy já em execução. Aguarde."
    exit 1
fi

cd "$PROJECT_DIR"

LOCAL_HEAD_BEFORE=$(su - "$APP_USER" -c "cd $PROJECT_DIR && git rev-parse HEAD")

log "=========================================="
log "DEPLOY MANUAL INICIADO"
log "Commit atual: $LOCAL_HEAD_BEFORE"

# Backup do pdfGenerator.js
cp "$PROJECT_DIR/src/services/pdfGenerator.js" "$PROJECT_DIR/src/services/pdfGenerator.js.bak"
log "Backup do pdfGenerator.js criado"

# Git pull
if ! su - "$APP_USER" -c "cd $PROJECT_DIR && git pull origin main" >> "$LOG_FILE" 2>&1; then
    log "ERRO: git pull falhou"
    cp "$PROJECT_DIR/src/services/pdfGenerator.js.bak" "$PROJECT_DIR/src/services/pdfGenerator.js"
    exit 1
fi

log "Git pull concluído"

# Restaura executablePath
if ! grep -q "executablePath" "$PROJECT_DIR/src/services/pdfGenerator.js"; then
    log "Restaurando executablePath no pdfGenerator.js"
    sed -i "s|puppeteer.launch({|puppeteer.launch({\n        executablePath: '$EXECUTABLE_PATH',|" "$PROJECT_DIR/src/services/pdfGenerator.js"
elif ! grep -q "$EXECUTABLE_PATH" "$PROJECT_DIR/src/services/pdfGenerator.js"; then
    log "Atualizando executablePath no pdfGenerator.js"
    sed -i "s|executablePath:.*|executablePath: '$EXECUTABLE_PATH',|" "$PROJECT_DIR/src/services/pdfGenerator.js"
fi

log "executablePath verificado/restaurado"

# Sempre reinstala dependências no deploy forçado
log "Rodando npm install..."
su - "$APP_USER" -c "cd $PROJECT_DIR && npm install --production" >> "$LOG_FILE" 2>&1
log "npm install concluído"

# Reinicia PM2
log "Reiniciando PM2..."
su - "$APP_USER" -c "pm2 restart $PM2_APP" >> "$LOG_FILE" 2>&1

# Espera e health check
sleep 5
PM2_STATUS=$(su - "$APP_USER" -c "pm2 jlist" 2>/dev/null | grep -o '"status":"[^"]*"' | head -1 || echo "unknown")
log "PM2 status: $PM2_STATUS"

HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$HEALTH_URL" || echo "000")
log "Health check: HTTP $HTTP_CODE"

if [ "$HTTP_CODE" != "200" ]; then
    log "AVISO: Health check retornou HTTP $HTTP_CODE"
    log "Verifique os logs do app: pm2 logs $PM2_APP"
else
    log "App online e respondendo"
fi

# Grava info do deploy
NEW_COMMIT=$(su - "$APP_USER" -c "cd $PROJECT_DIR && git rev-parse --short HEAD")
cat > "$DEPLOY_INFO" <<EOF
{
  "version": "$NEW_COMMIT",
  "fullCommit": "$(su - "$APP_USER" -c "cd $PROJECT_DIR && git rev-parse HEAD")",
  "lastDeploy": "$(date -u '+%Y-%m-%dT%H:%M:%SZ')",
  "deployedBy": "manual",
  "previousCommit": "$LOCAL_HEAD_BEFORE"
}
EOF
chown "$APP_USER":"$APP_USER" "$DEPLOY_INFO"

# Limpa backup
rm -f "$PROJECT_DIR/src/services/pdfGenerator.js.bak"

log "DEPLOY MANUAL CONCLUÍDO: $LOCAL_HEAD_BEFORE -> $NEW_COMMIT"
log "=========================================="
