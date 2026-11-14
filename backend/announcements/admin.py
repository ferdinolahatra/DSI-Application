from django.contrib import admin

from .models import Announcement


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):

    list_display = (
        'titre',
        'type',
        'auteur',
        'publie',
        'date_publication',
        'date_debut',
        'date_fin',
    )

    list_filter = (
        'type',
        'publie',
        'date_publication',
    )

    search_fields = (
        'titre',
        'contenu',
        'auteur__username',
        'auteur__email',
    )

    readonly_fields = (
        'date_creation',
        'date_modification',
    )

    ordering = (
        '-date_creation',
    )