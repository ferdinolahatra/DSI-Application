from django.conf import settings
from django.db import models


class ActivityLog(models.Model):

    class Action(models.TextChoices):
        CONNEXION = 'CONNEXION', 'Connexion'
        DECONNEXION = 'DECONNEXION', 'Déconnexion'
        CREATION = 'CREATION', 'Création'
        MODIFICATION = 'MODIFICATION', 'Modification'
        SUPPRESSION = 'SUPPRESSION', 'Suppression'
        AFFECTATION = 'AFFECTATION', 'Affectation'
        CHANGEMENT_STATUT = 'CHANGEMENT_STATUT', 'Changement de statut'
        CONSULTATION = 'CONSULTATION', 'Consultation'
        TELECHARGEMENT = 'TELECHARGEMENT', 'Téléchargement'
        AUTRE = 'AUTRE', 'Autre'

    utilisateur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='activites'
    )

    action = models.CharField(
        max_length=30,
        choices=Action.choices
    )

    description = models.TextField()

    adresse_ip = models.GenericIPAddressField(
        null=True,
        blank=True
    )

    date_creation = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        ordering = ['-date_creation']

    def __str__(self):
        utilisateur = (
            self.utilisateur.username
            if self.utilisateur
            else 'Utilisateur supprimé'
        )

        return f'{utilisateur} - {self.get_action_display()}'