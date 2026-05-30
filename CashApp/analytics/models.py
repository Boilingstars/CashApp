from django.db import models

# Create your models here.
class NotesForDBI(models.TextChoices):
    DEFAULT = 'default', 'Default'

class DebtBurdenIndicator(models.Model):
    indicator = models.IntegerField()
    note = models.TextField(blank=True)