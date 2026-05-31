#!/bin/bash
# Восстановление db_backup.dump при первом запуске PostgreSQL (docker-entrypoint-initdb.d).
set -e

DUMP_FILE="/docker-entrypoint-initdb.d/db_backup.dump"
SQL_FILE="/docker-entrypoint-initdb.d/db_backup.sql"

if [ -f "$DUMP_FILE" ]; then
  echo "==> Restoring PostgreSQL from db_backup.dump..."
  pg_restore -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --no-owner --role="${POSTGRES_USER}" "$DUMP_FILE" || {
    echo "WARNING: pg_restore finished with errors (возможно, БД уже частично заполнена)"
  }
elif [ -f "$SQL_FILE" ]; then
  echo "==> Restoring PostgreSQL from db_backup.sql..."
  psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -f "$SQL_FILE"
else
  echo "==> No db_backup.dump / db_backup.sql in init dir, skip restore."
fi
