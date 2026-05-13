#!/bin/bash

DOMAIN=${1:-localhost}
SSL_DIR="./ssl/live/$DOMAIN"

mkdir -p "$SSL_DIR"

if [ ! -f "$SSL_DIR/fullchain.pem" ]; then
    echo "Generating self-signed certificate for $DOMAIN..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$SSL_DIR/privkey.pem" \
        -out "$SSL_DIR/fullchain.pem" \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=$DOMAIN"
else
    echo "Certificates already exist for $DOMAIN."
fi
