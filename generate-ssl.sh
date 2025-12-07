#!/bin/bash
mkdir -p certs

if [ ! -f certs/server.key ]; then
    echo "Generating self-signed certificate..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout certs/server.key \
        -out certs/server.crt \
        -subj "/C=CN/ST=State/L=City/O=Organization/CN=localhost"
    echo "Certificate generated in certs/"
else
    echo "Certificate already exists."
fi
