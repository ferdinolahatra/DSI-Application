from pathlib import Path

from django.db import transaction
from django.http import FileResponse

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from activity_logs.models import ActivityLog

from .models import Document
from .permissions import DocumentPermission
from .serializers import DocumentSerializer


class DocumentViewSet(viewsets.ModelViewSet):
    """
    API de gestion documentaire de la DSI.

    Administrateur :
        Dépose, consulte, modifie et supprime les documents.

    Technicien et agent :
        Consultent et téléchargent les documents publiés.
    """

    serializer_class = DocumentSerializer

    permission_classes = [
        IsAuthenticated,
        DocumentPermission,
    ]

    parser_classes = [
        MultiPartParser,
        FormParser,
    ]

    queryset = Document.objects.all()

    filter_backends = [
        SearchFilter,
        OrderingFilter,
    ]

    search_fields = [
        'titre',
        'description',
        'categorie',
        'auteur__username',
    ]

    ordering_fields = [
        'titre',
        'categorie',
        'date_creation',
        'date_modification',
    ]

    ordering = ['-date_creation']

    def get_queryset(self):
        user = self.request.user

        queryset = Document.objects.select_related('auteur')

        # L'administrateur voit tous les documents,
        # y compris ceux qui ne sont pas encore publiés.
        if user.is_superuser or user.role == 'ADMIN':
            pass
        elif user.role in ('TECHNICIEN', 'AGENT'):
            queryset = queryset.filter(publie=True)
        else:
            return Document.objects.none()

        # Filtre facultatif sur la catégorie.
        categorie = self.request.query_params.get('categorie')

        if categorie:
            queryset = queryset.filter(categorie=categorie)

        return queryset

    def perform_create(self, serializer):
        with transaction.atomic():
            document = serializer.save(
                auteur=self.request.user,
            )

            ActivityLog.objects.create(
                utilisateur=self.request.user,
                action=ActivityLog.Action.CREATION,
                description=(
                    f'Création du document « {document.titre} ».'
                ),
                adresse_ip=self.request.META.get('REMOTE_ADDR'),
            )

    def perform_update(self, serializer):
        document = serializer.save()

        ActivityLog.objects.create(
            utilisateur=self.request.user,
            action=ActivityLog.Action.MODIFICATION,
            description=(
                f'Modification du document « {document.titre} ».'
            ),
            adresse_ip=self.request.META.get('REMOTE_ADDR'),
        )

    def perform_destroy(self, instance):
        titre = instance.titre
        fichier = instance.fichier

        ActivityLog.objects.create(
            utilisateur=self.request.user,
            action=ActivityLog.Action.SUPPRESSION,
            description=f'Suppression du document « {titre} ». ',
            adresse_ip=self.request.META.get('REMOTE_ADDR'),
        )

        instance.delete()

        # Supprimer aussi le fichier physique associé.
        if fichier:
            fichier.delete(save=False)

    @action(
        detail=True,
        methods=['get'],
        url_path='telecharger',
    )
    def telecharger(self, request, pk=None):
        document = self.get_object()

        if not document.fichier:
            raise NotFound(
                'Aucun fichier n’est associé à ce document.'
            )

        try:
            fichier_ouvert = document.fichier.open('rb')
        except (FileNotFoundError, ValueError, OSError):
            raise NotFound(
                'Le fichier demandé est introuvable sur le serveur.'
            )

        ActivityLog.objects.create(
            utilisateur=request.user,
            action=ActivityLog.Action.TELECHARGEMENT,
            description=(
                f'Téléchargement du document « {document.titre} ».'
            ),
            adresse_ip=request.META.get('REMOTE_ADDR'),
        )

        nom_fichier = Path(document.fichier.name).name

        return FileResponse(
            fichier_ouvert,
            as_attachment=True,
            filename=nom_fichier,
        )