from django.contrib import admin

from .models import Document


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):

    list_display = (
        'titre',
        'categorie',
        'auteur',
        'publie',
        'date_creation',
        'date_modification',
    )

    list_filter = (
        'categorie',
        'publie',
        'date_creation',
    )

    search_fields = (
        'titre',
        'description',
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