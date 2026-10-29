#!/bin/bash
# Run on the API server: sudo bash ~/ahrah/deploy/fix-nginx.sh
set -euo pipefail

echo "=== 1. Ahrah container must answer on 8787 ==="
if ! curl -sf http://127.0.0.1:8787/api/health | grep -q '"ok":true'; then
  echo "Ahrah is not on 127.0.0.1:8787 (expected {\"ok\":true})."
  echo "Start it first, for example:"
  echo "  cd /opt/ahrah-api && docker compose up -d"
  docker ps --format 'table {{.Names}}\t{{.Ports}}\t{{.Status}}' || true
  exit 1
fi
echo "local :8787 OK"
echo

echo "=== 2. Remove api.ahrah.com from Cliaces if present ==="
if sudo grep -R --line-number "api.ahrah.com" /etc/nginx/conf.d /etc/nginx/sites-enabled 2>/dev/null | grep -v "ahrah-api.conf"; then
  echo
  echo "STOP. api.ahrah.com is still in another nginx file (likely cliaces.conf)."
  echo "Delete that hostname from cliaces.conf, then run this script again."
  exit 1
fi
echo "not listed outside ahrah-api.conf"
echo

CERT_DIR=""
for dir in /etc/letsencrypt/live/api.ahrah.com /etc/letsencrypt/live/ahrah.com; do
  if [ -f "$dir/fullchain.pem" ]; then
    CERT_DIR="$dir"
    break
  fi
done
if [ -z "$CERT_DIR" ]; then
  echo "No Let's Encrypt cert found. Listing live certs:"
  sudo ls /etc/letsencrypt/live || true
  echo "Issue one with: sudo certbot certonly --nginx -d api.ahrah.com"
  exit 1
fi
echo "using cert $CERT_DIR"
echo

SSL_EXTRAS=""
if [ -f /etc/letsencrypt/options-ssl-nginx.conf ]; then
  SSL_EXTRAS="${SSL_EXTRAS}
    include /etc/letsencrypt/options-ssl-nginx.conf;"
fi
if [ -f /etc/letsencrypt/ssl-dhparams.pem ]; then
  SSL_EXTRAS="${SSL_EXTRAS}
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;"
fi

sudo tee /etc/nginx/conf.d/ahrah-api.conf >/dev/null <<EOF
server {
    listen 443 ssl;
    http2 on;
    server_name api.ahrah.com;

    ssl_certificate ${CERT_DIR}/fullchain.pem;
    ssl_certificate_key ${CERT_DIR}/privkey.pem;${SSL_EXTRAS}

    client_max_body_size 16k;

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 30s;
        proxy_connect_timeout 5s;
    }
}

server {
    listen 80;
    server_name api.ahrah.com;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}
EOF

echo "=== 3. Reload nginx ==="
sudo nginx -t
sudo systemctl reload nginx
echo

echo "=== 4. Hit local nginx with the right Host (bypasses Cloudflare) ==="
curl -sk --resolve api.ahrah.com:443:127.0.0.1 https://api.ahrah.com/api/health
echo
echo "That line must be {\"ok\":true}. If it still shows database/connected, nginx is still using Cliaces."
