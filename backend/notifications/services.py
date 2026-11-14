
import unicodedata

from django.contrib.auth import get_user_model

from .models import Notification


User = get_user_model()


# ============================================================
# NORMALISATION DE LA FONCTION
# ============================================================

def normaliser_fonction(valeur):

    valeur = str(valeur or '').strip().lower()

    valeur = unicodedata.normalize(
        'NFKD',
        valeur
    )

    return ''.join(
        caractere
        for caractere in valeur
        if not unicodedata.combining(caractere)
    )


# ============================================================
# VÉRIFICATION DES COMPTES
# ============================================================

def compte_actif(user):

    return bool(
        user
        and user.is_authenticated
        and getattr(user, 'is_active', False)
        and getattr(user, 'compte_actif', False)
    )


def est_administrateur(user):

    return bool(
        compte_actif(user)
        and (
            user.is_superuser
            or user.is_staff
        )
    )


def est_technicien_dsi(user):

    return bool(
        compte_actif(user)
        and normaliser_fonction(
            getattr(user, 'fonction', '')
        ) == 'technicien dsi'
    )


# ============================================================
# CRÉATION CENTRALISÉE DES NOTIFICATIONS
# ============================================================

def creer_notifications(
    destinataires,
    type_notification,
    titre,
    message,
    ticket=None,
    acteur=None,
):

    utilisateurs_deja_traites = set()

    notifications_creees = []

    for destinataire in destinataires:

        if destinataire is None:
            continue

        if destinataire.pk in utilisateurs_deja_traites:
            continue

        utilisateurs_deja_traites.add(
            destinataire.pk
        )

        if not compte_actif(destinataire):
            continue

        # Ne pas notifier la personne qui réalise l'action.
        if acteur and destinataire.pk == acteur.pk:
            continue

        notification = Notification.objects.create(
            destinataire=destinataire,
            type=type_notification,
            titre=titre,
            message=message,
            ticket=ticket,
        )

        notifications_creees.append(
            notification
        )

    return notifications_creees


# ============================================================
# RÉCUPÉRER LES ADMINISTRATEURS ET TECHNICIENS
# ============================================================

def obtenir_administrateurs_et_techniciens():

    utilisateurs = User.objects.filter(
        is_active=True,
        compte_actif=True,
    )

    destinataires = []

    for utilisateur in utilisateurs:

        if (
            utilisateur.is_superuser
            or utilisateur.is_staff
            or normaliser_fonction(
                getattr(utilisateur, 'fonction', '')
            ) == 'technicien dsi'
        ):

            destinataires.append(
                utilisateur
            )

    return destinataires


# ============================================================
# NOTIFICATION : CRÉATION D'UN TICKET
# ============================================================

def notifier_creation_ticket(ticket, acteur=None):

    destinataires = obtenir_administrateurs_et_techniciens()

    return creer_notifications(
        destinataires=destinataires,
        type_notification=Notification.Type.TICKET,
        titre='Nouveau ticket DSI',
        message=(
            f'Un nouveau ticket {ticket.numero} a été créé : '
            f'{ticket.objet}.'
        ),
        ticket=ticket,
        acteur=acteur,
    )


# ============================================================
# NOTIFICATION : AFFECTATION D'UN TICKET
# ============================================================

def notifier_affectation_ticket(ticket, acteur=None):

    destinataires = [
        ticket.demandeur,
        ticket.technicien,
    ]

    return creer_notifications(
        destinataires=destinataires,
        type_notification=Notification.Type.AFFECTATION,
        titre='Affectation d’un ticket',
        message=(
            f'Le ticket {ticket.numero} - {ticket.objet} '
            f'a été affecté au technicien '
            f'{ticket.technicien.username if ticket.technicien else "non défini"}.'
        ),
        ticket=ticket,
        acteur=acteur,
    )


# ============================================================
# NOTIFICATION : CHANGEMENT DE STATUT
# ============================================================

