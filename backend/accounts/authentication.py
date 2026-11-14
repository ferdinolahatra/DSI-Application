from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication


class DsiJWTAuthentication(JWTAuthentication):
    """
    Authentification JWT de l'application DSI.
    Refuse les comptes désactivés.
    """

    def get_user(self, validated_token):
        user = super().get_user(validated_token)

        if not user.compte_actif:
            raise AuthenticationFailed(
                "Ce compte est désactivé.",
                code="user_inactive",
            )

        return user