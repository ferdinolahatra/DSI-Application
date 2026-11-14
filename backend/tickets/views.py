
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from django.utils.dateparse import parse_date

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import User

from notifications.services import (
    notifier_creation_ticket,
    notifier_affectation_ticket,
    notifier_changement_statut,
    notifier_commentaire_ticket,
)

from .models import Ticket, TicketHistory

from .permissions import (
    TicketAccessPermission,
    est_admin,
    est_technicien,
    normaliser_fonction,
    compte_actif,
)

from .serializers import (
    TicketSerializer,
    TicketCommentSerializer,
    TicketHistorySerializer,
)


class TicketViewSet(viewsets.ModelViewSet):

    """
    Gestion des tickets DSI.

    ADMINISTRATEUR :
        - Consulte tous les tickets.
        - Crée des tickets.
        - Modifie les tickets.
        - Affecte les techniciens.
        - Prend en charge les tickets.
        - Modifie les statuts.
        - Ajoute des commentaires et des réponses.
        - Consulte les historiques.

    TECHNICIEN DSI :
        - Est identifié par sa fonction.
        - Consulte les tickets non affectés.
        - Consulte les tickets qui lui sont affectés.
        - Peut s'affecter un ticket libre.
        - Prend en charge ses tickets.
        - Modifie le statut de ses tickets.
        - Ajoute des commentaires et des réponses.
        - Consulte les historiques.

    AUTRES UTILISATEURS :
        - Créent des tickets.
        - Consultent leurs propres tickets.
        - Ajoutent des commentaires et des réponses.
        - Consultent les historiques de leurs tickets.
        - Ne peuvent pas traiter les tickets.
        - Ne peuvent pas créer des interventions.
    """

    serializer_class = TicketSerializer

    permission_classes = [
        IsAuthenticated,
        TicketAccessPermission,
    ]

    queryset = Ticket.objects.all()

    filter_backends = [
        SearchFilter,
        OrderingFilter,
    ]

    search_fields = [
        "numero",
        "objet",
        "description",
        "service",
        "demandeur__username",
        "demandeur__first_name",
        "demandeur__last_name",
        "technicien__username",
    ]

    ordering_fields = [
        "date_creation",
        "date_modification",
        "priorite",
        "statut",
        "date_resolution",
        "date_prise_en_charge",
    ]

    ordering = ["-date_creation"]

    http_method_names = [
        "get",
        "post",
        "put",
        "patch",
        "head",
        "options",
    ]

    # ========================================================
    # VÉRIFICATION DES UTILISATEURS
    # ========================================================

    def est_admin(self, user):
        return est_admin(user)

    def est_technicien(self, user):
        return est_technicien(user)

    def est_autre_utilisateur(self, user):
        return (
            compte_actif(user)
            and not self.est_admin(user)
            and not self.est_technicien(user)
        )

    def verifier_compte_actif(self, user):

        if not compte_actif(user):
            raise ValidationError({
                "detail": "Votre compte est désactivé."
            })

    def verifier_droit_traitement(self, user):

        self.verifier_compte_actif(user)

        if not (
            self.est_admin(user)
            or self.est_technicien(user)
        ):
            raise ValidationError({
                "detail": (
                    "Seuls l'administrateur et le Technicien DSI "
                    "peuvent effectuer cette opération."
                )
            })

    # ========================================================
    # LISTE DES TICKETS
    # ========================================================

    def get_queryset(self):

        user = self.request.user

        if not compte_actif(user):
            return Ticket.objects.none()

        base_queryset = Ticket.objects.select_related(
            "demandeur",
            "technicien",
        )

        # Administrateur : tous les tickets.
        if self.est_admin(user):

            queryset = base_queryset.all()

        # Technicien DSI :
        # tickets non affectés et tickets qui lui appartiennent.
        elif self.est_technicien(user):

            queryset = base_queryset.filter(
                Q(technicien=user)
                | Q(technicien__isnull=True)
            )

        # Autres utilisateurs :
        # uniquement leurs propres tickets.
        else:

            queryset = base_queryset.filter(
                demandeur=user,
            )

        # Filtres facultatifs.
        for parametre in (
            "statut",
            "priorite",
            "categorie",
            "service",
        ):

            valeur = self.request.query_params.get(parametre)

            if valeur:
                queryset = queryset.filter(
                    **{parametre: valeur}
                )

        # Filtre par technicien.
        technicien_id = self.request.query_params.get(
            "technicien"
        )

        if technicien_id:

            try:
                technicien_id = int(technicien_id)

            except (TypeError, ValueError):

                raise ValidationError({
                    "technicien": (
                        "Fournissez un identifiant numérique valide."
                    )
                })

            queryset = queryset.filter(
                technicien_id=technicien_id,
            )

        # Date de début.
        date_debut_str = self.request.query_params.get(
            "date_debut"
        )

        if date_debut_str:

            date_debut = parse_date(date_debut_str)

            if date_debut is None:

                raise ValidationError({
                    "date_debut": "Format attendu : AAAA-MM-JJ."
                })

            queryset = queryset.filter(
                date_creation__date__gte=date_debut,
            )

        # Date de fin.
        date_fin_str = self.request.query_params.get(
            "date_fin"
        )

        if date_fin_str:

            date_fin = parse_date(date_fin_str)

            if date_fin is None:

                raise ValidationError({
                    "date_fin": "Format attendu : AAAA-MM-JJ."
                })

            queryset = queryset.filter(
                date_creation__date__lte=date_fin,
            )

        return queryset

    # ========================================================
    # CRÉATION D'UN TICKET
    # POST /api/tickets/
    # ========================================================

    def perform_create(self, serializer):

        user = self.request.user

        self.verifier_compte_actif(user)

        with transaction.atomic():

            # Administrateur : peut choisir le demandeur.
            if self.est_admin(user):

                demandeur = (
                    serializer.validated_data.get("demandeur")
                    or user
                )

            # Autres utilisateurs : demandeur connecté.
            else:

                demandeur = user

            ticket = serializer.save(
                demandeur=demandeur,
            )

            TicketHistory.objects.create(
                ticket=ticket,
                utilisateur=user,
                action="CREATION",
                ancienne_valeur="",
                nouvelle_valeur=f"Ticket créé : {ticket.numero}",
            )

            notifier_creation_ticket(
                ticket=ticket,
                acteur=user,
            )

    # ========================================================
    # AFFECTATION D'UN TICKET
    # POST /api/tickets/<id>/affecter/
    # ========================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="affecter",
    )
    def affecter(self, request, pk=None):

        user = request.user

        self.verifier_droit_traitement(user)

        technicien_connecte = self.est_technicien(user)

        ticket = self.get_object()

        technicien_id = request.data.get("technicien_id")

        if not technicien_id:

            raise ValidationError({
                "technicien_id": (
                    "L'identifiant du technicien est obligatoire."
                )
            })

        try:
            technicien_id = int(technicien_id)

        except (TypeError, ValueError):

            raise ValidationError({
                "technicien_id": (
                    "L'identifiant doit être numérique."
                )
            })

        # Un technicien ne peut s'affecter que lui-même.
        if (
            technicien_connecte
            and technicien_id != user.id
        ):

            raise ValidationError({
                "detail": (
                    "Un technicien peut uniquement "
                    "s'affecter lui-même."
                )
            })

        # Recherche d'un véritable Technicien DSI actif.
        technicien = User.objects.filter(
            pk=technicien_id,
            is_active=True,
            compte_actif=True,
        ).first()

        if (
            technicien is None
            or normaliser_fonction(
                getattr(technicien, "fonction", "")
            ) != "technicien dsi"
        ):

            raise ValidationError({
                "technicien_id": (
                    "Technicien DSI introuvable ou compte désactivé."
                )
            })

        with transaction.atomic():

            ticket = Ticket.objects.select_for_update().get(
                pk=ticket.pk
            )

            if ticket.statut in (
                Ticket.Status.RESOLUE,
                Ticket.Status.CLOTUREE,
            ):

                raise ValidationError({
                    "detail": (
                        "Impossible d'affecter un ticket "
                        "déjà résolu ou clôturé."
                    )
                })

            if ticket.date_prise_en_charge is not None:

                raise ValidationError({
                    "detail": (
                        "Ce ticket a déjà été pris en charge. "
                        "Le technicien ne peut plus être changé."
                    )
                })

            ancien_technicien = (
                ticket.technicien.username
                if ticket.technicien
                else ""
            )

            if ticket.technicien_id == technicien.id:

                return Response(
                    TicketSerializer(
                        ticket,
                        context=self.get_serializer_context(),
                    ).data,
                    status=status.HTTP_200_OK,
                )

            ticket.technicien = technicien
            ticket.save()

            TicketHistory.objects.create(
                ticket=ticket,
                utilisateur=user,
                action="AFFECTATION",
                ancienne_valeur=ancien_technicien,
                nouvelle_valeur=technicien.username,
            )

            notifier_affectation_ticket(
                ticket=ticket,
                acteur=user,
            )

        return Response(
            TicketSerializer(
                ticket,
                context=self.get_serializer_context(),
            ).data,
            status=status.HTTP_200_OK,
        )

    # ========================================================
    # PRISE EN CHARGE D'UN TICKET
    # POST /api/tickets/<id>/prendre-en-charge/
    # ========================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="prendre-en-charge",
    )
    def prendre_en_charge(self, request, pk=None):

        user = request.user

        self.verifier_droit_traitement(user)

        technicien_connecte = self.est_technicien(user)

        ticket = self.get_object()

        with transaction.atomic():

            ticket = Ticket.objects.select_for_update().get(
                pk=ticket.pk
            )

            if ticket.statut in (
                Ticket.Status.RESOLUE,
                Ticket.Status.CLOTUREE,
            ):

                raise ValidationError({
                    "detail": (
                        "Ce ticket est déjà terminé et "
                        "ne peut plus être pris en charge."
                    )
                })

            ancien_statut = ticket.statut

            ancien_technicien = (
                ticket.technicien.username
                if ticket.technicien
                else ""
            )

            # Technicien DSI : peut prendre un ticket libre
            # ou déjà affecté à lui.
            if technicien_connecte:

                if (
                    ticket.technicien_id is not None
                    and ticket.technicien_id != user.id
                ):

                    raise ValidationError({
                        "detail": (
                            "Ce ticket est déjà affecté "
                            "à un autre technicien."
                        )
                    })

                ticket.technicien = user

            # Administrateur : conserve le technicien affecté.

            if ticket.date_prise_en_charge is None:

                ticket.date_prise_en_charge = timezone.now()

            if ticket.statut in (
                Ticket.Status.NOUVELLE,
                Ticket.Status.EN_ATTENTE,
            ):

                ticket.statut = Ticket.Status.EN_COURS

            ticket.save()

            nouveau_technicien = (
                ticket.technicien.username
                if ticket.technicien
                else ""
            )

            if ancien_technicien != nouveau_technicien:

                TicketHistory.objects.create(
                    ticket=ticket,
                    utilisateur=user,
                    action="AFFECTATION",
                    ancienne_valeur=ancien_technicien,
                    nouvelle_valeur=nouveau_technicien,
                )

                notifier_affectation_ticket(
                    ticket=ticket,
                    acteur=user,
                )

            if ancien_statut != ticket.statut:

                TicketHistory.objects.create(
                    ticket=ticket,
                    utilisateur=user,
                    action="CHANGEMENT_STATUT",
                    ancienne_valeur=ancien_statut,
                    nouvelle_valeur=ticket.statut,
                )

                notifier_changement_statut(
                    ticket=ticket,
                    acteur=user,
                    ancien_statut=ancien_statut,
                    nouveau_statut=ticket.statut,
                )

        return Response(
            TicketSerializer(
                ticket,
                context=self.get_serializer_context(),
            ).data,
            status=status.HTTP_200_OK,
        )

    # ========================================================
    # CHANGEMENT DE STATUT
    # PATCH /api/tickets/<id>/statut/
    # ========================================================

    @action(
        detail=True,
        methods=["patch"],
        url_path="statut",
    )
    def changer_statut(self, request, pk=None):

        user = request.user

        self.verifier_droit_traitement(user)

        technicien_connecte = self.est_technicien(user)

        ticket = self.get_object()

        nouveau_statut = request.data.get("statut")

        statuts_valides = dict(Ticket.Status.choices)

        if nouveau_statut not in statuts_valides:

            raise ValidationError({
                "statut": {
                    "message": "Statut invalide.",
                    "valeurs_autorisees": list(
                        statuts_valides.keys()
                    ),
                }
            })

        with transaction.atomic():

            ticket = Ticket.objects.select_for_update().get(
                pk=ticket.pk
            )

            ancien_statut = ticket.statut

            if ancien_statut == nouveau_statut:

                return Response(
                    TicketSerializer(
                        ticket,
                        context=self.get_serializer_context(),
                    ).data,
                    status=status.HTTP_200_OK,
                )

            # Technicien : uniquement ses tickets pris en charge.
            if technicien_connecte:

                if ticket.technicien_id != user.id:

                    raise ValidationError({
                        "detail": (
                            "Vous ne pouvez traiter que les tickets "
                            "qui vous sont affectés."
                        )
                    })

                if ticket.date_prise_en_charge is None:

                    raise ValidationError({
                        "detail": (
                            "Vous devez prendre le ticket en charge "
                            "avant de modifier son statut."
                        )
                    })

            ticket.statut = nouveau_statut

            if nouveau_statut == Ticket.Status.RESOLUE:

                ticket.date_resolution = timezone.now()

            elif nouveau_statut == Ticket.Status.CLOTUREE:

                if ticket.date_resolution is None:
                    ticket.date_resolution = timezone.now()

            else:

                ticket.date_resolution = None

            ticket.save()

            TicketHistory.objects.create(
                ticket=ticket,
                utilisateur=user,
                action="CHANGEMENT_STATUT",
                ancienne_valeur=ancien_statut,
                nouvelle_valeur=nouveau_statut,
            )

            notifier_changement_statut(
                ticket=ticket,
                acteur=user,
                ancien_statut=ancien_statut,
                nouveau_statut=nouveau_statut,
            )

        return Response(
            TicketSerializer(
                ticket,
                context=self.get_serializer_context(),
            ).data,
            status=status.HTTP_200_OK,
        )

    # ========================================================
    # COMMENTAIRES ET RÉPONSES
    # GET  /api/tickets/<id>/commentaires/
    # POST /api/tickets/<id>/commentaires/
    # ========================================================

    @action(
        detail=True,
        methods=["get", "post"],
        url_path="commentaires",
    )
    def commentaires(self, request, pk=None):

        user = request.user

        self.verifier_compte_actif(user)

        ticket = self.get_object()

        contexte = {
            **self.get_serializer_context(),
            "ticket": ticket,
        }

        # -----------------------------------------------
        # AFFICHER LES COMMENTAIRES ET LEURS RÉPONSES
        # -----------------------------------------------

        if request.method == "GET":

            commentaires = ticket.commentaires.select_related(
                "auteur",
                "reponse_a",
                "reponse_a__auteur",
            ).all().order_by("date_creation")

            serializer = TicketCommentSerializer(
                commentaires,
                many=True,
                context=contexte,
            )

            return Response(serializer.data)

        # -----------------------------------------------
        # AJOUTER UN COMMENTAIRE OU UNE RÉPONSE
        # -----------------------------------------------

        serializer = TicketCommentSerializer(
            data=request.data,
            context=contexte,
        )

        serializer.is_valid(
            raise_exception=True,
        )

        with transaction.atomic():

            commentaire = serializer.save(
                ticket=ticket,
                auteur=user,
            )

            TicketHistory.objects.create(
                ticket=ticket,
                utilisateur=user,
                action="COMMENTAIRE",
                ancienne_valeur="",
                nouvelle_valeur=(
                    "Réponse ajoutée"
                    if commentaire.reponse_a_id
                    else "Nouveau commentaire ajouté"
                ),
            )

            notifier_commentaire_ticket(
                ticket=ticket,
                commentaire=commentaire,
            )

        return Response(
            TicketCommentSerializer(
                commentaire,
                context=contexte,
            ).data,
            status=status.HTTP_201_CREATED,
        )

    # ========================================================
    # HISTORIQUE
    # GET /api/tickets/<id>/historique/
    # ========================================================

    @action(
        detail=True,
        methods=["get"],
        url_path="historique",
    )
    def historique(self, request, pk=None):

        self.verifier_compte_actif(request.user)

        ticket = self.get_object()

        historique = ticket.historique.select_related(
            "utilisateur",
        ).all()

        serializer = TicketHistorySerializer(
            historique,
            many=True,
        )

        return Response(serializer.data)
