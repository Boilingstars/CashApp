from django.contrib import admin
from django.urls import path
from . import views

app_name = 'finance'

urlpatterns = [
    path('api/operations/filter/', views.OperationsFilterAPIView.as_view(), name='operations-filter'),
    path('api/operations/', views.OperationsAPIView.as_view(), name='operations-filter'),
    path('api/services/', views.ServiceAPIView.as_view(), name='services-list'),
    path('api/categories/', views.CategoryAPIView.as_view(), name='categories-list'),
    path('api/products/', views.FinancialProductAPIView.as_view(), name='products-list'),
]