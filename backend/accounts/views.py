from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from .serializers import PublicRegistrationSerializer

from .serializers import (
    DsiTokenRefreshSerializer,
    LoginSerializer,
    UserProfileSerializer,
)


class LoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(
            data=request.data,
            context={'request': request},
        )

        serializer.is_valid(raise_exception=True)

        return Response(
            serializer.validated_data,
            status=status.HTTP_200_OK,
        )


class RefreshTokenView(TokenRefreshView):
    authentication_classes = []
    permission_classes = [AllowAny]
    serializer_class = DsiTokenRefreshSerializer


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_value = request.data.get('refresh')

        if not refresh_value:
            return Response(
                {
                    'detail': (
                        'Le champ refresh est obligatoire.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            refresh = RefreshToken(refresh_value)

            if str(refresh.get('user_id')) != str(request.user.pk):
                return Response(
                    {
                        'detail': (
                            'Ce token ne correspond pas '
                            'à cet utilisateur.'
                        )
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

            refresh.blacklist()

        except TokenError:
            return Response(
                {
                    'detail': (
                        'Le token est invalide ou déjà révoqué.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )


        
class RegisterView(APIView):
    """
    Inscription publique d'un agent.
    Le compte est créé désactivé en attente de validation.
    """

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PublicRegistrationSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {
                'detail': (
                    'Inscription reçue. '
                    'Votre compte est en attente de validation '
                    'par l’administrateur DSI.'
                )
            },
            status=status.HTTP_201_CREATED,
        )
