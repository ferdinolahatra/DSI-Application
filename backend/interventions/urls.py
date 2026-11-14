from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import InterventionViewSet


router = DefaultRouter()

router.register(
    'interventions',
    InterventionViewSet,
    basename='dsi-interventions',
)


urlpatterns = [
    path('', include(router.urls)),
]