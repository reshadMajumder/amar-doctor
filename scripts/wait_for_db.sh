#!/bin/bash
set -e

# Wait for PostgreSQL to be ready
MAX_RETRIES=30
RETRY_INTERVAL=1

for i in $(seq 1 $MAX_RETRIES); do
    if nc -z $DB_HOST $DB_PORT 2>/dev/null; then
        echo "✓ Database is ready!"
        exit 0
    fi
    
    if [ $i -lt $MAX_RETRIES ]; then
        echo "Database not ready, waiting... ($i/$MAX_RETRIES)"
        sleep $RETRY_INTERVAL
    fi
done

echo "✗ Database failed to start after $MAX_RETRIES attempts"
exit 1
