FROM nginx:1.25-alpine

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy templates for envsubst
COPY templates/ /etc/nginx/templates/
