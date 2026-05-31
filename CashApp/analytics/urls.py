from django.urls import path

from . import views

app_name = 'analytics'

urlpatterns = [
    path('debt-burden/', views.DebtBurdenIndicatorView.as_view(), name='debt-burden'),
]
