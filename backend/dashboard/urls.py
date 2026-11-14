from django.urls import path

from .views import DashboardStatisticsView


urlpatterns = [
    path(
        '',
        DashboardStatisticsView.as_view(),
        name='dashboard-statistics',
    ),
]