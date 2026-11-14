
from django.contrib import admin
from django.utils import timezone
from django.db.models import Q
from django.contrib.auth import get_user_model

from .models import Ticket, TicketComment, TicketHistory

User = get_user_model()


# ============================================================
# FONCTIONS COMMUNES DE GESTION DES RÔLES
# ============================================================

def get_role(user):
    return str(getattr(user, "role", "") or "").upper()


def is_dsi_admin(user):
    return user.is_superuser or get_role(user) == "ADMIN"


def has_supported_role(user):
    return is_dsi_admin(user) or get_role(user) in {
        "TECHNICIEN",
        "AGENT",
    }


def visible_tickets_for(user):
    """
    Détermine les tickets visibles selon le rôle.
    ADMIN      : tous les tickets
    TECHNICIEN : tickets qui lui sont assignés
    AGENT      : tickets dont il est le demandeur
    """
    queryset = Ticket.objects.all()

    if is_dsi_admin(user):
        return queryset

    role = get_role(user)

    if role == "TECHNICIEN":
        return queryset.filter(technicien=user)

    if role == "AGENT":
        return queryset.filter(demandeur=user)

    return queryset.none()


# ============================================================
# ADMINISTRATION DES TICKETS
# ============================================================

@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):

    list_display = (
        "numero",
        "objet",
        "demandeur",
        "technicien",
        "categorie",
        "priorite",
        "statut",
        "date_creation",
        "date_resolution",
    )

    list_display_links = ("numero", "objet")

    list_filter = (
        "statut",
        "priorite",
        "categorie",
        "service",
        "date_creation",
    )

    search_fields = (
        "numero",
        "objet",
        "description",
        "demandeur__username",
        "demandeur__first_name",
        "demandeur__last_name",
        "demandeur__email",
        "technicien__username",
        "technicien__first_name",
        "technicien__last_name",
    )

    readonly_fields = (
        "numero",
        "date_creation",
        "date_modification",
    )

    ordering = ("-date_creation",)
    date_hierarchy = "date_creation"
    list_per_page = 25
    list_select_related = ("demandeur", "technicien")

    admin_fields = (
        "numero",
        "demandeur",
        "service",
        "categorie",
        "priorite",
        "objet",
        "description",
        "technicien",
        "statut",
        "date_creation",
        "date_resolution",
        "date_modification",
    )

    technician_readonly_fields = (
        "numero",
        "demandeur",
        "service",
        "categorie",
        "priorite",
        "objet",
        "description",
        "technicien",
        "date_creation",
        "date_modification",
    )

    agent_readonly_fields = (
        "numero",
        "demandeur",
        "technicien",
        "statut",
        "date_creation",
        "date_resolution",
        "date_modification",
    )

    def has_module_permission(self, request):
        return has_supported_role(request.user)

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .filter(
                pk__in=visible_tickets_for(
                    request.user
                ).values("pk")
            )
            .select_related("demandeur", "technicien")
        )

    def has_view_permission(self, request, obj=None):
        if not has_supported_role(request.user):
            return False

        if obj is None:
            return True

        return visible_tickets_for(
            request.user
        ).filter(pk=obj.pk).exists()

    def has_add_permission(self, request):
        return (
            is_dsi_admin(request.user)
            or get_role(request.user) == "AGENT"
        )

    def has_change_permission(self, request, obj=None):
        user = request.user
        role = get_role(user)

        if is_dsi_admin(user):
            return True

        if obj is None:
            return role in {"TECHNICIEN", "AGENT"}

        if role == "TECHNICIEN":
            return obj.technicien_id == user.pk

        if role == "AGENT":
            return (
                obj.demandeur_id == user.pk
                and obj.statut not in {
                    Ticket.Status.RESOLUE,
                    Ticket.Status.CLOTUREE,
                }
            )

        return False

    def has_delete_permission(self, request, obj=None):
        return is_dsi_admin(request.user)

    def get_fields(self, request, obj=None):
        user = request.user
        role = get_role(user)

        if is_dsi_admin(user):
            return self.admin_fields

        if role == "TECHNICIEN":
            return self.admin_fields

        if role == "AGENT":
            if obj is None:
                return (
                    "service",
                    "categorie",
                    "priorite",
                    "objet",
                    "description",
                )

            return self.admin_fields

        return self.admin_fields

    def get_readonly_fields(self, request, obj=None):
        user = request.user
        role = get_role(user)

        if is_dsi_admin(user):
            return self.readonly_fields

        if role == "TECHNICIEN":
            return self.technician_readonly_fields

        if role == "AGENT":
            if obj is None:
                return (
                    "numero",
                    "demandeur",
                    "technicien",
                    "statut",
                    "date_creation",
                    "date_resolution",
                    "date_modification",
                )

            return self.agent_readonly_fields

        return self.admin_fields

    def formfield_for_foreignkey(
        self, db_field, request, **kwargs
    ):
        if db_field.name == "technicien":
            kwargs["queryset"] = User.objects.filter(
                role="TECHNICIEN",
                is_active=True,
                compte_actif=True,
            ).order_by(
                "last_name",
                "first_name",
                "username",
            )

        return super().formfield_for_foreignkey(
            db_field, request, **kwargs
        )

    def save_model(self, request, obj, form, change):
        role = get_role(request.user)
        previous = None

        if change:
            previous = (
                Ticket.objects
                .filter(pk=obj.pk)
                .values(
                    "statut",
                    "technicien_id",
                    "priorite",
                    "categorie",
                    "objet",
                    "description",
                )
                .first()
            )

        if role == "AGENT" and not is_dsi_admin(request.user):
            if not change:
                obj.demandeur = request.user
                obj.statut = Ticket.Status.NOUVELLE
                obj.technicien = None
                obj.date_resolution = None

        if (
            role == "TECHNICIEN"
            and not is_dsi_admin(request.user)
        ):
            obj.technicien = request.user

        if obj.statut in {
            Ticket.Status.RESOLUE,
            Ticket.Status.CLOTUREE,
        }:
            if not obj.date_resolution:
                obj.date_resolution = timezone.now()
        else:
            obj.date_resolution = None

        super().save_model(request, obj, form, change)

        tracked_fields = (
            "statut",
            "technicien_id",
            "priorite",
            "categorie",
            "objet",
            "description",
        )

        if previous is None:
            TicketHistory.objects.create(
                ticket=obj,
                utilisateur=request.user,
                action="CREATION_TICKET_ADMIN",
                ancienne_valeur="",
                nouvelle_valeur=f"{obj.numero} - {obj.objet}",
            )
            return

        current = {
            field: getattr(obj, field)
            for field in tracked_fields
        }

        changed_fields = [
            field
            for field in tracked_fields
            if previous.get(field) != current.get(field)
        ]

        if changed_fields:
            TicketHistory.objects.create(
                ticket=obj,
                utilisateur=request.user,
                action="MODIFICATION_TICKET_ADMIN",
                ancienne_valeur="; ".join(
                    f"{field}={previous.get(field)}"
                    for field in changed_fields
                ),
                nouvelle_valeur="; ".join(
                    f"{field}={current.get(field)}"
                    for field in changed_fields
                ),
            )


