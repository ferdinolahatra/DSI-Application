
from django.conf import settings
from django.db import models


class Notification(models.Model):

    class Type(models.TextChoices):
        TICKET = 'TICKET', 'Ticket'
        AFFECTATION = 'AFFECTATION', 'Affectation'
        STATUT = 'STATUT', 'Changement de statut'
        COMMENTAIRE = 'COMMENTAIRE', 'Commentaire'
        RESOLUTION = 'RESOLUTION', 'Résolution'
        INTERVENTION = 'INTERVENTION', 'Intervention'
        ANNONCE = 'ANNONCE', 'Annonce'
        ALERTE = 'ALERTE', 'Alerte'
        SYSTEME = 'SYSTEME', 'Système'

    destinataire = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )

    type = models.CharField(
        max_length=20,
        choices=Type.choices
    )

    titre = models.CharField(
        max_length=255
    )

    message = models.TextField()

    ticket = models.ForeignKey(
        'tickets.Ticket',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications'
    )

    annonce = models.ForeignKey(
        'announcements.Announcement',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications'
    )

    lue = models.BooleanField(
        default=False
    )

    date_creation = models.DateTimeField(
        auto_now_add=True
    )

    date_lecture = models.DateTimeField(
        null=True,
        blank=True
    )

    class Meta:
        ordering = ['-date_creation']

    def __str__(self):
        return f'{self.titre} - {self.destinataire.username}'
