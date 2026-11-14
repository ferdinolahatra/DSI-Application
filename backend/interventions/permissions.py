
import unicodedata

from rest_framework.permissions import BasePermission, SAFE_METHODS


# =========================================================
# NORMALISATION DE LA FONCTION
# =========================================================

def normaliser_fonction(valeur):
    """
    Normalise la fonction :
    - minuscules ;
    - suppression des accents ;
    - suppression des espaces inutiles.
    """

    valeur = str(valeur or "").strip().lower()
    valeur = unicodedata.normalize("NFKD", valeur)

    return "".join(
        caractere
        for caractere in valeur
        if not unicodedata.combining(caractere)
    )


# =========================================================
# IDENTIFICATION DES UTILISATEURS
# =========================================================

def compte_actif(user):
    return bool(
        user
        and user.is_authenticated
        and getattr(user, "is_active", False)
        and getattr(user, "compte_actif", False)
    )


def est_admin(user):
    """
    Administrateur identifié par les permissions Django.
    Aucun contrôle du champ role.
    """

    return (
        compte_actif(user)
        and (
            user.is_superuser
            or user.is_staff
        )
    )


def est_technicien(user):
    """
    Technicien identifié uniquement par sa fonction.
    """

    return (
        compte_actif(user)
        and normaliser_fonction(
            getattr(user, "fonction", "")
        ) == "technicien dsi"
    )


def est_autre_utilisateur(user):
    """
    Tous les utilisateurs actifs qui ne sont
    ni administrateurs ni techniciens DSI.
    """

    return (
        compte_actif(user)
        and not est_admin(user)
        and not est_technicien(user)
    )


# =========================================================
# PERMISSIONS DES INTERVENTIONS
# =========================================================

class InterventionPermission(BasePermission):

    message = (
        "Vous n'avez pas les droits nécessaires "
        "pour effectuer cette opération."
    )

    def has_permission(self, request, view):

        user = request.user

        if not compte_actif(user):
            return False

        action = getattr(view, "action", None)

        # -------------------------------------------------
        # ADMINISTRATEUR
        # -------------------------------------------------

        if est_admin(user):
            return action in (
                "list",
                "retrieve",
                "create",
                "update",
                "partial_update",
                "metadata",
            )

        # -------------------------------------------------
        # TECHNICIEN DSI
        # -------------------------------------------------

        if est_technicien(user):
            return action in (
                "list",
                "retrieve",
                "create",
                "update",
                "partial_update",
                "metadata",
            )

        # -------------------------------------------------
        # AUTRES UTILISATEURS
        # Consultation uniquement.
        # -------------------------------------------------

        if est_autre_utilisateur(user):
            return (
                request.method in SAFE_METHODS
                and action in (
                    "list",
                    "retrieve",
                    "metadata",
                )
            )

        return False

    def has_object_permission(self, request, view, obj):

        user = request.user

        if not compte_actif(user):
            return False

        # -------------------------------------------------
        # ADMINISTRATEUR
        # Accès complet à toutes les interventions.
        # -------------------------------------------------

        if est_admin(user):
            return True

        # -------------------------------------------------
        # TECHNICIEN DSI
        # Ses propres interventions sur ses tickets.
        # -------------------------------------------------

        if est_technicien(user):
            return (
                obj.technicien_id == user.id
                and obj.ticket.technicien_id == user.id
            )

        # -------------------------------------------------
        # AUTRES UTILISATEURS
        # Consultation des interventions de leurs tickets.
        # Aucun ajout ni aucune modification.
        # -------------------------------------------------

        if est_autre_utilisateur(user):
            return (
                request.method in SAFE_METHODS
                and obj.ticket.demandeur_id == user.id
            )

        return False
