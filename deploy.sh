#!/bin/bash
# =============================================================================
# Auto-Deploy Script — SEEG FIBRAS Boletos
# Roda via cron a cada 2 minutos como root
# Uso: */2 * * * * /opt/boleto-seeg/deploy.sh >> /opt/boleto-seeg/logs/deploy-cron.log 2>&1
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
MAX_LOG_SIZE=5242880  # 5MB

# Garante que o diretório de logs existe
mkdir -p "$LOG_DIR"

# Rotação de log simples: trunca se passar de MAX_LOG_SIZE
if [ -f "$LOG_FILE" ] && [ "$(stat -c%s "$LOG_FILE" 2>/dev/null || echo 0)" -gt "$MAX_LOG_SIZE" ]; then
    tail -n 500 "$LOG_FILE" > "$LOG_FILE.tmp"
    mv "$LOG_FILE.tmp" "$LOG_FILE"
fi

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Lock para evitar execuções simultâneas
exec 200>"$LOCK_FILE"
if ! flock -n 200; then
    log "SKIP: Deploy já em execução"
    exit 0
fi

cd "$PROJECT_DIR"

# Fetch e verifica se há novos commits
su - "$APP_USER" -c "cd $PROJECT_DIR && git fetch origin main" >> "$LOG_FILE" 2>&1

LOCAL_HEAD=$(su - "$APP_USER" -c "cd $PROJECT_DIR && git rev-parse HEAD")
REMOTE_HEAD=$(su - "$APP_USER" -c "cd $PROJECT_DIR && git rev-parse origin/main")

if [ "$LOCAL_HEAD" = "$REMOTE_HEAD" ]; then
    exit 0
fi

log "=========================================="
log "DEPLOY INICIADO"
log "Local:  $LOCAL_HEAD"
log "Remote: $REMOTE_HEAD"

# Hash do package.json antes do pull
PKG_HASH_BEFORE=$(md5sum "$PROJECT_DIR/package.json" | awk '{print $1}')

# Git pull
if ! su - "$APP_USER" -c "cd $PROJECT_DIR && git pull origin main" >> "$LOG_FILE" 2>&1; then
    log "ERRO: git pull falhou"
    exit 1
fi

log "Git pull concluído"

# Verifica se package.json mudou
PKG_HASH_AFTER=$(md5sum "$PROJECT_DIR/package.json" | awk '{print $1}')
if [ "$PKG_HASH_BEFORE" != "$PKG_HASH_AFTER" ]; then
    log "package.json mudou — rodando npm install"
    su - "$APP_USER" -c "cd $PROJECT_DIR && npm install --production" >> "$LOG_FILE" 2>&1
    log "npm install concluído"
fi

# Reinicia PM2
log "Reiniciando PM2..."
su - "$APP_USER" -c "pm2 restart $PM2_APP" >> "$LOG_FILE" 2>&1

# Espera e verifica status
sleep 5
PM2_STATUS=$(su - "$APP_USER" -c "pm2 jlist" 2>/dev/null | grep -o '"status":"[^"]*"' | head -1 || echo "unknown")
log "PM2 status: $PM2_STATUS"

# Health check
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$HEALTH_URL" || echo "000")
log "Health check: HTTP $HTTP_CODE"

if [ "$HTTP_CODE" != "200" ]; then
    log "ERRO: Health check falhou (HTTP $HTTP_CODE) — iniciando rollback"

    su - "$APP_USER" -c "cd $PROJECT_DIR && git reset --hard HEAD~1" >> "$LOG_FILE" 2>&1

    su - "$APP_USER" -c "pm2 restart $PM2_APP" >> "$LOG_FILE" 2>&1
    sleep 5

    ROLLBACK_CHECK=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$HEALTH_URL" || echo "000")
    log "Rollback health check: HTTP $ROLLBACK_CHECK"
    log "DEPLOY FALHOU — rollback aplicado"
    log "=========================================="
    exit 1
fi

# Grava info do deploy
NEW_COMMIT=$(su - "$APP_USER" -c "cd $PROJECT_DIR && git rev-parse --short HEAD")
FULL_COMMIT=$(su - "$APP_USER" -c "cd $PROJECT_DIR && git rev-parse HEAD")
cat > "$DEPLOY_INFO" <<EOF
{
  "version": "$NEW_COMMIT",
  "fullCommit": "$FULL_COMMIT",
  "lastDeploy": "$(date -u '+%Y-%m-%dT%H:%M:%SZ')",
  "deployedBy": "auto",
  "previousCommit": "$LOCAL_HEAD"
}
EOF
chown "$APP_USER":"$APP_USER" "$DEPLOY_INFO"

log "DEPLOY CONCLUÍDO com sucesso: $LOCAL_HEAD -> $NEW_COMMIT"
log "=========================================="
