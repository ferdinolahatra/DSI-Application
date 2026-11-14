
import unicodedata

from django.db.models import Avg, Count
from django.db.models.functions import TruncMonth, Lower, Trim
from django.utils import timezone

from accounts.models import User
from tickets.models import Ticket
from interventions.models import Intervention


# ============================================================
# NORMALISATION DES TEXTES
# ============================================================

def normalize_text(value):
    value = str(value or "").strip().lower()

    return "".join(
        character
        for character in unicodedata.normalize("NFD", value)
        if unicodedata.category(character) != "Mn"
    )


# ============================================================
# IDENTIFICATION DES UTILISATEURS
# ============================================================

def is_admin_user(user):
    return (
        user.is_superuser
        or user.role == User.Role.ADMIN
    )


def is_technician_user(user):
    return normalize_text(user.fonction) == "technicien dsi"


# ============================================================
# ÉVOLUTION DES TICKETS SUR LES SIX DERNIERS MOIS
# ============================================================

def get_evolution_tickets(tickets):
    aujourd_hui = timezone.localdate()

    index_mois_courant = (
        aujourd_hui.year * 12
        + aujourd_hui.month
        - 1
    )

    mois_demandes = []

    for decalage in range(5, -1, -1):
        index_mois = index_mois_courant - decalage

        annee = index_mois // 12
        mois = index_mois % 12 + 1

        mois_demandes.append(
            f"{annee:04d}-{mois:02d}"
        )

    index_debut = index_mois_courant - 5

    annee_debut = index_debut // 12
    mois_debut = index_debut % 12 + 1

    from datetime import date

    date_debut = date(
        annee_debut,
        mois_debut,
        1,
    )

    lignes = (
        tickets
        .filter(
            date_creation__date__gte=date_debut,
        )
        .annotate(
            mois=TruncMonth("date_creation"),
        )
        .values("mois")
        .annotate(
            total=Count("id"),
        )
        .order_by("mois")
    )

    totaux_par_mois = {
        ligne["mois"].strftime("%Y-%m"): ligne["total"]
        for ligne in lignes
        if ligne["mois"] is not None
    }

    return [
        {
            "mois": mois,
            "total": totaux_par_mois.get(mois, 0),
        }
        for mois in mois_demandes
    ]


# ============================================================
# TABLEAU DE BORD SIMPLIFIÉ PAR SERVICE
# ============================================================

def get_service_dashboard_statistics(user):
    service = str(user.service or "").strip()

    if not service:
        return {
            "mode": "service",
            "service": "",
            "total_tickets": 0,
            "en_cours": 0,
            "resolus": 0,
        }

    tickets = (
        Ticket.objects
        .annotate(
            service_normalise=Trim(Lower("service"))
        )
        .filter(
            service_normalise=service.lower()
        )
    )

    return {
        "mode": "service",
        "service": service,
        "total_tickets": tickets.count(),
        "en_cours": tickets.filter(
            statut=Ticket.Status.EN_COURS
        ).count(),
        "resolus": tickets.filter(
            statut__in=[
                Ticket.Status.RESOLUE,
                Ticket.Status.CLOTUREE,
            ]
        ).count(),
    }


# ============================================================
# STATISTIQUES COMPLÈTES DU TABLEAU DE BORD DSI
# ============================================================

