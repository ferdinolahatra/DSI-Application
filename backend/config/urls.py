
"""
URL configuration for config project.

Routes principales de l'application DSI :
- Administration Django
- Authentification JWT
- Gestion des utilisateurs
- Gestion des tickets
- Notifications
- Interventions techniques
- Gestion documentaire
- Annonces
- Journal d'activité
- Tableau de bord
"""

from django.contrib import admin
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static


urlpatterns = [
    # Administration Django
    path(
        'admin/',
        admin.site.urls,
    ),

    # API d'authentification et gestion des utilisateurs
    path(
        'api/',
        include('accounts.urls'),
    ),

    # Gestion des tickets
    path(
        'api/',
        include('tickets.urls'),
    ),

    # Notifications
    path(
        'api/',
        include('notifications.urls'),
    ),

    # Interventions techniques
    path(
        'api/',
        include('interventions.urls'),
    ),

    # Gestion documentaire
    path(
        'api/',
        include('documents.urls'),
    ),

    # Annonces
    path(
        'api/',
        include('announcements.urls'),
    ),

    # Journal d'activité
    path(
        'api/',
        include('activity_logs.urls'),
    ),

    # Tableau de bord
    path(
        'api/dashboard/',
        include('dashboard.urls'),
    ),
]


# ============================================================
# FICHIERS MÉDIAS — DÉVELOPPEMENT LOCAL UNIQUEMENT
# ============================================================

if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT,
    )
