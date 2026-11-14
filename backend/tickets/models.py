
from django.conf import settings
from django.db import models


class Ticket(models.Model):

    class Category(models.TextChoices):
        MATERIEL = 'MATERIEL', 'Matériel'
        TELEPHONE = 'TELEPHONE', 'Téléphone'
        LOGICIEL = 'LOGICIEL', 'Logiciel'
        RESEAU = 'RESEAU', 'Réseau'
        ACCES = 'ACCES', 'Accès système'
        AUTRE = 'AUTRE', 'Autre'

    class Priority(models.TextChoices):
        FAIBLE = 'FAIBLE', 'Faible'
        MOYENNE = 'MOYENNE', 'Moyenne'
        URGENTE = 'URGENTE', 'Urgente'
        TRES_URGENTE = 'TRES_URGENTE', 'Très urgente'

    class Status(models.TextChoices):
        NOUVELLE = 'NOUVELLE', 'Nouvelle'
        EN_ATTENTE = 'EN_ATTENTE', 'En attente'
        EN_COURS = 'EN_COURS', 'En cours'
        RESOLUE = 'RESOLUE', 'Résolue'
        CLOTUREE = 'CLOTUREE', 'Clôturée'

    numero = models.CharField(
        max_length=30,
        unique=True,
        editable=False
    )

    date_creation = models.DateTimeField(auto_now_add=True)

    demandeur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='tickets_crees'
    )

    service = models.CharField(max_length=150)

    categorie = models.CharField(
        max_length=20,
        choices=Category.choices
    )

    priorite = models.CharField(
        max_length=20,
        choices=Priority.choices,
        default=Priority.MOYENNE
    )

    objet = models.CharField(max_length=255)

    description = models.TextField()

    technicien = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tickets_assignes'
    )

    date_prise_en_charge = models.DateTimeField(
        null=True,
        blank=True
    )

    statut = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.NOUVELLE
    )

    date_resolution = models.DateTimeField(
        null=True,
        blank=True
    )

    date_modification = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):

        if not self.numero:
            dernier_ticket = Ticket.objects.order_by('-id').first()

            prochain_numero = (
                dernier_ticket.id + 1
                if dernier_ticket else 1
            )

            self.numero = f'DSI-{prochain_numero:05d}'

        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.numero} - {self.objet}'


# =========================================================
# COMMENTAIRES ET RÉPONSES DES TICKETS
# =========================================================

class TicketComment(models.Model):

    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name='commentaires'
    )

    auteur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='commentaires_tickets'
    )

    contenu = models.TextField()

    # Permet de répondre à un commentaire existant.
    # Si le commentaire d'origine est supprimé,
    # la réponse reste enregistrée.
    reponse_a = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reponses'
    )

    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['date_creation']

    def __str__(self):
        return (
            f'Commentaire de {self.auteur.username} '
            f'- {self.ticket.numero}'
        )


# =========================================================
# HISTORIQUE DES TICKETS
# =========================================================

class TicketHistory(models.Model):

    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name='historique'
    )

    utilisateur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='historique_tickets'
    )

    action = models.CharField(max_length=100)

    ancienne_valeur = models.TextField(blank=True)

    nouvelle_valeur = models.TextField(blank=True)

    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date_creation']

    def __str__(self):
        return f'{self.ticket.numero} - {self.action}'
