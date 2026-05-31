#!/bin/sh
set -e

echo "==> Waiting for database..."
python <<'EOF'
import os
import sys
import time

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CashApp.settings')
django.setup()

from django.db import connection

for attempt in range(30):
    try:
        connection.ensure_connection()
        print("Database is ready.")
        break
    except Exception as exc:
        print(f"Database not ready ({attempt + 1}/30): {exc}")
        time.sleep(2)
else:
    sys.exit("Database connection failed")
EOF

echo "==> Running migrations..."
python manage.py migrate --noinput

echo "==> Initializing Redis index..."
python manage.py init_redis_index --recreate-if-dim-changed || echo "WARNING: Redis index init failed."

echo "==> Warming up embedding model..."
python -c "from chat.embeddings import warmup_embedding_model; warmup_embedding_model()" || echo "WARNING: Embedding warmup failed."

echo "==> Collecting static files..."
python manage.py collectstatic --noinput

echo "==> Starting gunicorn..."
WORKERS="${GUNICORN_WORKERS:-4}"
THREADS="${GUNICORN_THREADS:-1}"
TIMEOUT="${GUNICORN_TIMEOUT:-300}"
echo "Gunicorn: workers=${WORKERS} threads=${THREADS} timeout=${TIMEOUT}"

if [ "$THREADS" -gt 1 ]; then
  WORKER_CLASS="gthread"
else
  WORKER_CLASS="sync"
fi

exec gunicorn CashApp.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers "$WORKERS" \
    --threads "$THREADS" \
    --worker-class "$WORKER_CLASS" \
    --timeout "$TIMEOUT" \
    --preload \
    --access-logfile - \
    --error-logfile -
