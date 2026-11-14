from rest_framework.permissions import BasePermission

from accounts.models import User


class DocumentPermission(BasePermission):
    """
    Permissions d'accès aux documents de la DSI.
    """

    message = "Vous n'avez pas les droits nécessaires."

    def compte_actif(self, user):
        return bool(
            user
            and user.is_authenticated
            and user.is_active
            and user.compte_actif
        )

    def est_admin(self, user):
        return (
            self.compte_actif(user)
            and (
                user.is_superuser
                or user.role == User.Role.ADMIN
            )
        )

    def has_permission(self, request, view):
        user = request.user

        if not self.compte_actif(user):
            return False

        if user.role not in (
            User.Role.ADMIN,
            User.Role.TECHNICIEN,
            User.Role.AGENT,
        ) and not user.is_superuser:
            return False

        action = getattr(view, 'action', None)

        # Consultation autorisée aux trois profils.
        if action in (
            'list',
            'retrieve',
            'telecharger',
        ):
            return True

        # Modification réservée à l'administrateur.
        if action in (
            'create',
            'update',
            'partial_update',
            'destroy',
        ):
            return self.est_admin(user)

        return False

    def has_object_permission(self, request, view, obj):
        user = request.user

        if self.est_admin(user):
            return True

        # Les autres profils consultent uniquement les documents publiés.
        if user.role in (
            User.Role.TECHNICIEN,
            User.Role.AGENT,
        ):
            return (
                request.method in ('GET', 'HEAD', 'OPTIONS')
                and obj.publie
            )

        return False