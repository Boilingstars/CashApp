from django.contrib import admin
from django.urls import path
from . import views

app_name = 'finance'

urlpatterns = [
    path('api/operations/filter/', views.OperationsFilterAPIView.as_view(), name='operations-filter')
]