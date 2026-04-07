#!/bin/bash
# =============================================================================
# Instala o cron job do auto-deploy
# Executar como root na VPS: bash /opt/boleto-seeg/install-cron.sh
# =============================================================================

CRON_LINE="*/2 * * * * /opt/boleto-seeg/deploy.sh >> /opt/boleto-seeg/logs/deploy-cron.log 2>&1"

# Torna os scripts executáveis
chmod +x /opt/boleto-seeg/deploy.sh
chmod +x /opt/boleto-seeg/deploy-force.sh

# Adiciona ao cron do root (evita duplicação)
(crontab -l 2>/dev/null | grep -v "boleto-seeg/deploy.sh"; echo "$CRON_LINE") | crontab -

echo "Cron job instalado:"
crontab -l | grep boleto-seeg
echo ""
echo "Auto-deploy ativo! Verificando a cada 2 minutos."
echo ""
echo "Para forçar um deploy manual:"
echo "  bash /opt/boleto-seeg/deploy-force.sh"
echo ""
echo "Para ver os logs:"
echo "  tail -f /opt/boleto-seeg/logs/deploy.log"
