from django.contrib import admin

from .models import ActivityLog


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):

    list_display = (
        'utilisateur',
        'action',
        'description',
        'adresse_ip',
        'date_creation',
    )

    list_filter = (
        'action',
        'date_creation',
    )

    search_fields = (
        'utilisateur__username',
        'description',
        'adresse_ip',
    )

    readonly_fields = (
        'utilisateur',
        'action',
        'description',
        'adresse_ip',
        'date_creation',
    )

    ordering = (
        '-date_creation',
    )