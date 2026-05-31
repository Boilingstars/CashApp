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

echo "==> Warming up embedding model..."
python -c "from chat.embeddings import warmup_embedding_model; warmup_embedding_model()" || echo "WARNING: Embedding warmup failed."

echo "==> Starting RQ worker (rag queue)..."
exec python manage.py rqworker rag default
