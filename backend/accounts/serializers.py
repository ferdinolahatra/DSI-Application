
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed

from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User


# ============================================================
# 1. INFORMATIONS DE L'UTILISATEUR CONNECTÉ
# ============================================================

class UserProfileSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    role_display = serializers.SerializerMethodField()

    # Informations nécessaires pour identifier l'administrateur.
    is_superuser = serializers.BooleanField(read_only=True)
    is_staff = serializers.BooleanField(read_only=True)

    class Meta:
        model = User

        fields = [
            'id',
            'username',
            'first_name',
            'last_name',
            'email',
            'fonction',
            'service',
            'identifiant',
            'role',
            'role_display',
            'is_active',
            'is_staff',
            'is_superuser',
            'compte_actif',
            'date_creation',
        ]

        read_only_fields = fields

    def get_role(self, obj):
        if obj.is_superuser:
            return User.Role.ADMIN

        return obj.role

    def get_role_display(self, obj):
        if obj.is_superuser:
            return 'Administrateur DSI'

        return obj.get_role_display()


# ============================================================
# 2. CONNEXION PAR IDENTIFIANT ET MOT DE PASSE
# ============================================================

class LoginSerializer(serializers.Serializer):
    identifiant = serializers.CharField()

    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    def validate(self, attrs):
        request = self.context.get('request')

        user = User.objects.filter(
            identifiant=attrs['identifiant']
        ).first()

        message = 'Identifiant ou mot de passe incorrect.'

        if user is None:
            raise AuthenticationFailed(message)

        if not user.is_active or not user.compte_actif:
            raise AuthenticationFailed(message)

        utilisateur = authenticate(
            request=request,
            username=user.username,
            password=attrs['password'],
        )

        if utilisateur is None:
            raise AuthenticationFailed(message)

        refresh = RefreshToken.for_user(utilisateur)

        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': UserProfileSerializer(utilisateur).data,
        }


# ============================================================
# 3. RENOUVELLEMENT DU TOKEN JWT
# ============================================================

class DsiTokenRefreshSerializer(TokenRefreshSerializer):
    """
    Vérifie que l'utilisateur existe et que son compte est actif
    avant de renouveler le token.
    """

    def validate(self, attrs):
        try:
            refresh = RefreshToken(attrs['refresh'])

        except TokenError:
            raise AuthenticationFailed(
                'Le token de renouvellement est invalide ou révoqué.'
            )

        user_id = refresh.get('user_id')

        user = User.objects.filter(
            pk=user_id
        ).first()

        if (
            user is None
            or not user.is_active
            or not user.compte_actif
        ):
            raise AuthenticationFailed(
                'Compte désactivé ou utilisateur introuvable.'
            )

        return super().validate(attrs)


# ============================================================
# 4. GESTION DES UTILISATEURS PAR L'ADMINISTRATEUR
# ============================================================

class UserManagementSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=False,
        min_length=8,
        trim_whitespace=False,
    )

    role_display = serializers.CharField(
        source='get_role_display',
        read_only=True,
    )

    is_active = serializers.BooleanField(
        read_only=True,
    )

    is_superuser = serializers.BooleanField(
        read_only=True,
    )

    is_staff = serializers.BooleanField(
        read_only=True,
    )

    class Meta:
        model = User

        fields = [
            'id',
            'username',
            'first_name',
            'last_name',
            'email',
            'fonction',
            'service',
            'identifiant',
            'role',
            'role_display',
            'compte_actif',
            'is_active',
            'is_superuser',
            'is_staff',
            'date_creation',
            'password',
        ]

        read_only_fields = [
            'id',
            'role_display',
            'is_active',
            'is_superuser',
            'is_staff',
            'date_creation',
        ]

    def validate(self, attrs):
        password = attrs.get('password')

        if self.instance is None and not password:
            raise serializers.ValidationError({
                'password': (
                    'Le mot de passe est obligatoire '
                    'à la création du compte.'
                )
            })

        if password:
            try:
                validate_password(
                    password,
                    user=self.instance,
                )

            except DjangoValidationError as exc:
                raise serializers.ValidationError({
                    'password': exc.messages
                })

        return attrs

    def to_representation(self, instance):
        data = super().to_representation(instance)

        if instance.is_superuser:
            data['role'] = User.Role.ADMIN
            data['role_display'] = 'Administrateur DSI'

        return data

    def create(self, validated_data):
        password = validated_data.pop('password')

        actif = validated_data.get('compte_actif', True)

        user = User(**validated_data)

        user.compte_actif = actif
        user.is_active = actif

        user.set_password(password)

        user.save()

        return user

    def update(self, instance, validated_data):
        if (
            instance.is_superuser
            and validated_data.get('compte_actif') is False
        ):
            raise serializers.ValidationError({
                'compte_actif': (
                    'Le compte super administrateur ne peut pas '
                    'être désactivé depuis la gestion des utilisateurs.'
                )
            })

        password = validated_data.pop('password', None)

        for attribut, valeur in validated_data.items():
            setattr(instance, attribut, valeur)

        if instance.is_superuser:
            instance.compte_actif = True
            instance.is_active = True
            instance.is_staff = True
        else:
            instance.is_active = instance.compte_actif

        if password:
            instance.set_password(password)

        instance.save()

        return instance


# ============================================================
# 5. INSCRIPTION PUBLIQUE
# ============================================================

class PublicRegistrationSerializer(serializers.ModelSerializer):
    """
    Inscription publique :
    - conserve le fonctionnement actuel des inscriptions ;
    - crée les nouveaux comptes désactivés ;
    - nécessite une validation de l'administrateur.
    """

    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    password_confirmation = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    role = serializers.ChoiceField(
        choices=[
            (User.Role.AGENT, "Agent du ministère"),
            (User.Role.TECHNICIEN, "Technicien DSI"),
        ],
        default=User.Role.AGENT,
    )

    class Meta:
        model = User

        fields = [
            "username",
            "first_name",
            "last_name",
            "email",
            "identifiant",
            "service",
            "fonction",
            "role",
            "password",
            "password_confirmation",
        ]

    def validate(self, attrs):
        password = attrs.get("password")
        confirmation = attrs.pop("password_confirmation", None)

        if password != confirmation:
            raise serializers.ValidationError({
                "password_confirmation":
                    "Les deux mots de passe ne correspondent pas."
            })

        try:
            validate_password(password)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({
                "password": exc.messages
            })

        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")

        role_demande = validated_data.pop(
            "role",
            User.Role.AGENT,
        )

        user = User(
            **validated_data,
            role=role_demande,
            compte_actif=False,
            is_active=False,
        )

        user.set_password(password)
        user.save()

        return user
