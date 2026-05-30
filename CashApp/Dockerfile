FROM python:3.13-alpine

RUN apk update && apk add --no-cache \
    gcc \
    musl-dev \
    postgresql-dev \
    python3-dev \
    libffi-dev \
    openssl-dev \
    cargo \
    && rm -rf /var/cache/apk/*

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \ PYTHONUNBUFFERED=1 \ PIP_NO_CACHE_DIR=1 \ PIP_DISABLE_PIP_VERSION_CHECK=1

COPY requirements.txt .

RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY . .

RUN adduser --disabled-password --gecos '' django-user && \
    chown -R django-user:django-user /app

USER django-user

CMD ["gunicorn", "CashApp.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "2", "--timeout", "120"]