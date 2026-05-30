from django.contrib import admin
from django.urls import path
from . import views

app_name = 'finance'

urlpatterns = [
    path('operations/filter/', views.OperationsFilterAPIView.as_view(), name='operations-filter'),
    path('operations/', views.OperationsAPIView.as_view(), name='operations-list'),
    path('operations/create/', views.OperationCreateView.as_view(), name='operations-create'),
    path('operations/<int:pk>/', views.OperationDetailView.as_view(), name='operations-detail'),
    path('products/', views.FinancialProductAPIView.as_view(), name='products-list'),
    path('products/create/', views.FinancialProductCreateView.as_view(), name='products-create'),
    path('products/<int:pk>/', views.FinancialProductDetailView.as_view(), name='products-detail'),
    path('services/', views.ServiceAPIView.as_view(), name='services-list'),
    path('categories/', views.CategoryAPIView.as_view(), name='categories-list'),
]