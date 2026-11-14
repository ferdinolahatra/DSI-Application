
from django.contrib import admin
from django.db.models import Q
from django.contrib.auth import get_user_model

from .models import Intervention
from tickets.models import Ticket, TicketHistory

User = get_user_model()


def get_role(user):
    return str(getattr(user, "role", "") or "").upper()


def is_dsi_admin(user):
    return user.is_superuser or get_role(user) == "ADMIN"


def can_access_interventions(user):
    return is_dsi_admin(user) or get_role(user) == "TECHNICIEN"


@admin.register(Intervention)
class InterventionAdmin(admin.ModelAdmin):
    list_display = (
        "ticket",
        "technicien",
        "date_intervention",
        "duree",
        "resultat",
        "statut_final",
        "date_modification",
    )

    list_display_links = ("ticket",)

    list_filter = (
        "resultat",
        "statut_final",
        "date_intervention",
        "technicien",
    )

    search_fields = (
        "ticket__numero",
        "ticket__objet",
        "technicien__username",
        "technicien__first_name",
        "technicien__last_name",
        "description",
        "diagnostic",
        "solution",
    )

    readonly_fields = (
        "date_creation",
        "date_modification",
    )

    ordering = ("-date_intervention",)
    date_hierarchy = "date_intervention"
    list_per_page = 25
    list_select_related = ("ticket", "technicien")

    intervention_fields = (
        "ticket",
        "technicien",
        "date_intervention",
        "description",
        "duree",
        "diagnostic",
        "solution",
        "resultat",
        "statut_final",
        "date_creation",
        "date_modification",
    )

    def has_module_permission(self, request):
        return can_access_interventions(request.user)

    def get_queryset(self, request):
        queryset = super().get_queryset(request).select_related(
            "ticket",
            "technicien",
        )

        if is_dsi_admin(request.user):
            return queryset

        if get_role(request.user) == "TECHNICIEN":
            return queryset.filter(
                Q(technicien=request.user)
                | Q(ticket__technicien=request.user)
            ).distinct()

        return queryset.none()

    def has_view_permission(self, request, obj=None):
        if not can_access_interventions(request.user):
            return False

        if obj is None:
            return True

        if is_dsi_admin(request.user):
            return True

        return (
            obj.technicien_id == request.user.pk
            or obj.ticket.technicien_id == request.user.pk
        )

    def has_add_permission(self, request):
        return can_access_interventions(request.user)

    def has_change_permission(self, request, obj=None):
        if is_dsi_admin(request.user):
            return True

        if get_role(request.user) != "TECHNICIEN":
            return False

        if obj is None:
            return True

        # Un technicien peut modifier uniquement ses propres interventions.
        return obj.technicien_id == request.user.pk

    def has_delete_permission(self, request, obj=None):
        return is_dsi_admin(request.user)

    def get_fields(self, request, obj=None):
        return self.intervention_fields

    def get_readonly_fields(self, request, obj=None):
        if is_dsi_admin(request.user):
            return ("date_creation", "date_modification")

        if get_role(request.user) == "TECHNICIEN":
            readonly = [
                "technicien",
                "date_creation",
                "date_modification",
            ]

            # On ne change pas le ticket d'une intervention existante.
            if obj is not None:
                readonly.append("ticket")

            return tuple(readonly)

        return self.intervention_fields

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        role = get_role(request.user)

        if db_field.name == "ticket":
            tickets = Ticket.objects.all()

            if not is_dsi_admin(request.user) and role == "TECHNICIEN":
                tickets = tickets.filter(technicien=request.user)

            kwargs["queryset"] = tickets.order_by("-date_creation")

        elif db_field.name == "technicien":
            technicians = User.objects.filter(
                role="TECHNICIEN",
                is_active=True,
                compte_actif=True,
            ).order_by("last_name", "first_name", "username")

            kwargs["queryset"] = technicians

        return super().formfield_for_foreignkey(
            db_field,
            request,
            **kwargs,
        )

    def save_model(self, request, obj, form, change):
        previous = None

        if change:
            previous = (
                Intervention.objects
                .filter(pk=obj.pk)
                .values(
                    "ticket_id",
                    "technicien_id",
                    "date_intervention",
                    "duree",
                    "description",
                    "diagnostic",
                    "solution",
                    "resultat",
                    "statut_final",
                )
                .first()
            )

        if (
            get_role(request.user) == "TECHNICIEN"
            and not is_dsi_admin(request.user)
        ):
            obj.technicien = request.user

        super().save_model(request, obj, form, change)

        new_value = (
            f"Ticket={obj.ticket.numero}; "
            f"Technicien={obj.technicien.username}; "
            f"Durée={obj.duree} min; "
            f"Résultat={obj.resultat}; "
            f"Statut final={obj.statut_final}"
        )

        if previous is None:
            action = "INTERVENTION_CREEE_ADMIN"
            old_value = ""
        else:
            action = "INTERVENTION_MODIFIEE_ADMIN"
            old_value = "; ".join(
                f"{key}={value}"
                for key, value in previous.items()
            )

        # Conserve la trace de l'opération dans l'historique du ticket.
        TicketHistory.objects.create(
            ticket=obj.ticket,
            utilisateur=request.user,
            action=action,
            ancienne_valeur=old_value,
            nouvelle_valeur=new_value,
        )
