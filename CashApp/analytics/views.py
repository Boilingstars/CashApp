from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from finance.views import OperationSerializer

from .models import DebtBurdenIndicator
from .services import (
    calendar_month_bounds,
    credit_payment_operations,
    get_dbi_for_user,
    income_operations,
    recalculate_dbi_for_user,
)


class DebtBurdenIndicatorSerializer(serializers.ModelSerializer):
    indicator_percent = serializers.SerializerMethodField()
    note_display = serializers.CharField(source='get_note_display', read_only=True)

    class Meta:
        model = DebtBurdenIndicator
        fields = [
            'year',
            'month',
            'indicator',
            'indicator_percent',
            'credit_payments',
            'income_total',
            'note',
            'note_display',
            'calculated_at',
        ]

    def get_indicator_percent(self, obj) -> str:
        return str(obj.indicator_percent)


class DebtBurdenIndicatorView(APIView):
    """
    GET /api/analytics/debt-burden/
    Кредитный индекс, платежи по кредитам и доход за календарный месяц.
    Query: ?year=2026&month=5 (опционально, по умолчанию текущий месяц)
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        year = request.query_params.get('year')
        month = request.query_params.get('month')

        try:
            year = int(year) if year is not None else None
            month = int(month) if month is not None else None
            if month is not None and not (1 <= month <= 12):
                raise ValueError
        except (TypeError, ValueError):
            return Response(
                {'error': 'Параметры year и month должны быть целыми; month — от 1 до 12'},
                status=400,
            )

        dbi = get_dbi_for_user(request.user.id, year=year, month=month)
        if dbi is None:
            dbi = recalculate_dbi_for_user(
                request.user.id,
                year=year,
                month=month,
                sync_rag=False,
            )

        resolved_year, resolved_month = dbi.year, dbi.month
        date_from, date_to = calendar_month_bounds(resolved_year, resolved_month)

        credit_qs = credit_payment_operations(request.user, date_from, date_to)
        income_qs = income_operations(request.user, date_from, date_to)

        return Response(
            {
                **DebtBurdenIndicatorSerializer(dbi).data,
                'period': {
                    'year': resolved_year,
                    'month': resolved_month,
                    'date_from': date_from.isoformat(),
                    'date_to': date_to.isoformat(),
                },
                'credit_payments': OperationSerializer(credit_qs, many=True).data,
                'income': OperationSerializer(income_qs, many=True).data,
            }
        )
