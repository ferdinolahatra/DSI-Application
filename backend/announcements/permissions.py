from rest_framework.permissions import BasePermission

from accounts.models import User


class AnnouncementPermission(BasePermission):
    """
    Permissions du module Annonces et alertes.
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

        action = getattr(view, 'action', None)

        # Tous les utilisateurs connectés peuvent consulter
        # les annonces auxquelles ils ont accès.
        if action in ('list', 'retrieve'):
            return True

        # Seul l'administrateur peut gérer les annonces.
        if action in (
            'create',
            'update',
            'partial_update',
            'destroy',
            'publier',
            'depublier',
        ):
            return self.est_admin(user)

        return False

    def has_object_permission(self, request, view, obj):
        user = request.user

        if self.est_admin(user):
            return True

        # Les utilisateurs non administrateurs ne peuvent
        # consulter que les annonces publiées.
        return (
            request.method in ('GET', 'HEAD', 'OPTIONS')
            and obj.publie
        )