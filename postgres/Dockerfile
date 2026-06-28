# Use the official PostgreSQL 17 alpine image as the base
FROM postgres:17-alpine

# Set default environment variables for database credentials
ENV POSTGRES_DB=amardoctor
ENV POSTGRES_USER=postgres
ENV POSTGRES_PASSWORD=postgres

# Configure encoding and locale settings
ENV POSTGRES_INITDB_ARGS="--encoding=UTF8 --locale=en_US.UTF-8"

# Expose the default PostgreSQL port
EXPOSE 5432
