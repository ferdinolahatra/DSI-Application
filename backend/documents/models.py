from django.conf import settings
from django.db import models


class Document(models.Model):

    class Category(models.TextChoices):
        PROCEDURE = 'PROCEDURE', 'Procédure'
        GUIDE = 'GUIDE', 'Guide'
        FORMULAIRE = 'FORMULAIRE', 'Formulaire'
        NOTE_TECHNIQUE = 'NOTE_TECHNIQUE', 'Note technique'
        ADMINISTRATIF = 'ADMINISTRATIF', 'Document administratif'
        AUTRE = 'AUTRE', 'Autre'

    titre = models.CharField(
        max_length=255
    )

    description = models.TextField(
        blank=True
    )

    categorie = models.CharField(
        max_length=30,
        choices=Category.choices
    )

    fichier = models.FileField(
        upload_to='documents/'
    )

    auteur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='documents_crees'
    )

    publie = models.BooleanField(
        default=True
    )

    date_creation = models.DateTimeField(
        auto_now_add=True
    )

    date_modification = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return self.titre