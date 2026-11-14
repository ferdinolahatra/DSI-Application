
from rest_framework import serializers

from accounts.models import User
from .models import Ticket, TicketComment, TicketHistory

from .permissions import (
    compte_actif,
    est_admin,
)


# =========================================================
# SERIALIZER DES TICKETS
# =========================================================

class TicketSerializer(serializers.ModelSerializer):

    demandeur_username = serializers.CharField(
        source="demandeur.username",
        read_only=True,
    )

    technicien_username = serializers.CharField(
        source="technicien.username",
        read_only=True,
        allow_null=True,
    )

    date_prise_en_charge = serializers.DateTimeField(
        read_only=True,
        allow_null=True,
    )

    demandeur = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(
            is_active=True,
            compte_actif=True,
        ),
        required=False,
    )

    technicien = serializers.PrimaryKeyRelatedField(
        read_only=True,
        allow_null=True,
    )

    service = serializers.CharField(
        required=False,
        allow_blank=True,
    )

    class Meta:

        model = Ticket

        fields = [
            "id",
            "numero",
            "date_creation",
            "date_prise_en_charge",
            "demandeur",
            "demandeur_username",
            "service",
            "categorie",
            "priorite",
            "objet",
            "description",
            "technicien",
            "technicien_username",
            "statut",
            "date_resolution",
            "date_modification",
        ]

        read_only_fields = [
            "id",
            "numero",
            "date_creation",
            "date_prise_en_charge",
            "demandeur_username",
            "technicien",
            "technicien_username",
            "statut",
            "date_resolution",
            "date_modification",
        ]

    def __init__(self, *args, **kwargs):

        super().__init__(*args, **kwargs)

        request = self.context.get("request")

        if request and request.user.is_authenticated:

            user = request.user

            if not est_admin(user):
                self.fields["demandeur"].read_only = True

    def validate(self, attrs):

        request = self.context.get("request")

        if not request:
            return attrs

        user = request.user

        if not compte_actif(user):
            raise serializers.ValidationError(
                "Votre compte est inactif."
            )

        if self.instance is None:

            if est_admin(user):

                service = (
                    attrs.get("service") or ""
                ).strip()

                if not service:
                    raise serializers.ValidationError({
                        "service": (
                            "Le service doit être renseigné "
                            "pour créer un ticket."
                        )
                    })

                attrs["service"] = service

            else:

                service = (
                    getattr(user, "service", "") or ""
                ).strip()

                if not service:
                    raise serializers.ValidationError({
                        "service": (
                            "Renseignez le service de votre compte "
                            "avant de créer un ticket."
                        )
                    })

                attrs["service"] = service

        return attrs


# =========================================================
# SERIALIZER DES COMMENTAIRES ET RÉPONSES
# =========================================================

class TicketCommentSerializer(serializers.ModelSerializer):

    auteur_username = serializers.CharField(
        source="auteur.username",
        read_only=True,
    )

    reponse_a = serializers.PrimaryKeyRelatedField(
        queryset=TicketComment.objects.select_related(
            "ticket",
            "auteur",
        ).all(),
        required=False,
        allow_null=True,
    )

    reponse_a_details = serializers.SerializerMethodField()

    class Meta:

        model = TicketComment

        fields = [
            "id",
            "ticket",
            "auteur",
            "auteur_username",
            "contenu",
            "reponse_a",
            "reponse_a_details",
            "date_creation",
        ]

        read_only_fields = [
            "id",
            "ticket",
            "auteur",
            "auteur_username",
            "reponse_a_details",
            "date_creation",
        ]

    def get_reponse_a_details(self, obj):

        commentaire_parent = obj.reponse_a

        if not commentaire_parent:
            return None

        return {
            "id": commentaire_parent.id,
            "auteur": commentaire_parent.auteur.username,
            "contenu": commentaire_parent.contenu,
            "date_creation": commentaire_parent.date_creation,
        }

    def validate(self, attrs):

        request = self.context.get("request")

        if request and not compte_actif(request.user):
            raise serializers.ValidationError(
                "Votre compte est inactif."
            )

        commentaire_parent = attrs.get("reponse_a")

        if commentaire_parent:

            # Récupérer le ticket concerné.
            ticket = self.context.get("ticket")

            if ticket is None:

                view = self.context.get("view")

                if view and hasattr(view, "get_object"):
                    ticket = view.get_object()

            if ticket is None:
                raise serializers.ValidationError({
                    "ticket": (
                        "Impossible de déterminer "
                        "le ticket concerné."
                    )
                })

            # Une réponse doit appartenir au même ticket.
            if commentaire_parent.ticket_id != ticket.id:
                raise serializers.ValidationError({
                    "reponse_a": (
                        "Vous ne pouvez pas répondre à un "
                        "commentaire appartenant à un autre ticket."
                    )
                })

            # Empêcher une réponse à une réponse.
            if commentaire_parent.reponse_a_id is not None:
                raise serializers.ValidationError({
                    "reponse_a": (
                        "Vous devez répondre au commentaire "
                        "d'origine et non à une autre réponse."
                    )
                })

        return attrs


# =========================================================
# SERIALIZER DE L'HISTORIQUE
# =========================================================

class TicketHistorySerializer(serializers.ModelSerializer):

    utilisateur_username = serializers.CharField(
        source="utilisateur.username",
        read_only=True,
        allow_null=True,
    )

    class Meta:

        model = TicketHistory

        fields = [
            "id",
            "ticket",
            "utilisateur",
            "utilisateur_username",
            "action",
            "ancienne_valeur",
            "nouvelle_valeur",
            "date_creation",
        ]

        read_only_fields = fields
