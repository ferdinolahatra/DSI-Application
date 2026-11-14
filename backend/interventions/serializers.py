
from rest_framework import serializers
from django.utils import timezone

from .models import Intervention
from .permissions import (
    compte_actif,
    est_admin,
    est_technicien,
)


class InterventionSerializer(serializers.ModelSerializer):

    ticket_numero = serializers.CharField(
        source="ticket.numero",
        read_only=True,
    )

    ticket_objet = serializers.CharField(
        source="ticket.objet",
        read_only=True,
    )

    technicien_username = serializers.CharField(
        source="technicien.username",
        read_only=True,
    )

    ticket = serializers.PrimaryKeyRelatedField(
        queryset=Intervention._meta.get_field(
            "ticket"
        ).remote_field.model.objects.all(),
    )

    technicien = serializers.PrimaryKeyRelatedField(
        read_only=True,
    )

    date_intervention = serializers.DateTimeField(
        default=timezone.now,
    )

    duree = serializers.IntegerField(
        min_value=1,
    )

    class Meta:
        model = Intervention

        fields = [
            "id",
            "ticket",
            "ticket_numero",
            "ticket_objet",
            "technicien",
            "technicien_username",
            "date_intervention",
            "description",
            "duree",
            "diagnostic",
            "solution",
            "resultat",
            "statut_final",
            "date_creation",
            "date_modification",
        ]

        read_only_fields = [
            "id",
            "technicien",
            "technicien_username",
            "date_creation",
            "date_modification",
        ]

    # =====================================================
    # VALIDATION DES INTERVENTIONS
    # =====================================================

    def validate(self, attrs):

        request = self.context.get("request")

        if not request:
            raise serializers.ValidationError(
                "Impossible d'identifier l'utilisateur connecté."
            )

        user = request.user

        if not compte_actif(user):
            raise serializers.ValidationError(
                "Votre compte est inactif."
            )

        administrateur = est_admin(user)
        technicien_dsi = est_technicien(user)

        # Seuls l'administrateur et le Technicien DSI
        # peuvent créer ou modifier une intervention.
        if not (administrateur or technicien_dsi):
            raise serializers.ValidationError(
                "Seul l'administrateur ou le Technicien DSI "
                "peut enregistrer une intervention."
            )

        ticket = attrs.get(
            "ticket",
            self.instance.ticket if self.instance else None,
        )

        if not ticket:
            raise serializers.ValidationError({
                "ticket": "Le ticket est obligatoire."
            })

        # Ne pas déplacer une intervention vers un autre ticket.
        if (
            self.instance
            and ticket.pk != self.instance.ticket_id
        ):
            raise serializers.ValidationError({
                "ticket": (
                    "Une intervention ne peut pas être "
                    "déplacée vers un autre ticket."
                )
            })

        # Une intervention doit concerner un ticket
        # déjà pris en charge.
        if not ticket.date_prise_en_charge:
            raise serializers.ValidationError({
                "ticket": (
                    "Le ticket doit être pris en charge "
                    "avant l'enregistrement d'une intervention."
                )
            })

        # -------------------------------------------------
        # ADMINISTRATEUR
        # L'administrateur conserve son identité comme
        # technicien de l'intervention.
        # -------------------------------------------------

        if administrateur:

            if self.instance:
                attrs["technicien"] = self.instance.technicien
            else:
                attrs["technicien"] = user

        # -------------------------------------------------
        # TECHNICIEN DSI
        # Il doit être affecté au ticket.
        # -------------------------------------------------

        elif technicien_dsi:

            if ticket.technicien_id != user.id:
                raise serializers.ValidationError({
                    "ticket": (
                        "Vous devez être affecté à ce ticket "
                        "pour enregistrer une intervention."
                    )
                })

            if self.instance:
                if self.instance.technicien_id != user.id:
                    raise serializers.ValidationError({
                        "technicien": (
                            "Vous ne pouvez modifier que "
                            "vos propres interventions."
                        )
                    })

                attrs["technicien"] = self.instance.technicien

            else:
                attrs["technicien"] = user

        return attrs
