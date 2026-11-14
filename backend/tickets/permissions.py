
import unicodedata

from rest_framework.permissions import BasePermission


# =========================================================
# NORMALISATION DE LA FONCTION
# =========================================================

def normaliser_fonction(valeur):
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
    return (
        compte_actif(user)
        and (
            user.is_superuser
            or user.is_staff
        )
    )


def est_technicien(user):
    return (
        compte_actif(user)
        and normaliser_fonction(
            getattr(user, "fonction", "")
        ) == "technicien dsi"
    )


def est_autre_utilisateur(user):
    return (
        compte_actif(user)
        and not est_admin(user)
        and not est_technicien(user)
    )


# =========================================================
# PERMISSIONS DES TICKETS
# =========================================================

class TicketAccessPermission(BasePermission):

    message = (
        "Vous n'avez pas les droits nécessaires "
        "pour cette opération."
    )

    def has_permission(self, request, view):

        user = request.user

        if not compte_actif(user):
            return False

        action = getattr(view, "action", None)

        # ADMINISTRATEUR
        if est_admin(user):
            return action in (
                "list",
                "retrieve",
                "create",
                "update",
                "partial_update",
                "affecter",
                "prendre_en_charge",
                "changer_statut",
                "commentaires",
                "historique",
                "metadata",
            )

        # TECHNICIEN DSI
        if est_technicien(user):
            return action in (
                "list",
                "retrieve",
                "create",
                "affecter",
                "prendre_en_charge",
                "changer_statut",
                "commentaires",
                "historique",
                "metadata",
            )

        # AUTRES UTILISATEURS
        if est_autre_utilisateur(user):
            return action in (
                "list",
                "retrieve",
                "create",
                "commentaires",
                "historique",
                "metadata",
            )

        return False

    def has_object_permission(self, request, view, obj):

        user = request.user
        action = getattr(view, "action", None)

        if not compte_actif(user):
            return False

        # ADMINISTRATEUR : accès complet.
        if est_admin(user):
            return True

        # TECHNICIEN DSI.
        if est_technicien(user):

            if action in (
                "retrieve",
                "affecter",
                "prendre_en_charge",
            ):
                return (
                    obj.technicien_id is None
                    or obj.technicien_id == user.id
                )

            if action in (
                "changer_statut",
                "commentaires",
                "historique",
            ):
                return obj.technicien_id == user.id

            return False

        # AUTRES UTILISATEURS :
        # accès uniquement à leurs propres tickets.
        if est_autre_utilisateur(user):

            if action in (
                "retrieve",
                "commentaires",
                "historique",
            ):
                return obj.demandeur_id == user.id

            return False

        return False
