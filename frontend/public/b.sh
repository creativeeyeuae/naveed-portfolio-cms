#!/bin/bash
set -e
cd /opt/wb/whatsapp-bridge
curl -fsSL https://raw.githubusercontent.com/creativeeyeuae/naveed-portfolio-cms/main/whatsapp-bridge/index.js -o /tmp/wa-bridge-check.js
node --check /tmp/wa-bridge-check.js
mv /tmp/wa-bridge-check.js index.js
pm2 restart wa-bridge
echo '== Bridge updated and restarted. Now press Connect (show QR) in the CMS. =='
