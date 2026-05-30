import json
import logging

import django.contrib.auth
from django.conf import settings
from django.contrib.auth import get_user_model
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from .utils.jwt import generate_jwt_tokens, verify_jwt_token

User = get_user_model()
logger = logging.getLogger(__name__)


def validate_user(request):
    auth_header = request.headers.get('Authorization')

    if not auth_header:
        return JsonResponse({'error': 'Missing token'}, status=400)

    try:
        scheme, token = auth_header.split()
        if scheme.lower() != 'bearer':
            return JsonResponse({'error': 'Missing bearer'}, status=400)
    except ValueError:
        return JsonResponse({'error': 'Value error'}, status=400)

    try:
        payload = verify_jwt_token(token)
    except Exception as e:
        if str(e) == 'Token expired':
            return JsonResponse({'message': 'Access token expired'}, status=200)
        return JsonResponse({'error': 'Invalid token'}, status=400)

    try:
        user = User.objects.get(id=payload['user_id'])
    except User.DoesNotExist:
        return JsonResponse({'error': 'User not found'}, status=404)
    except KeyError:
        return JsonResponse({'error': 'User ID missing in token'}, status=400)

    return user


@csrf_exempt
@require_POST
def auth_user(request):
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return JsonResponse({'error': 'Email и пароль обязательны'}, status=400)

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return JsonResponse({'error': 'Неверные учётные данные'}, status=401)

    if not user.is_active or not user.check_password(password):
        return JsonResponse({'error': 'Неверные учётные данные'}, status=401)

    jwt_tokens = generate_jwt_tokens(user)

    return JsonResponse({
        'access_token': jwt_tokens['access'],
        'refresh_token': jwt_tokens['refresh'],
        'user': {
            'username': user.username,
            'phone': user.phone,
            'email': user.email,
        },
    })


@csrf_exempt
def refresh_jwt_tokens(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    refresh_token = data.get('refresh_token')
    if not refresh_token:
        return JsonResponse({'error': 'No data provided'}, status=400)

    try:
        payload = verify_jwt_token(refresh_token)
        if payload.get('type') != 'refresh':
            return JsonResponse({'error': 'Invalid token type'}, status=400)
        user = User.objects.get(id=payload['user_id'])
        if not user.is_active:
            return JsonResponse({'error': 'User inactive'}, status=401)
        return JsonResponse(generate_jwt_tokens(user), status=200)
    except User.DoesNotExist:
        return JsonResponse({'error': 'User not found'}, status=404)
    except Exception as exc:
        logger.warning('Token refresh failed: %s', exc)
        return JsonResponse({'error': 'Invalid token'}, status=400)


@csrf_exempt
def get_user_profile(request):
    user = validate_user(request)

    if isinstance(user, JsonResponse):
        return user

    return JsonResponse({
        'username': user.username,
        'phone': user.phone,
        'email': user.email,
    }, status=200)
