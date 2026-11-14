from rest_framework.permissions import BasePermission

from .models import User


def compte_autorise(user):
    """Vérifie que l'utilisateur est connecté et actif."""
    return bool(
        user
        and user.is_authenticated
        and user.is_active
        and user.compte_actif
    )


class IsDsiAdmin(BasePermission):
    """Réservé à l'administrateur DSI."""

    message = "Accès réservé à l'administrateur DSI."

    def has_permission(self, request, view):
        user = request.user

        return (
            compte_autorise(user)
            and (
                user.is_superuser
                or user.role == User.Role.ADMIN
            )
        )


class IsDsiTechnicien(BasePermission):
    """Réservé aux techniciens DSI."""

    message = "Accès réservé aux techniciens DSI."

    def has_permission(self, request, view):
        user = request.user

        return (
            compte_autorise(user)
            and user.role == User.Role.TECHNICIEN
        )


class IsDsiAgent(BasePermission):
    """Réservé aux agents du ministère."""

    message = "Accès réservé aux agents du ministère."

    def has_permission(self, request, view):
        user = request.user

        return (
            compte_autorise(user)
            and user.role == User.Role.AGENT
        )


class IsDsiAdminOrTechnicien(BasePermission):
    """Autorise l'administrateur et les techniciens."""

    message = "Accès réservé à l'administrateur ou aux techniciens."

    def has_permission(self, request, view):
        user = request.user

        return (
            compte_autorise(user)
            and (
                user.is_superuser
                or user.role in [
                    User.Role.ADMIN,
                    User.Role.TECHNICIEN,
                ]
            )
        )