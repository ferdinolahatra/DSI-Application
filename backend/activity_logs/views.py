
from rest_framework import viewsets
from rest_framework.permissions import BasePermission

from .models import ActivityLog
from .serializers import ActivityLogSerializer


class IsDSIAdmin(BasePermission):
    """
    Accès au journal réservé aux administrateurs DSI.
    """

    message = "Accès réservé à l'Administrateur DSI."

    def has_permission(self, request, view):

        user = request.user

        if not user or not user.is_authenticated:
            return False

        role = str(
            getattr(user, "role", "")
        ).strip().upper()

        return (
            user.is_superuser
            or role in ("ADMIN", "ADMINISTRATEUR")
        )


class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Consultation du journal d'activité.

    Administrateur :
    - consulter toutes les activités ;
    - consulter les détails d'une activité.

    Aucun ajout, modification ou suppression via cette API.
    """

    serializer_class = ActivityLogSerializer
    permission_classes = [IsDSIAdmin]

    queryset = (
        ActivityLog.objects
        .select_related("utilisateur")
        .all()
        .order_by("-date_creation")
    )
