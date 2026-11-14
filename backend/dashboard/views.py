from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .services import get_dashboard_statistics


class DashboardStatisticsView(APIView):
    """
    API du tableau de bord de la DSI.
    Les statistiques sont filtrées selon le rôle connecté.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        statistiques = get_dashboard_statistics(request.user)

        return Response(
            statistiques,
            status=200,
        )