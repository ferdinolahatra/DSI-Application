from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    LoginView,
    LogoutView,
    MeView,
    RefreshTokenView,
    RegisterView,
)

from .user_views import UserManagementViewSet


router = DefaultRouter()

router.register(
    'users',
    UserManagementViewSet,
    basename='dsi-users',
)


urlpatterns = [
    # AUTHENTIFICATION JWT
    path(
        'auth/login/',
        LoginView.as_view(),
        name='api-login',
    ),

    path(
        'auth/refresh/',
        RefreshTokenView.as_view(),
        name='api-refresh',
    ),

    path(
        'auth/logout/',
        LogoutView.as_view(),
        name='api-logout',
    ),

    path(
        'auth/me/',
        MeView.as_view(),
        name='api-me',
    ),

    # USERS
    path(
        '',
        include(router.urls),
    ),

    path(
    'auth/register/',
    RegisterView.as_view(),
    name='api-register',
),
]