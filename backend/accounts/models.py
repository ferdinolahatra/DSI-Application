from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):

    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'Administrateur DSI'
        TECHNICIEN = 'TECHNICIEN', 'Technicien DSI'
        AGENT = 'AGENT', 'Agent du ministère'

    email = models.EmailField(unique=True)

    fonction = models.CharField(
        max_length=150,
        blank=True
    )

    service = models.CharField(
        max_length=150,
        blank=True
    )

    identifiant = models.CharField(
        max_length=100,
        unique=True
    )

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.AGENT
    )

    compte_actif = models.BooleanField(
        default=True
    )

    date_creation = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return f"{self.username} - {self.get_role_display()}"