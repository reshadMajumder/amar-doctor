#!/bin/bash

if [ -z "$1" ]; then
    echo "Usage: $0 <path_to_backup.sql.gz>"
    exit 1
fi

BACKUP_FILE=$1

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: File $BACKUP_FILE not found."
    exit 1
fi

echo "Restoring database from $BACKUP_FILE..."

# Decompress and import
gunzip -c "$BACKUP_FILE" | docker exec -i adurys-gallery-db-1 psql -U "$DB_USER" -d "$DB_NAME"

if [ $? -eq 0 ]; then
    echo "Restore successful."
else
    echo "Restore failed!"
    exit 1
fi
