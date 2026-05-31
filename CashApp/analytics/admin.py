from django.contrib import admin

from .models import DebtBurdenIndicator


@admin.register(DebtBurdenIndicator)
class DebtBurdenIndicatorAdmin(admin.ModelAdmin):
    list_display = (
        'user',
        'year',
        'month',
        'indicator',
        'credit_payments',
        'income_total',
        'note',
        'calculated_at',
    )
    list_filter = ('year', 'month', 'note')
    search_fields = ('user__username', 'user__email')
    readonly_fields = ('calculated_at',)
