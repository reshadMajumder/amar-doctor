#!/bin/bash

# Wait for postgres
if [ "$DATABASE" = "postgres" ]
then
    echo "Waiting for postgres..."

    while ! nc -z $DB_HOST $DB_PORT; do
      sleep 0.1
    done

    echo "PostgreSQL started"
fi

# Run migrations
python manage.py migrate --noinput

# Collect static files
python manage.py collectstatic --noinput

# Start application
if [ "$DEBUG" = "True" ]
then
    # Use daphne for local dev with auto-reload if possible, or just manage.py
    python manage.py runserver 0.0.0.0:8000
else
    # Use daphne for production (supports WebSockets)
    daphne -b 0.0.0.0 -p 8000 core.asgi:application
fi
