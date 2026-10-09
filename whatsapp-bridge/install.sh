#!/bin/bash
# One-line installer for the WhatsApp bridge, run on the VPS as root:
#   curl -fsSL https://raw.githubusercontent.com/creativeeyeuae/naveed-portfolio-cms/main/whatsapp-bridge/install.sh | bash -s YOUR_BRIDGE_SECRET
# Downloads the bridge from this repo, writes .env with the secret given on the command
# line (the secret is never stored in GitHub), installs Node 20 + pm2, starts it, and also
# installs fail2ban so password-guessing bots can't clog SSH.
set -e
SECRET="$1"
if [ -z "$SECRET" ]; then echo "Usage: ... | bash -s YOUR_BRIDGE_SECRET"; exit 1; fi
RAW=https://raw.githubusercontent.com/creativeeyeuae/naveed-portfolio-cms/main/whatsapp-bridge
DIR=/opt/wb/whatsapp-bridge

echo "== Installing Node.js 20, pm2 and fail2ban =="
apt-get update -y
apt-get install -y curl ca-certificates fail2ban
if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
command -v pm2 >/dev/null || npm install -g pm2
systemctl enable --now fail2ban || true

echo "== Downloading the bridge =="
mkdir -p "$DIR"
cd "$DIR"
for f in index.js package.json package-lock.json; do curl -fsSL "$RAW/$f" -o "$f"; done
printf 'BRIDGE_TARGET_URL=https://bynaveedanjum.com\nBRIDGE_SECRET=%s\nPOLL_INTERVAL_MS=15000\n' "$SECRET" > .env
chmod 600 .env
npm install --omit=dev

echo "== Starting the bridge =="
pm2 delete all >/dev/null 2>&1 || true
pm2 start index.js --name wa-bridge
pm2 save
pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true
echo ""
echo "== DONE. Bridge is running. Press 'Connect (show QR)' in your CMS (WhatsApp > Settings). =="
pm2 list
