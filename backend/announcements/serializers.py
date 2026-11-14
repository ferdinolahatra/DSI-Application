from rest_framework import serializers

from .models import Announcement


class AnnouncementSerializer(serializers.ModelSerializer):
    auteur_username = serializers.CharField(
        source='auteur.username',
        read_only=True,
    )

    class Meta:
        model = Announcement

        fields = [
            'id',
            'titre',
            'contenu',
            'type',
            'auteur',
            'auteur_username',
            'publie',
            'date_publication',
            'date_debut',
            'date_fin',
            'date_creation',
            'date_modification',
        ]

        read_only_fields = [
            'id',
            'auteur',
            'auteur_username',
            'publie',
            'date_publication',
            'date_creation',
            'date_modification',
        ]

    def validate(self, attrs):
        date_debut = attrs.get(
            'date_debut',
            self.instance.date_debut if self.instance else None,
        )

        date_fin = attrs.get(
            'date_fin',
            self.instance.date_fin if self.instance else None,
        )

        if date_debut and date_fin and date_fin < date_debut:
            raise serializers.ValidationError({
                'date_fin': (
                    'La date de fin doit être postérieure '
                    'ou égale à la date de début.'
                )
            })

        return attrs