from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone


class User(AbstractUser):
    username = models.CharField(
        blank=True,
        null=True,
        unique=True,
    )
    phone = models.CharField(
        max_length=20,
        blank=True,
        null=True
    )
    email = models.EmailField(
        unique=True,
        blank=False,
        null=False,
        default=''
    )