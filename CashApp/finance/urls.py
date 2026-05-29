from django.contrib import admin
from django.urls import path
from . import views

app_name = 'finance'

urlpatterns = [
    path('operations/filter/', views.OperationsFilterAPIView.as_view(), name='operations-filter'),
    path('operations/', views.OperationsAPIView.as_view(), name='operations'),
    path('services/', views.ServiceAPIView.as_view(), name='services-list'),
    path('categories/', views.CategoryAPIView.as_view(), name='categories-list'),
    path('products/', views.FinancialProductAPIView.as_view(), name='products-list'),
]