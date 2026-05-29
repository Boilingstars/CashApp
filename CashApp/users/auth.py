from rest_framework import authentication
from rest_framework import exceptions
from django.contrib.auth import get_user_model
from .utils.jwt import verify_jwt_token  # путь к вашей функции

User = get_user_model()


class CustomJWTAuthentication(authentication.BaseAuthentication):
    keyword = 'Bearer'

    def authenticate(self, request):
        auth_header = authentication.get_authorization_header(request).decode('utf-8')

        if not auth_header or ' ' not in auth_header:
            return None

        parts = auth_header.split()
        if parts[0].lower() != self.keyword.lower():
            return None

        token = parts[1]
        if not token:
            return None

        try:
            payload = verify_jwt_token(token)
        except Exception as e:
            raise exceptions.AuthenticationFailed(str(e))

        user_id = payload.get('user_id')
        if not user_id:
            raise exceptions.AuthenticationFailed('Token payload does not contain user_id')

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            raise exceptions.AuthenticationFailed('User not found')

        if not user.is_active:
            raise exceptions.AuthenticationFailed('User inactive or deleted')

        return user, None