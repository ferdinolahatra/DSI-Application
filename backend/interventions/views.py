
from django.db import transaction

from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.permissions import IsAuthenticated

from activity_logs.models import ActivityLog
from tickets.models import TicketHistory
from notifications.services import notifier_intervention

from .models import Intervention
from .permissions import (
    InterventionPermission,
    compte_actif,
    est_admin,
    est_technicien,
)
from .serializers import InterventionSerializer


class InterventionViewSet(viewsets.ModelViewSet):
    """
    API de gestion des interventions techniques.

    Administrateur :
        Consulte et gère toutes les interventions.

    Technicien DSI :
        Consulte et gère ses propres interventions
        sur les tickets qui lui sont affectés.

    Autres utilisateurs :
        Consultent les interventions de leurs propres tickets.
    """

    serializer_class = InterventionSerializer

    permission_classes = [
        IsAuthenticated,
        InterventionPermission,
    ]

    queryset = Intervention.objects.all()

    filter_backends = [
        SearchFilter,
        OrderingFilter,
    ]

    search_fields = [
        "ticket__numero",
        "ticket__objet",
        "technicien__username",
        "description",
        "diagnostic",
        "solution",
    ]

    ordering_fields = [
        "date_intervention",
        "duree",
        "resultat",
        "date_creation",
    ]

    ordering = ["-date_intervention"]

    http_method_names = [
        "get",
        "post",
        "put",
        "patch",
        "head",
        "options",
    ]

    # =====================================================
    # CONSULTATION DES INTERVENTIONS
    # =====================================================

    def get_queryset(self):

        user = self.request.user

        if not compte_actif(user):
            return Intervention.objects.none()

        queryset = Intervention.objects.select_related(
            "ticket",
            "ticket__demandeur",
            "ticket__technicien",
            "technicien",
        )

        if est_admin(user):
            pass

        elif est_technicien(user):

            queryset = queryset.filter(
                technicien=user,
                ticket__technicien=user,
            )

        else:

            queryset = queryset.filter(
                ticket__demandeur=user,
            )

        ticket_id = self.request.query_params.get("ticket")

        if ticket_id:

            try:
                ticket_id = int(ticket_id)

            except (TypeError, ValueError):
                raise ValidationError({
                    "ticket": (
                        "Fournissez un identifiant "
                        "de ticket valide."
                    )
                })

            queryset = queryset.filter(
                ticket_id=ticket_id
            )

        resultat = self.request.query_params.get("resultat")

        if resultat:
            queryset = queryset.filter(
                resultat=resultat
            )

        technicien_id = self.request.query_params.get(
            "technicien"
        )

        if technicien_id:

            try:
                technicien_id = int(technicien_id)

            except (TypeError, ValueError):
                raise ValidationError({
                    "technicien": (
                        "Fournissez un identifiant "
                        "de technicien valide."
                    )
                })

            queryset = queryset.filter(
                technicien_id=technicien_id
            )

        return queryset

    # =====================================================
    # CRÉATION D'UNE INTERVENTION
    # =====================================================

    def perform_create(self, serializer):

        with transaction.atomic():

            intervention = serializer.save()

            TicketHistory.objects.create(
                ticket=intervention.ticket,
                utilisateur=self.request.user,
                action="INTERVENTION",
                ancienne_valeur="",
                nouvelle_valeur=(
                    f"Intervention enregistrée : "
                    f"ID {intervention.id}, "
                    f"résultat "
                    f"{intervention.get_resultat_display()}"
                ),
            )

            ActivityLog.objects.create(
                utilisateur=self.request.user,
                action=ActivityLog.Action.CREATION,
                description=(
                    f"Création de l’intervention "
                    f"{intervention.id} pour le ticket "
                    f"{intervention.ticket.numero}."
                ),
                adresse_ip=self.request.META.get(
                    "REMOTE_ADDR"
                ),
            )

            # Notification automatique.
            notifier_intervention(
                intervention=intervention,
                acteur=self.request.user,
            )

    # =====================================================
    # MODIFICATION D'UNE INTERVENTION
    # =====================================================

    def perform_update(self, serializer):

        intervention = self.get_object()

        ancienne_description = intervention.description
        ancien_diagnostic = intervention.diagnostic
        ancienne_solution = intervention.solution

        with transaction.atomic():

            intervention = serializer.save()

            TicketHistory.objects.create(
                ticket=intervention.ticket,
                utilisateur=self.request.user,
                action="INTERVENTION",
                ancienne_valeur=(
                    f"Description : {ancienne_description}; "
                    f"Diagnostic : {ancien_diagnostic}; "
                    f"Solution : {ancienne_solution}"
                ),
                nouvelle_valeur=(
                    f"Description : {intervention.description}; "
                    f"Diagnostic : {intervention.diagnostic}; "
                    f"Solution : {intervention.solution}"
                ),
            )

            ActivityLog.objects.create(
                utilisateur=self.request.user,
                action=ActivityLog.Action.MODIFICATION,
                description=(
                    f"Modification de l’intervention "
                    f"{intervention.id} pour le ticket "
                    f"{intervention.ticket.numero}."
                ),
                adresse_ip=self.request.META.get(
                    "REMOTE_ADDR"
                ),
            )

            # Notification après modification.
            notifier_intervention(
                intervention=intervention,
                acteur=self.request.user,
            )
