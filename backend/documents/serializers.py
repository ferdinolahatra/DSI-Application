from rest_framework import serializers

from .models import Document


class DocumentSerializer(serializers.ModelSerializer):
    auteur_username = serializers.CharField(
        source='auteur.username',
        read_only=True,
    )

    # Le champ accepte un fichier envoyé par formulaire multipart.
    # En réponse, l'API renvoie son nom, pas une URL publique.
    fichier = serializers.FileField(
        required=False,
        allow_empty_file=False,
        use_url=False,
    )

    class Meta:
        model = Document

        fields = [
            'id',
            'titre',
            'description',
            'categorie',
            'fichier',
            'auteur',
            'auteur_username',
            'publie',
            'date_creation',
            'date_modification',
        ]

        read_only_fields = [
            'id',
            'auteur',
            'auteur_username',
            'date_creation',
            'date_modification',
        ]

    def validate(self, attrs):
        # Un fichier est obligatoire à la création.
        if self.instance is None and not attrs.get('fichier'):
            raise serializers.ValidationError({
                'fichier': (
                    'Veuillez sélectionner un fichier à déposer.'
                )
            })

        return attrs