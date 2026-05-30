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
python manage.py init_redis_index || echo "WARNING: Redis index init failed, gunicorn will still start."

echo "==> Collecting static files..."
python manage.py collectstatic --noinput

echo "==> Starting gunicorn..."
exec gunicorn CashApp.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 2 \
    --timeout 300 \
    --access-logfile - \
    --error-logfile -
