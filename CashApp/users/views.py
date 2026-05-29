import django.contrib.auth
import requests
import json

from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .utils.jwt import generate_jwt_tokens
from .utils.jwt import verify_jwt_token

User = django.contrib.auth.get_user_model()

# Create your views here.

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
        if e == 'Token expired':
            return JsonResponse({'message': 'Access token expired'}, status=200)
        else:
            return JsonResponse({'error': 'Invalid token'}, status=400)

    try:
        user = User.objects.get(id=payload['user_id'])
    except User.DoesNotExist:
        return JsonResponse({'error': 'User not found'}, status=404)
    except KeyError:
        return JsonResponse({'error': 'User ID missing in token'}, status=400)

    return user


@csrf_exempt
def refresh_jwt_tokens(request):
    """
    POST /auth/refresh/
    """
    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            refresh_token = data['refresh_token']
            try:
                payload = verify_jwt_token(refresh_token)
                user_id = payload['user_id']
                user = User.objects.get(id=user_id)
                return JsonResponse(generate_jwt_tokens(user), status=200)
            except Exception as e:
                return JsonResponse({'error': f'{e}'}, status=400)
        except KeyError:
            return JsonResponse({'error': 'No data provided'}, status=400)
    else:
        return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
def get_user_profile(request):
    """
    GET /auth/get_user_profile/
    """
    user = validate_user(request)

    if isinstance(user, JsonResponse):
        return user

    params = {
        'username': user.username,
        'phone': user.phone,
        'email': user.email,
    }

    return JsonResponse(params, status=200)