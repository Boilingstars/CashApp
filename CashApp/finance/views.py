# finance/views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.generics import ListAPIView

from .models import Operation, Category, Service, FinancialProduct
from django.db.models import Q


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name']


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ['id', 'name']


class FinancialProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinancialProduct
        fields = ['id', 'serial_number', 'bank_name', 'custom_name', 'currency_code']


class OperationSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    service = ServiceSerializer(read_only=True)
    account = FinancialProductSerializer(read_only=True)

    class Meta:
        model = Operation
        fields = '__all__'


class OperationsFilterAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, format=None):
        """
        {
            "categories": ["Продукты", "Кафе"],
            "services": ["Перекрёсток", "Кофе Хауз"],
            "card": {"serial_number": "1001", "bank": "sber"}, // bank – значение из Bank.choices
            "type": "expense", // income, expense, transfer
            "year": 2025,
            "month": 5,
            "day": 15
        }
        """
        user = request.user
        operations = Operation.objects.filter(user=user)

        # Фильтр по категориям
        categories = request.data.get('categories')
        if categories:
            if isinstance(categories, list) and all(isinstance(c, str) for c in categories):
                operations = operations.filter(category__name__in=categories)
            else:
                return Response(
                    {"error": "Поле 'categories' должно быть списком строк."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Фильтр по организациям (сервисам)
        services = request.data.get('services')
        if services:
            if isinstance(services, list) and all(isinstance(s, str) for s in services):
                operations = operations.filter(service__name__in=services)
            else:
                return Response(
                    {"error": "Поле 'services' должно быть списком строк."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Фильтр по карте (серийный номер + банк)
        card = request.data.get('card')
        if card:
            if isinstance(card, dict) and 'serial_number' in card and 'bank' in card:
                operations = operations.filter(
                    account__serial_number=card['serial_number'],
                    account__bank_name=card['bank']
                )
            else:
                return Response(
                    {"error": "Поле 'card' должно быть словарём с ключами 'serial_number' и 'bank'."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Фильтр по дате
        year = request.data.get('year')
        month = request.data.get('month')
        day = request.data.get('day')

        try:
            if year is not None:
                year = int(year)
                operations = operations.filter(operation_date__year=year)
            if month is not None:
                month = int(month)
                if not (1 <= month <= 12):
                    raise ValueError
                operations = operations.filter(operation_date__month=month)
            if day is not None:
                day = int(day)
                if not (1 <= day <= 31):
                    raise ValueError
                operations = operations.filter(operation_date__day=day)
        except (ValueError, TypeError):
            return Response(
                {"error": "Поля 'year', 'month', 'day' должны быть целыми числами в допустимых диапазонах."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Фильтр по типу операции
        op_type = request.data.get('type')
        if op_type:
            valid_types = ['income', 'expense', 'transfer']
            if op_type in valid_types:
                operations = operations.filter(operation_type=op_type)
            else:
                return Response(
                    {"error": f"Поле 'type' должно быть одним из: {valid_types}."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Сортировка по умолчанию (сначала новые)
        operations = operations.order_by('-operation_date', '-operation_time')

        # Сериализация и ответ
        serializer = OperationSerializer(operations, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class OperationsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Operation.objects.filter(user=user)


class ServiceAPIView(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ServiceSerializer

    def get_queryset(self):
        user = self.request.user
        return Service.objects.filter(Q(user=user) | Q(user__isnull=True))


class CategoryAPIView(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CategorySerializer

    def get_queryset(self):
        user = self.request.user
        return Category.objects.filter(Q(user=user) | Q(user__isnull=True))


class FinancialProductAPIView(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = FinancialProductSerializer

    def get_queryset(self):
        user = self.request.user
        return FinancialProduct.objects.filter(user=user)