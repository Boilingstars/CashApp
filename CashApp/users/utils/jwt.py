import jwt
from datetime import datetime, timedelta
from django.conf import settings


def generate_jwt_tokens(user):
    access_payload = {
        'user_id': user.id,
        'email': user.email,
        'type': 'access',
        'exp': datetime.utcnow() + timedelta(minutes=15),
        'iat': datetime.utcnow(),
    }
    access_token = jwt.encode(
        access_payload,
        settings.SECRET_KEY,
        algorithm='HS256'
    )
    refresh_payload = {
        'user_id': user.id,
        'type': 'refresh',
        'exp': datetime.utcnow() + timedelta(days=7),
        'iat': datetime.utcnow(),
    }
    refresh_token = jwt.encode(
        refresh_payload,
        settings.SECRET_KEY,
        algorithm='HS256'
    )
    return {
        'access': access_token,
        'refresh': refresh_token,
    }


def verify_jwt_token(token):
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=['HS256']
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise Exception('Token expired')
    except jwt.InvalidTokenError:
        raise Exception('Invalid token')