from django.contrib import admin
from django.urls import path
from . import views

app_name = 'users'

urlpatterns = [
    path('/get_profile', views.get_user_profile, name='get_user_profile'),
    path('/refresh', views.refresh_jwt_tokens, name='refresh_jwt_tokens'),
]