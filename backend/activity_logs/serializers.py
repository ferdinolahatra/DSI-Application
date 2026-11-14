
from rest_framework import serializers

from .models import ActivityLog


class ActivityLogSerializer(serializers.ModelSerializer):

    utilisateur_detail = serializers.SerializerMethodField()
    utilisateur_username = serializers.SerializerMethodField()
    utilisateur_nom = serializers.SerializerMethodField()
    utilisateur_role = serializers.SerializerMethodField()
    action_display = serializers.SerializerMethodField()

    class Meta:
        model = ActivityLog

        fields = [
            "id",
            "utilisateur",
            "utilisateur_detail",
            "utilisateur_username",
            "utilisateur_nom",
            "utilisateur_role",
            "action",
            "action_display",
            "description",
            "adresse_ip",
            "date_creation",
        ]

        read_only_fields = fields

    def get_utilisateur_detail(self, obj):
        user = obj.utilisateur

        if not user:
            return None

        first_name = getattr(user, "first_name", "") or ""
        last_name = getattr(user, "last_name", "") or ""

        nom_complet = f"{first_name} {last_name}".strip()

        return {
            "id": user.pk,
            "username": getattr(user, "username", ""),
            "first_name": first_name,
            "last_name": last_name,
            "nom_complet": nom_complet,
            "role": getattr(user, "role", ""),
        }

    def get_utilisateur_username(self, obj):
        user = obj.utilisateur

        if not user:
            return "Utilisateur inconnu"

        return getattr(user, "username", "Utilisateur inconnu")

    def get_utilisateur_nom(self, obj):
        user = obj.utilisateur

        if not user:
            return "Utilisateur inconnu"

        first_name = getattr(user, "first_name", "") or ""
        last_name = getattr(user, "last_name", "") or ""

        nom_complet = f"{first_name} {last_name}".strip()

        return nom_complet or getattr(
            user,
            "username",
            "Utilisateur inconnu"
        )

    def get_utilisateur_role(self, obj):
        user = obj.utilisateur

        if not user:
            return "Non renseigné"

        return getattr(user, "role", "Non renseigné")

    def get_action_display(self, obj):
        method = getattr(obj, "get_action_display", None)

        if callable(method):
            return method()

        return obj.action