# ============================================================
# ADMINISTRATION DES COMMENTAIRES
# ============================================================

@admin.register(TicketComment)
class TicketCommentAdmin(admin.ModelAdmin):

    list_display = (
        "ticket",
        "auteur",
        "date_creation",
    )

    list_display_links = ("ticket",)

    search_fields = (
        "ticket__numero",
        "ticket__objet",
        "auteur__username",
        "contenu",
    )

    readonly_fields = (
        "auteur",
        "date_creation",
    )

    ordering = ("-date_creation",)
    date_hierarchy = "date_creation"
    list_per_page = 25

    def has_module_permission(self, request):
        return has_supported_role(request.user)

    def get_queryset(self, request):
        visible_ids = visible_tickets_for(
            request.user
        ).values("pk")

        return (
            super()
            .get_queryset(request)
            .filter(ticket_id__in=visible_ids)
            .select_related("ticket", "auteur")
        )

    def has_view_permission(self, request, obj=None):
        if not has_supported_role(request.user):
            return False

        if obj is None:
            return True

        return visible_tickets_for(
            request.user
        ).filter(pk=obj.ticket_id).exists()

    def has_add_permission(self, request):
        return has_supported_role(request.user)

    def has_change_permission(self, request, obj=None):
        # Les commentaires existants ne sont pas modifiables
        # par les techniciens et les agents.
        if is_dsi_admin(request.user):
            return True

        return False

    def has_delete_permission(self, request, obj=None):
        return is_dsi_admin(request.user)

    # CETTE MÉTHODE EST AU BON ENDROIT :
    # à l'intérieur de TicketCommentAdmin.
    def get_readonly_fields(self, request, obj=None):
        if is_dsi_admin(request.user):
            return ("auteur", "date_creation")

        if obj is None:
            # Lors de la création, le ticket et le contenu
            # sont saisissables.
            return ("auteur", "date_creation")

        # Un commentaire existant ne peut plus être modifié
        # par les utilisateurs non administrateurs.
        return (
            "ticket",
            "auteur",
            "contenu",
            "date_creation",
        )

    def formfield_for_foreignkey(
        self, db_field, request, **kwargs
    ):
        if db_field.name == "ticket":
            kwargs["queryset"] = visible_tickets_for(
                request.user
            )

        return super().formfield_for_foreignkey(
            db_field, request, **kwargs
        )

    def save_model(self, request, obj, form, change):
        if not change:
            obj.auteur = request.user

        super().save_model(request, obj, form, change)


# ============================================================
# HISTORIQUE DES TICKETS — LECTURE SEULE
# ============================================================

@admin.register(TicketHistory)
class TicketHistoryAdmin(admin.ModelAdmin):

    list_display = (
        "ticket",
        "utilisateur",
        "action",
        "date_creation",
    )

    list_filter = (
        "action",
        "date_creation",
    )

    search_fields = (
        "ticket__numero",
        "ticket__objet",
        "utilisateur__username",
        "action",
        "ancienne_valeur",
        "nouvelle_valeur",
    )

    readonly_fields = (
        "ticket",
        "utilisateur",
        "action",
        "ancienne_valeur",
        "nouvelle_valeur",
        "date_creation",
    )

    ordering = ("-date_creation",)
    date_hierarchy = "date_creation"
    list_per_page = 30

    def has_module_permission(self, request):
        return has_supported_role(request.user)

    def get_queryset(self, request):
        visible_ids = visible_tickets_for(
            request.user
        ).values("pk")

        return (
            super()
            .get_queryset(request)
            .filter(ticket_id__in=visible_ids)
            .select_related("ticket", "utilisateur")
        )

    def has_view_permission(self, request, obj=None):
        if not has_supported_role(request.user):
            return False

        if obj is None:
            return True

        return visible_tickets_for(
            request.user
        ).filter(pk=obj.ticket_id).exists()

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
