from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):

    list_display = (
        'username',
        'email',
        'identifiant',
        'fonction',
        'service',
        'role',
        'compte_actif',
    )

    list_filter = (
        'role',
        'compte_actif',
        'service',
    )

    search_fields = (
        'username',
        'email',
        'identifiant',
        'fonction',
        'service',
    )

    fieldsets = UserAdmin.fieldsets + (
        (
            'Informations DSI',
            {
                'fields': (
                    'identifiant',
                    'fonction',
                    'service',
                    'role',
                    'compte_actif',
                )
            },
        ),
    )

    add_fieldsets = UserAdmin.add_fieldsets + (
        (
            'Informations DSI',
            {
                'fields': (
                    'email',
                    'identifiant',
                    'fonction',
                    'service',
                    'role',
                    'compte_actif',
                )
            },
        ),
    )