def notifier_changement_statut(
    ticket,
    acteur=None,
    ancien_statut=None,
    nouveau_statut=None,
):

    destinataires = [
        ticket.demandeur,
        ticket.technicien,
    ]

    if nouveau_statut == 'RESOLUE':

        type_notification = Notification.Type.RESOLUTION

        titre = 'Ticket résolu'

        message = (
            f'Le ticket {ticket.numero} - {ticket.objet} '
            f'a été marqué comme résolu.'
        )

    else:

        type_notification = Notification.Type.STATUT

        titre = 'Changement de statut du ticket'

        message = (
            f'Le statut du ticket {ticket.numero} - '
            f'{ticket.objet} est passé de '
            f'{ancien_statut} à {nouveau_statut}.'
        )

    return creer_notifications(
        destinataires=destinataires,
        type_notification=type_notification,
        titre=titre,
        message=message,
        ticket=ticket,
        acteur=acteur,
    )


# ============================================================
# NOTIFICATION : AJOUT D'UN COMMENTAIRE
# ============================================================

def notifier_commentaire_ticket(ticket, commentaire):

    auteur = commentaire.auteur

    destinataires = [
        ticket.demandeur,
        ticket.technicien,
    ]

    return creer_notifications(
        destinataires=destinataires,
        type_notification=Notification.Type.COMMENTAIRE,
        titre='Nouveau commentaire sur un ticket',
        message=(
            f'{auteur.username} a ajouté un commentaire '
            f'au ticket {ticket.numero} - {ticket.objet}.'
        ),
        ticket=ticket,
        acteur=auteur,
    )


# ============================================================
# NOTIFICATION : ENREGISTREMENT D'UNE INTERVENTION
# ============================================================

def notifier_intervention(intervention, acteur=None):

    ticket = intervention.ticket

    destinataires = [
        ticket.demandeur,
        ticket.technicien,
    ]

    # Les administrateurs sont également informés.
    administrateurs = User.objects.filter(
        is_active=True,
        compte_actif=True,
    ).filter(
        is_superuser=True
    ) | User.objects.filter(
        is_active=True,
        compte_actif=True,
        is_staff=True,
    )

    destinataires.extend(
        administrateurs
    )

    technicien = (
        intervention.technicien.username
        if intervention.technicien
        else 'Technicien DSI'
    )

    resultat = getattr(
        intervention,
        'resultat',
        ''
    )

    diagnostic = getattr(
        intervention,
        'diagnostic',
        ''
    )

    solution = getattr(
        intervention,
        'solution',
        ''
    )

    message = (
        f'Une intervention a été enregistrée sur le ticket '
        f'{ticket.numero} - {ticket.objet}. '
        f'Technicien : {technicien}. '
        f'Résultat : {resultat or "Non renseigné"}.'
    )

    if diagnostic:
        message += f' Diagnostic : {diagnostic}.'

    if solution:
        message += f' Solution : {solution}.'

    return creer_notifications(
        destinataires=destinataires,
        type_notification=Notification.Type.INTERVENTION,
        titre='Nouvelle intervention technique',
        message=message,
        ticket=ticket,
        acteur=acteur,
    )

    # =========================================================
# NOTIFICATION D'UNE INTERVENTION
# =========================================================

def notifier_intervention(intervention, acteur=None):
    """
    Notifie le demandeur, le technicien concerné
    et les administrateurs lorsqu'une intervention est créée.
    """

    ticket = intervention.ticket

    destinataires = [
        ticket.demandeur,
        ticket.technicien,
    ]

    # Ajouter les administrateurs actifs
    destinataires.extend(
        obtenir_administrateurs_et_techniciens()
    )

    technicien = (
        intervention.technicien.get_full_name().strip()
        or intervention.technicien.username
    ) if intervention.technicien else "Technicien non renseigné"

    resultat = getattr(intervention, "resultat", "")
    diagnostic = getattr(intervention, "diagnostic", "")
    solution = getattr(intervention, "solution", "")

    message = (
        f"Une intervention a été enregistrée sur le ticket "
        f"{ticket.numero}.\n"
        f"Technicien : {technicien}.\n"
        f"Résultat : {resultat}.\n"
        f"Diagnostic : {diagnostic}.\n"
        f"Solution : {solution}."
    )

    _creer_notifications(
        destinataires=destinataires,
        acteur=acteur,
        type_notification=Notification.Type.INTERVENTION,
        titre=f"Nouvelle intervention : {ticket.numero}",
        message=message,
        ticket=ticket,
    )
