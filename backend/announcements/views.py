from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import User
from activity_logs.models import ActivityLog
from notifications.models import Notification

from .models import Announcement
from .permissions import AnnouncementPermission
from .serializers import AnnouncementSerializer


class AnnouncementViewSet(viewsets.ModelViewSet):
    """
    API de gestion des annonces et alertes de la DSI.

    Administrateur :
        Crée, modifie, publie, dépublie et supprime les annonces.

    Technicien et agent :
        Consultent les annonces publiées et actuellement accessibles.
    """

    serializer_class = AnnouncementSerializer

    permission_classes = [
        IsAuthenticated,
        AnnouncementPermission,
    ]

    queryset = Announcement.objects.all()

    filter_backends = [
        SearchFilter,
        OrderingFilter,
    ]

    search_fields = [
        'titre',
        'contenu',
        'type',
        'auteur__username',
    ]

    ordering_fields = [
        'titre',
        'type',
        'date_publication',
        'date_creation',
        'date_debut',
        'date_fin',
    ]

    ordering = ['-date_creation']

    http_method_names = [
        'get',
        'post',
        'put',
        'patch',
        'delete',
        'head',
        'options',
    ]

    def get_queryset(self):
        user = self.request.user

        queryset = Announcement.objects.select_related('auteur')

        # L'administrateur consulte toutes les annonces,
        # qu'elles soient publiées ou non.
        if (
            user.is_superuser
            or user.role == User.Role.ADMIN
        ):
            pass

        elif user.role in (
            User.Role.TECHNICIEN,
            User.Role.AGENT,
        ):
            # Les autres utilisateurs ne voient que les annonces
            # publiées dont la période de diffusion est active.
            maintenant = timezone.now()

            queryset = queryset.filter(
                publie=True,
            ).filter(
                Q(date_debut__isnull=True)
                | Q(date_debut__lte=maintenant)
            ).filter(
                Q(date_fin__isnull=True)
                | Q(date_fin__gte=maintenant)
            )

        else:
            return Announcement.objects.none()

        # Filtre facultatif par type d'annonce.
        type_annonce = self.request.query_params.get('type')

        if type_annonce:
            queryset = queryset.filter(type=type_annonce)

        # Filtre facultatif sur la publication.
        publie = self.request.query_params.get('publie')

        if publie is not None:
            if publie.lower() not in ('true', 'false'):
                from rest_framework.exceptions import ValidationError

                raise ValidationError({
                    'publie': 'Les valeurs autorisées sont true et false.'
                })

            queryset = queryset.filter(
                publie=(publie.lower() == 'true')
            )

        return queryset

    def perform_create(self, serializer):
        with transaction.atomic():
            annonce = serializer.save(
                auteur=self.request.user,
                publie=False,
                date_publication=None,
            )

            ActivityLog.objects.create(
                utilisateur=self.request.user,
                action=ActivityLog.Action.CREATION,
                description=(
                    f'Création de l’annonce « {annonce.titre} ».'
                ),
                adresse_ip=self.request.META.get('REMOTE_ADDR'),
            )

    def perform_update(self, serializer):
        with transaction.atomic():
            annonce = serializer.save()

            ActivityLog.objects.create(
                utilisateur=self.request.user,
                action=ActivityLog.Action.MODIFICATION,
                description=(
                    f'Modification de l’annonce « {annonce.titre} ».'
                ),
                adresse_ip=self.request.META.get('REMOTE_ADDR'),
            )

    def perform_destroy(self, instance):
        titre = instance.titre

        with transaction.atomic():
            ActivityLog.objects.create(
                utilisateur=self.request.user,
                action=ActivityLog.Action.SUPPRESSION,
                description=f'Suppression de l’annonce « {titre} ».',
                adresse_ip=self.request.META.get('REMOTE_ADDR'),
            )

            instance.delete()

    # --------------------------------------------------------
    # PUBLIER UNE ANNONCE
    # POST /api/annonces/<id>/publier/
    # --------------------------------------------------------

    @action(
        detail=True,
        methods=['post'],
        url_path='publier',
    )
    def publier(self, request, pk=None):
        annonce = self.get_object()

        # Ne pas envoyer une deuxième série de notifications
        # si l'annonce est déjà publiée.
        if annonce.publie:
            return Response(
                self.get_serializer(annonce).data,
                status=status.HTTP_200_OK,
            )

        maintenant = timezone.now()

        type_notification = (
            Notification.Type.ALERTE
            if annonce.type in (
                Announcement.Type.ALERTE,
                Announcement.Type.INTERRUPTION,
            )
            else Notification.Type.ANNONCE
        )

        with transaction.atomic():
            annonce.publie = True
            annonce.date_publication = maintenant

            annonce.save(
                update_fields=[
                    'publie',
                    'date_publication',
                    'date_modification',
                ]
            )

            # Notifier tous les comptes actifs, sauf l'auteur
            # qui vient de publier l'annonce.
            destinataires = User.objects.filter(
                is_active=True,
                compte_actif=True,
            ).exclude(
                pk=request.user.pk,
            )

            Notification.objects.bulk_create([
                Notification(
                    destinataire=destinataire,
                    type=type_notification,
                    titre=annonce.titre,
                    message=annonce.contenu,
                    annonce=annonce,
                )
                for destinataire in destinataires
            ])

            ActivityLog.objects.create(
                utilisateur=request.user,
                action=ActivityLog.Action.AUTRE,
                description=(
                    f'Publication de l’annonce « {annonce.titre} ».'
                ),
                adresse_ip=request.META.get('REMOTE_ADDR'),
            )

        return Response(
            self.get_serializer(annonce).data,
            status=status.HTTP_200_OK,
        )

    # --------------------------------------------------------
    # DÉPUBLIER UNE ANNONCE
    # POST /api/annonces/<id>/depublier/
    # --------------------------------------------------------

    @action(
        detail=True,
        methods=['post'],
        url_path='depublier',
    )
    def depublier(self, request, pk=None):
        annonce = self.get_object()

        with transaction.atomic():
            annonce.publie = False
            annonce.date_publication = None

            annonce.save(
                update_fields=[
                    'publie',
                    'date_publication',
                    'date_modification',
                ]
            )

            ActivityLog.objects.create(
                utilisateur=request.user,
                action=ActivityLog.Action.MODIFICATION,
                description=(
                    f'Dépublication de l’annonce « {annonce.titre} ».'
                ),
                adresse_ip=request.META.get('REMOTE_ADDR'),
            )

        return Response(
            self.get_serializer(annonce).data,
            status=status.HTTP_200_OK,
        )