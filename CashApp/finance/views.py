from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, serializers, generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.generics import ListAPIView
from rest_framework.pagination import PageNumberPagination

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
        fields = ['id', 'serial_number', 'bank_name', 'amount', 'custom_name', 'product_type', 'currency_code']


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

        categories = request.data.get('categories')
        if categories:
            if isinstance(categories, list) and all(isinstance(c, str) for c in categories):
                operations = operations.filter(category__name__in=categories)
            else:
                return Response(
                    {"error": "Поле 'categories' должно быть списком строк."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        services = request.data.get('services')
        if services:
            if isinstance(services, list) and all(isinstance(s, str) for s in services):
                operations = operations.filter(service__name__in=services)
            else:
                return Response(
                    {"error": "Поле 'services' должно быть списком строк."},
                    status=status.HTTP_400_BAD_REQUEST
                )

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

        operations = operations.order_by('-operation_date', '-operation_time')

        serializer = OperationSerializer(operations, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class SmallResultsPagination(PageNumberPagination):
    page_size = 15


class OperationsAPIView(ListAPIView):
    serializer_class = OperationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = SmallResultsPagination

    def get_queryset(self):
        user = self.request.user
        return (
            Operation.objects.filter(user=user)
            .select_related('category', 'service', 'account')
            .order_by('-operation_date', '-operation_time', '-id')
        )


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


class OperationWriteSerializer(serializers.ModelSerializer):
    service_id = serializers.PrimaryKeyRelatedField(
        queryset=Service.objects.all(), source='service', required=False, allow_null=True
    )
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source='category', required=False, allow_null=True
    )
    account_id = serializers.PrimaryKeyRelatedField(
        queryset=FinancialProduct.objects.all(), source='account', required=False, allow_null=True
    )

    class Meta:
        model = Operation
        fields = [
            'id', 'operation_type', 'currency_code', 'amount', 'note',
            'operation_date', 'operation_time', 'service_id', 'category_id', 'account_id'
        ]
        read_only_fields = ['id']


class FinancialProductWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinancialProduct
        fields = [
            'id', 'product_type', 'bank_name', 'serial_number',
            'currency_code', 'amount', 'custom_name'
        ]
        read_only_fields = ['id']

    def validate_serial_number(self, value):
        if value:
            user = self.context['request'].user
            if FinancialProduct.objects.exclude(id=self.instance.id if self.instance else None)\
                    .filter(serial_number=value, user=user).exists():
                raise serializers.ValidationError("Продукт с таким серийным номером уже существует.")
        return value


class OperationCreateView(generics.CreateAPIView):
    serializer_class = OperationWriteSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class OperationDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Operation.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return OperationWriteSerializer
        return OperationSerializer

    def get_queryset(self):
        return Operation.objects.filter(user=self.request.user)

    def perform_update(self, serializer):
        serializer.save(user=self.request.user)


class FinancialProductCreateView(generics.CreateAPIView):
    serializer_class = FinancialProductWriteSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class FinancialProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = FinancialProduct.objects.all()
    permission_classes = [IsAuthenticated]
    serializer_class = FinancialProductWriteSerializer

    def get_queryset(self):
        return FinancialProduct.objects.filter(user=self.request.user)

    def perform_update(self, serializer):
        serializer.save(user=self.request.user)