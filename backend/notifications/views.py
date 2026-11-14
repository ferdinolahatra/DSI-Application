from django.utils import timezone

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API de consultation des notifications.

    Un utilisateur ne peut consulter que ses notifications.
    Il peut marquer une notification ou toutes ses notifications
    comme lues.
    """

    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    queryset = Notification.objects.none()

    def get_queryset(self):
        queryset = Notification.objects.filter(
            destinataire=self.request.user,
        ).select_related(
            'ticket',
            'annonce',
        ).order_by(
            '-date_creation',
        )

        # Filtre facultatif : ?lue=true ou ?lue=false
        valeur_lue = self.request.query_params.get('lue')

        if valeur_lue is not None:
            valeur_lue = valeur_lue.lower()

            if valeur_lue not in ('true', 'false'):
                raise ValidationError({
                    'lue': 'Les valeurs autorisées sont true et false.'
                })

            queryset = queryset.filter(
                lue=(valeur_lue == 'true'),
            )

        return queryset

    # --------------------------------------------------------
    # MARQUER UNE NOTIFICATION COMME LUE
    # POST /api/notifications/<id>/marquer-lue/
    # --------------------------------------------------------

    @action(
        detail=True,
        methods=['post'],
        url_path='marquer-lue',
    )
    def marquer_lue(self, request, pk=None):
        notification = self.get_object()

        if not notification.lue:
            notification.lue = True
            notification.date_lecture = timezone.now()

            notification.save(
                update_fields=[
                    'lue',
                    'date_lecture',
                ]
            )

        serializer = self.get_serializer(notification)

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

    # --------------------------------------------------------
    # MARQUER TOUTES LES NOTIFICATIONS COMME LUES
    # POST /api/notifications/marquer-toutes-lues/
    # --------------------------------------------------------

    @action(
        detail=False,
        methods=['post'],
        url_path='marquer-toutes-lues',
    )
    def marquer_toutes_lues(self, request):
        maintenant = timezone.now()

        nombre = self.get_queryset().filter(
            lue=False,
        ).update(
            lue=True,
            date_lecture=maintenant,
        )

        return Response(
            {
                'message': 'Notifications marquées comme lues.',
                'nombre_mis_a_jour': nombre,
            },
            status=status.HTTP_200_OK,
        )