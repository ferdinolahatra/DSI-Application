from django.conf import settings
from django.db import models

from tickets.models import Ticket


class Intervention(models.Model):

    class Resultat(models.TextChoices):
        RESOLU = "RESOLU", "Résolu"
        NON_RESOLU = "NON_RESOLU", "Non résolu"

    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name="interventions",
    )

    technicien = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="interventions",
    )

    date_intervention = models.DateTimeField()

    description = models.TextField()

    duree = models.PositiveIntegerField(
        help_text="Durée de l’intervention en minutes."
    )

    diagnostic = models.TextField(blank=True)

    solution = models.TextField(blank=True)

    resultat = models.CharField(
        max_length=20,
        choices=Resultat.choices,
        default=Resultat.NON_RESOLU,
    )

    # Statut calculé automatiquement selon le résultat.
    # Il n'est plus modifiable depuis le formulaire React.
    statut_final = models.CharField(
        max_length=50,
        blank=True,
    )

    date_creation = models.DateTimeField(auto_now_add=True)

    date_modification = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Intervention - {self.ticket.numero}"