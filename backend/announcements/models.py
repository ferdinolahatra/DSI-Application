from django.conf import settings
from django.db import models


class Announcement(models.Model):

    class Type(models.TextChoices):
        INFORMATION = 'INFORMATION', 'Information'
        MAINTENANCE = 'MAINTENANCE', 'Maintenance'
        ALERTE = 'ALERTE', 'Alerte'
        INTERRUPTION = 'INTERRUPTION', 'Interruption de service'

    titre = models.CharField(
        max_length=255
    )

    contenu = models.TextField()

    type = models.CharField(
        max_length=20,
        choices=Type.choices,
        default=Type.INFORMATION
    )

    auteur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='annonces_creees'
    )

    publie = models.BooleanField(
        default=False
    )

    date_publication = models.DateTimeField(
        null=True,
        blank=True
    )

    date_debut = models.DateTimeField(
        null=True,
        blank=True
    )

    date_fin = models.DateTimeField(
        null=True,
        blank=True
    )

    date_creation = models.DateTimeField(
        auto_now_add=True
    )

    date_modification = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return self.titre