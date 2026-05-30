from datetime import date, datetime


def parse_operation_date(value) -> date | None:
    """Привести date/datetime/ISO-строку к date."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        cleaned = value.strip()
        if not cleaned:
            return None
        if 'T' in cleaned:
            cleaned = cleaned.split('T', 1)[0]
        elif ' ' in cleaned:
            cleaned = cleaned.split(' ', 1)[0]
        return date.fromisoformat(cleaned[:10])
    return None


def operation_date_to_num(value) -> int:
    """YYYYMMDD для NumericField в Redis."""
    parsed = parse_operation_date(value)
    if not parsed:
        return 0
    return parsed.year * 10000 + parsed.month * 100 + parsed.day


def operation_date_to_iso(value) -> str | None:
    parsed = parse_operation_date(value)
    return parsed.isoformat() if parsed else None
