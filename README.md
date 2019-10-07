# tipdivider
TipDivider webapp running on NodeJS

# Installation on Linux
```bash
cd /srv
git clone https://github.com/jetibest/tipdivider && cd tipdivider
node main.js 8081
```

Your webserver should proxy to http://localhost:8081/ so that it may use a proper domain/path and HTTPS on the front-end.

# Systemd service-file for tipdivider
nodejs-tipdivider.service:
```
[Unit]
Description=TipDivider project

[Service]
Type=simple
WorkingDirectory=/srv/tipdivider
ExecStart=/bin/bash -c 'cd /srv/tipdivider/ && node main.js 8081'
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
```
