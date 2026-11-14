from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.viewsets import ModelViewSet

from .models import User
from .permissions import IsDsiAdmin
from .serializers import UserManagementSerializer


class UserManagementViewSet(ModelViewSet):
    """
    API de gestion des utilisateurs DSI.
    Accessible uniquement aux administrateurs DSI.
    """

    serializer_class = UserManagementSerializer
    permission_classes = [IsDsiAdmin]

    queryset = User.objects.all().order_by(
        'last_name',
        'first_name',
        'username',
    )

    filter_backends = [
        SearchFilter,
        OrderingFilter,
    ]

    search_fields = [
        'username',
        'first_name',
        'last_name',
        'email',
        'identifiant',
        'service',
        'fonction',
    ]

    ordering_fields = [
        'username',
        'first_name',
        'last_name',
        'date_creation',
        'role',
    ]

    # On désactive les comptes plutôt que de supprimer
    # définitivement les utilisateurs et leur traçabilité.
    http_method_names = [
        'get',
        'post',
        'put',
        'patch',
        'head',
        'options',
    ]