def get_dashboard_statistics(user=None):

    tickets = Ticket.objects.all()
    interventions = Intervention.objects.all()

    # --------------------------------------------------------
    # VÉRIFICATION DU COMPTE
    # --------------------------------------------------------

    if user is not None:

        if not (
            user.is_authenticated
            and user.is_active
            and user.compte_actif
        ):
            tickets = Ticket.objects.none()
            interventions = Intervention.objects.none()

            return {
                "mode": "service",
                "service": "",
                "total_tickets": 0,
                "en_cours": 0,
                "resolus": 0,
            }

        # ----------------------------------------------------
        # ADMINISTRATEUR : ACCÈS COMPLET
        # ----------------------------------------------------

        if is_admin_user(user):
            pass

        # ----------------------------------------------------
        # TECHNICIEN DSI : ACCÈS AU DASHBOARD COMPLET
        # ----------------------------------------------------

        elif is_technician_user(user):

            tickets = tickets.filter(
                technicien=user,
            )

            interventions = interventions.filter(
                technicien=user,
                ticket__technicien=user,
            )

        # ----------------------------------------------------
        # AUTRES UTILISATEURS : FILTRAGE PAR SERVICE
        # ----------------------------------------------------

        else:
            return get_service_dashboard_statistics(user)

    # --------------------------------------------------------
    # TOTAL DES TICKETS
    # --------------------------------------------------------

    total_tickets = tickets.count()

    # --------------------------------------------------------
    # TICKETS PAR STATUT
    # --------------------------------------------------------

    nouveaux = tickets.filter(
        statut=Ticket.Status.NOUVELLE,
    ).count()

    en_attente = tickets.filter(
        statut=Ticket.Status.EN_ATTENTE,
    ).count()

    en_cours = tickets.filter(
        statut=Ticket.Status.EN_COURS,
    ).count()

    resolus = tickets.filter(
        statut=Ticket.Status.RESOLUE,
    ).count()

    clotures = tickets.filter(
        statut=Ticket.Status.CLOTUREE,
    ).count()

    # --------------------------------------------------------
    # TICKETS URGENTS
    # --------------------------------------------------------

    urgents = tickets.filter(
        priorite__in=[
            Ticket.Priority.URGENTE,
            Ticket.Priority.TRES_URGENTE,
        ],
    ).count()

    # --------------------------------------------------------
    # TICKETS PAR CATÉGORIE
    # --------------------------------------------------------

    tickets_par_categorie = list(
        tickets
        .values("categorie")
        .annotate(total=Count("id"))
        .order_by("-total")
    )

    # --------------------------------------------------------
    # TICKETS PAR PRIORITÉ
    # --------------------------------------------------------

    tickets_par_priorite = list(
        tickets
        .values("priorite")
        .annotate(total=Count("id"))
        .order_by("-total")
    )

    # --------------------------------------------------------
    # TICKETS PAR STATUT
    # --------------------------------------------------------

    tickets_par_statut = list(
        tickets
        .values("statut")
        .annotate(total=Count("id"))
        .order_by("-total")
    )

    # --------------------------------------------------------
    # TICKETS PAR SERVICE
    # --------------------------------------------------------

    tickets_par_service = list(
        tickets
        .values("service")
        .annotate(total=Count("id"))
        .order_by("-total")
    )

    # --------------------------------------------------------
    # TICKETS PAR TECHNICIEN
    # --------------------------------------------------------

    tickets_par_technicien = list(
        tickets
        .filter(technicien__isnull=False)
        .values(
            "technicien__id",
            "technicien__username",
        )
        .annotate(total=Count("id"))
        .order_by("-total")
    )

    # --------------------------------------------------------
    # STATISTIQUES DES INTERVENTIONS
    # --------------------------------------------------------

    total_interventions = interventions.count()

    duree_moyenne_intervention = (
        interventions.aggregate(
            moyenne=Avg("duree"),
        )["moyenne"]
    )

    # --------------------------------------------------------
    # ÉVOLUTION DES TICKETS
    # --------------------------------------------------------

    evolution_tickets = get_evolution_tickets(tickets)

    # --------------------------------------------------------
    # RÉSULTAT COMPLET
    # --------------------------------------------------------

    return {
        "mode": "complet",

        "total_tickets": total_tickets,

        "nouveaux": nouveaux,
        "en_attente": en_attente,
        "en_cours": en_cours,
        "resolus": resolus,
        "clotures": clotures,

        "urgents": urgents,

        "total_interventions": total_interventions,

        "duree_moyenne_intervention": (
            duree_moyenne_intervention
        ),

        "tickets_par_categorie": tickets_par_categorie,

        "tickets_par_priorite": tickets_par_priorite,

        "tickets_par_statut": tickets_par_statut,

        "tickets_par_service": tickets_par_service,

        "tickets_par_technicien": tickets_par_technicien,

        "evolution_tickets": evolution_tickets,
    }
