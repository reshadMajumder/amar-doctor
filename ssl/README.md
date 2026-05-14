# Cloudflare Origin SSL

Place the Cloudflare Origin Certificate and Private Key here as:

- `cert.pem`
- `key.pem`

These files are mounted into Nginx at `/etc/nginx/ssl/` by `docker-compose.yml`.
Keep the certs out of git; the repository `.gitignore` ignores `*.pem` files.