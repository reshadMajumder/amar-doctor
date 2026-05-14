#!/bin/bash

# Configuration
BACKUP_DIR="/mnt/backups/adurys_gallery"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="backup_$TIMESTAMP.sql.gz"
RETENTION_DAYS=7

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

echo "Starting database backup at $(date)..."

# Perform backup using docker exec
# We use the environment variables defined in the container
docker exec adurys-gallery-db-1 pg_dump -U "$DB_USER" -d "$DB_NAME" | gzip > "$BACKUP_DIR/$BACKUP_FILE"

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "Backup successful: $BACKUP_DIR/$BACKUP_FILE"
else
    echo "Backup failed!"
    exit 1
fi

# Retention cleanup
echo "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -type f -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup process completed at $(date)."
