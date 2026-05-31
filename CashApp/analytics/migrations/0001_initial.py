# Generated manually for DebtBurdenIndicator

import decimal
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='DebtBurdenIndicator',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('year', models.PositiveSmallIntegerField()),
                ('month', models.PositiveSmallIntegerField()),
                (
                    'credit_payments',
                    models.DecimalField(
                        decimal_places=2,
                        default=decimal.Decimal('0'),
                        max_digits=15,
                        verbose_name='Платежи по кредитам за месяц',
                    ),
                ),
                (
                    'income_total',
                    models.DecimalField(
                        decimal_places=2,
                        default=decimal.Decimal('0'),
                        max_digits=15,
                        verbose_name='Доход за месяц',
                    ),
                ),
                (
                    'indicator',
                    models.DecimalField(
                        decimal_places=4,
                        default=decimal.Decimal('0'),
                        help_text='Отношение credit_payments / income_total (0.25 = 25%)',
                        max_digits=8,
                    ),
                ),
                (
                    'note',
                    models.CharField(
                        choices=[
                            ('default', 'Рассчитан по операциям за месяц'),
                            ('no_income', 'Нет дохода за месяц'),
                            ('no_credit_payments', 'Нет платежей по кредитам за месяц'),
                        ],
                        default='default',
                        max_length=32,
                    ),
                ),
                ('calculated_at', models.DateTimeField(auto_now=True)),
                (
                    'user',
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name='debt_burden_indicators',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                'ordering': ['-year', '-month'],
            },
        ),
        migrations.AddIndex(
            model_name='debtburdenindicator',
            index=models.Index(fields=['user', 'year', 'month'], name='analytics_d_user_id_6a8b2d_idx'),
        ),
        migrations.AddConstraint(
            model_name='debtburdenindicator',
            constraint=models.UniqueConstraint(
                fields=('user', 'year', 'month'),
                name='unique_dbi_per_user_month',
            ),
        ),
    ]
