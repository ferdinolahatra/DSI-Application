
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Ticket,
  Plus,
  Search,
  RefreshCw,
  Clock3,
  CheckCircle2,
  AlertCircle,
  UserRound,
  Wrench,
  CalendarDays,
  Send,
  FileText,
} from "lucide-react";

import api from "../../services/api";
import "./TicketWorkspace.css";

/* =====================================================
   CONSTANTES
===================================================== */

const CATEGORIES = [
  { value: "MATERIEL", label: "Matériel" },
  { value: "LOGICIEL", label: "Logiciel" },
  { value: "RESEAU", label: "Réseau" },
  { value: "ACCES", label: "Accès système" },
  { value: "AUTRE", label: "Autre" },
];

const PRIORITIES = [
  { value: "FAIBLE", label: "Faible" },
  { value: "MOYENNE", label: "MOYEN" },
  { value: "URGENTE", label: "URGENT" },
  { value: "TRES_URGENTE", label: "TRÈS URGENT" },
];

const STATUSES = [
  { value: "NOUVELLE", label: "Nouvelle" },
  { value: "EN_ATTENTE", label: "En attente" },
  { value: "EN_COURS", label: "En cours" },
  { value: "RESOLUE", label: "Résolue" },
  { value: "CLOTUREE", label: "Clôturée" },
];

const MATERIELS = [
  {
    value: "BUREAU",
    label: "Ordinateur de bureau",
    problems: [
      "Problème d'alimentation",
      "Câble d'alimentation défectueux",
      "Ordinateur ne démarre pas",
      "Écran noir",
      "Écran défectueux",
      "Clavier défectueux",
      "Souris défectueuse",
      "Unité centrale défectueuse",
      "Problème de son",
      "Problème de connexion réseau",
      "Port USB défectueux",
      "Ordinateur lent",
      "Problème de périphérique",
      "Autre problème matériel",
    ],
  },
  {
    value: "PORTABLE",
    label: "Ordinateur portable",
    problems: [
      "Batterie ne charge pas",
      "Batterie se décharge rapidement",
      "Chargeur défectueux",
      "Problème de connecteur de charge",
      "Écran cassé ou défectueux",
      "Clavier défectueux",
      "Pavé tactile défectueux",
      "Ordinateur ne démarre pas",
      "Surchauffe de l'ordinateur",
      "Ventilateur bruyant",
      "Problème de connexion Wi-Fi",
      "Caméra non fonctionnelle",
      "Problème de son",
      "Ordinateur lent",
      "Autre problème matériel",
    ],
  },
  {
    value: "TELEPHONE",
    label: "Téléphone",
    problems: [
      "Problème de configuration",
      "Téléphone se décharge rapidement",
      "Problème de chargement",
      "Batterie défectueuse",
      "Écran cassé ou défectueux",
      "Problème de réseau ou de signal",
      "Impossible de passer des appels",
      "Impossible de recevoir des appels",
      "Problème de SMS",
      "Application non fonctionnelle",
      "Problème de son ou de haut-parleur",
      "Téléphone bloqué",
      "Téléphone ne démarre pas",
      "Autre problème de téléphone",
    ],
  },
];

const CATEGORY_PROBLEMS = {
  RESEAU: [
    "Absence de connexion Internet",
    "Connexion Wi-Fi indisponible",
    "Signal Wi-Fi faible",
    "Câble RJ45 défectueux",
    "Prise réseau défectueuse",
    "Problème de configuration IP",
    "Problème DNS",
    "Routeur défectueux",
    "Switch réseau défectueux",
    "Connexion réseau instable",
    "Partage réseau inaccessible",
    "Autre problème réseau",
  ],
  LOGICIEL: [
    "Installation d'un logiciel",
    "Logiciel ne démarre pas",
    "Logiciel bloqué",
    "Erreur lors de l'utilisation",
    "Problème de licence",
    "Problème de mise à jour",
    "Logiciel trop lent",
    "Problème de compatibilité",
    "Application ne répond pas",
    "Logiciel à réinstaller",
    "Autre problème logiciel",
  ],
  ACCES: [
    "Mot de passe oublié",
    "Compte utilisateur bloqué",
    "Impossible de se connecter",
    "Accès refusé",
    "Problème d'autorisation",
    "Création d'un accès utilisateur",
    "Modification des droits d'accès",
    "Problème d'accès aux dossiers partagés",
    "Problème d'accès à une application",
    "Problème VPN",
    "Autre problème d'accès",
  ],
  AUTRE: [
    "Autre problème informatique",
    "Demande d'assistance générale",
    "Demande de configuration",
    "Autre demande",
  ],
};

const EMPTY_FORM = {
  categorie: "MATERIEL",
  typeMateriel: "",
  probleme: "",
  objet: "",
  description: "",
};

const PROCESSING_MESSAGE =
  "Seuls l'administrateur et le Technicien DSI peuvent traiter les tickets.";

/* =====================================================
   FONCTIONS UTILITAIRES
===================================================== */

function readTickets(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.tickets)) return data.tickets;
  return [];
}

function getLabel(options, value) {
  return (
    options.find((option) => option.value === value)?.label ||
    String(value || "Non renseigné").replaceAll("_", " ")
  );
}

function getErrorMessage(error) {
  const status = error?.response?.status;
  const data = error?.response?.data;

  if (status === 401) {
    return "Votre session a expiré. Reconnectez-vous.";
  }

  if (status === 403) {
    return data?.detail || PROCESSING_MESSAGE;
  }

  if (status === 404) {
    return "La route ou le ticket demandé est introuvable.";
  }

  if (typeof data?.detail === "string") {
    return data.detail;
  }

  if (data && typeof data === "object") {
    return Object.entries(data)
      .map(([field, messages]) => {
        const message = Array.isArray(messages)
          ? messages.join(" ")
          : typeof messages === "string"
            ? messages
            : JSON.stringify(messages);

        return `${field} : ${message}`;
      })
      .join(" | ");
  }

  return "Impossible de contacter Django. Vérifiez le serveur et réessayez.";
}

function getPersonName(person, fallback = "") {
  if (person == null || person === "") {
    return fallback || "Non assigné";
  }

  if (typeof person === "string" || typeof person === "number") {
    return String(person);
  }

  const fullName = [
    person.first_name || person.prenom,
    person.last_name || person.nom,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    person.full_name ||
    person.nom_complet ||
    fullName ||
    person.username ||
    person.identifiant ||
    fallback ||
    "Non renseigné"
  );
}

function getTicketNumber(ticket) {
  return (
    ticket.numero ||
    ticket.numero_ticket ||
    (ticket.id != null
      ? `DSI-${String(ticket.id).padStart(5, "0")}`
      : "Ticket")
  );
}

function getTicketStatus(ticket) {
  const value = ticket.statut?.value ?? ticket.statut?.code ?? ticket.statut;
  return String(value || "INCONNU").toUpperCase();
}

function getTicketPriority(ticket) {
  const value =
    ticket.priorite?.value ?? ticket.priorite?.code ?? ticket.priorite;
  return String(value || "MOYENNE").toUpperCase();
}

function getTicketTechnician(ticket) {
  return (
    ticket.technicien_username ||
    ticket.technicien_assigne_username ||
    (typeof ticket.technicien === "object"
      ? getPersonName(ticket.technicien)
      : ticket.technicien)
  );
}

function hasTechnician(ticket) {
  const value = ticket.technicien_id ?? ticket.technicien;
  return value !== null && value !== undefined && value !== "";
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function getCurrentUserFromResponse(data) {
  return data?.user ?? data?.data?.user ?? data?.data ?? data;
}

/*
 * IMPORTANT :
 * L'administrateur est reconnu par son rôle ADMIN
 * ou son statut superutilisateur.
 *
 * Le technicien est reconnu uniquement par sa fonction :
 * "Technicien DSI".
 * On ne se base pas sur role == TECHNICIEN.
 */
function isAdministrator(user) {
  const role = normalizeText(user?.role);
  return Boolean(
    user?.is_superuser ||
    user?.isSuperuser ||
    role === "ADMIN" ||
    role === "ADMINISTRATEUR"
  );
}

function isDsiTechnician(user) {
  return normalizeText(user?.fonction) === "TECHNICIEN DSI";
}

function getAutomaticPriority(user) {
  const fonction = normalizeText(user?.fonction);

  const directeurService =
    fonction.includes("DIRECTEUR DE SERVICE") ||
    fonction.includes("DIRECTEUR DU SERVICE") ||
    fonction.includes("DIRECTEUR DES SERVICES") ||
    fonction.includes("DIRECTEUR SERVICE");

  const secretaireGeneral =
    fonction.includes("SECRETAIRE GENERAL") ||
    fonction === "SG";

  if (
    fonction.includes("MINISTRE") ||
    fonction.includes("DIRECTEUR GENERAL") ||
    fonction === "DG" ||
    secretaireGeneral ||
    (fonction.includes("DIRECTEUR") && !directeurService)
  ) {
    return {
      groupe: "PRIORITAIRE",
      value: "TRES_URGENTE",
      label: "TRÈS URGENT",
    };
  }

  if (
    directeurService ||
    (fonction.includes("SECRETAIRE") && !secretaireGeneral)
  ) {
    return {
      groupe: "URGENT",
      value: "URGENTE",
      label: "URGENT",
    };
  }

  return {
    groupe: "MOYEN",
    value: "MOYENNE",
    label: "MOYEN",
  };
}

function getRequesterName(user) {
  const fullName = [user?.first_name, user?.last_name]
    .filter(Boolean)
    .join(" ");

  return fullName || user?.username || user?.identifiant || "Utilisateur connecté";
}

function buildTicketDescription(form, priority) {
  const category = CATEGORIES.find(
    (item) => item.value === form.categorie
  );

  const equipment = MATERIELS.find(
    (item) => item.value === form.typeMateriel
  );

  return [
    "[INFORMATIONS DEMANDE DSI]",
    `Catégorie : ${category?.label || form.categorie}`,
    ...(equipment ? [`Type de matériel : ${equipment.label}`] : []),
    `Problème : ${form.probleme}`,
    `Priorité attribuée : ${priority.groupe}`,
    "",
    "Description complémentaire :",
    form.description.trim(),
  ].join("\n");
}

/* =====================================================
   FORMULAIRE DE CRÉATION
===================================================== */

function TicketCreateForm({ onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [currentUser, setCurrentUser] = useState(() => getStoredUser());
  const [loadingUser, setLoadingUser] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadCurrentUser() {
      setLoadingUser(true);

      try {
        const response = await api.get("/auth/me/");
        const user = getCurrentUserFromResponse(response.data);

        if (user && (user.id != null || user.username)) {
          if (mounted) {
            setCurrentUser(user);
            localStorage.setItem("user", JSON.stringify(user));
          }
        } else if (mounted && !getStoredUser()) {
          setError("Impossible de récupérer votre profil utilisateur.");
        }
      } catch (err) {
        console.error("Chargement du profil connecté :", err);

        if (!getStoredUser() && mounted) {
          setError(getErrorMessage(err));
        }
      } finally {
        if (mounted) setLoadingUser(false);
      }
    }

    loadCurrentUser();

    return () => {
      mounted = false;
    };
  }, []);

  const priorityInfo = currentUser
    ? getAutomaticPriority(currentUser)
    : null;

  const selectedEquipment = MATERIELS.find(
    (item) => item.value === form.typeMateriel
  );

  const availableProblems =
    form.categorie === "MATERIEL"
      ? selectedEquipment?.problems || []
      : CATEGORY_PROBLEMS[form.categorie] || [];

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => {
      const updated = { ...previous, [name]: value };

      if (name === "categorie") {
        updated.typeMateriel = "";
        updated.probleme = "";
      }

      if (name === "typeMateriel") {
        updated.probleme = "";
      }

      return updated;
    });

    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (loadingUser || !currentUser) {
      setError("Votre profil utilisateur n'est pas encore disponible.");
      return;
    }

    if (!String(currentUser.service || "").trim()) {
      setError(
        "Votre service n'est pas renseigné dans votre profil. Contactez l'administrateur DSI."
      );
      return;
    }

    if (form.categorie === "MATERIEL" && !form.typeMateriel) {
      setError("Veuillez sélectionner le type de matériel.");
      return;
    }

    if (!form.probleme) {
      setError("Veuillez sélectionner le problème rencontré.");
      return;
    }

    if (!form.objet.trim()) {
      setError("Veuillez renseigner l'objet de la demande.");
      return;
    }

    if (!form.description.trim()) {
      setError("Veuillez expliquer le problème rencontré.");
      return;
    }

    setSaving(true);

    try {
      const response = await api.post("/tickets/", {
        service: currentUser.service.trim(),
        categorie: form.categorie,
        priorite: priorityInfo.value,
        objet: form.objet.trim(),
        description: buildTicketDescription(form, priorityInfo),
      });

      const ticket = response.data;

      setSuccess(
        `Demande créée avec succès${
          ticket?.numero ? ` : ${ticket.numero}` : ""
        }.`
      );

      setForm({ ...EMPTY_FORM });

      if (typeof onCreated === "function") {
        await onCreated(ticket);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="ticket-workspace-panel">
      <header className="ticket-workspace-panel-header">
        <div className="ticket-workspace-panel-icon">
          <Plus size={21} />
        </div>

        <div>
          <h2>Créer une demande d'assistance</h2>
          <p>
            Décrivez le problème rencontré afin que la DSI puisse le traiter.
          </p>
        </div>
      </header>

      <form className="ticket-workspace-form" onSubmit={handleSubmit}>
        {error && (
          <div className="ticket-workspace-message is-error" role="alert">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="ticket-workspace-message is-success" role="status">
            <CheckCircle2 size={18} />
            <span>{success}</span>
          </div>
        )}

        <div className="ticket-workspace-form-grid">
          <div className="ticket-workspace-field">
            <label htmlFor="workspace-demandeur">Demandeur</label>
            <input
              id="workspace-demandeur"
              type="text"
              value={
                loadingUser
                  ? "Chargement du profil..."
                  : getRequesterName(currentUser)
              }
              readOnly
              disabled
            />
            {currentUser?.fonction && (
              <small>Fonction : {currentUser.fonction}</small>
            )}
          </div>

          <div className="ticket-workspace-field">
            <label htmlFor="workspace-service">Direction / Service</label>
            <input
              id="workspace-service"
              type="text"
              value={currentUser?.service || ""}
              readOnly
              disabled
            />
          </div>

          <div className="ticket-workspace-field">
            <label htmlFor="workspace-priorite">
              Priorité attribuée automatiquement
            </label>
            <input
              id="workspace-priorite"
              type="text"
              value={priorityInfo?.label || "Calcul de la priorité..."}
              readOnly
              disabled
            />
          </div>

          <div className="ticket-workspace-field">
            <label htmlFor="workspace-categorie">Catégorie *</label>
            <select
              id="workspace-categorie"
              name="categorie"
              value={form.categorie}
              onChange={handleChange}
              required
              disabled={saving}
            >
              {CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          {form.categorie === "MATERIEL" && (
            <div className="ticket-workspace-field">
              <label htmlFor="workspace-type-materiel">
                Type de matériel *
              </label>
              <select
                id="workspace-type-materiel"
                name="typeMateriel"
                value={form.typeMateriel}
                onChange={handleChange}
                required
                disabled={saving}
              >
                <option value="">Sélectionner le matériel</option>
                {MATERIELS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {availableProblems.length > 0 && (
            <div className="ticket-workspace-field">
              <label htmlFor="workspace-probleme">
                Problème rencontré *
              </label>
              <select
                id="workspace-probleme"
                name="probleme"
                value={form.probleme}
                onChange={handleChange}
                required
                disabled={
                  saving ||
                  (form.categorie === "MATERIEL" && !form.typeMateriel)
                }
              >
                <option value="">Sélectionner le problème</option>
                {availableProblems.map((problem) => (
                  <option key={problem} value={problem}>
                    {problem}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="ticket-workspace-field ticket-workspace-field-full">
            <label htmlFor="workspace-objet">Objet de la demande *</label>
            <input
              id="workspace-objet"
              name="objet"
              type="text"
              maxLength={255}
              value={form.objet}
              onChange={handleChange}
              placeholder="Résumez le problème en une phrase"
              required
              disabled={saving}
            />
          </div>

          <div className="ticket-workspace-field ticket-workspace-field-full">
            <label htmlFor="workspace-description">
              Description détaillée *
            </label>
            <textarea
              id="workspace-description"
              name="description"
              rows={5}
              value={form.description}
              onChange={handleChange}
              placeholder="Expliquez le problème, les circonstances et les éventuels messages d'erreur."
              required
              disabled={saving}
            />
          </div>
        </div>

        <p className="ticket-workspace-note">
          Le demandeur, le service et la priorité sont déterminés
          automatiquement à partir de votre compte. Le numéro et le statut
          initial restent gérés par Django.
        </p>

        <footer className="ticket-workspace-form-actions">
          <button
            type="button"
            className="ticket-workspace-button secondary"
            onClick={() => {
              setForm({ ...EMPTY_FORM });
              setError("");
              setSuccess("");
            }}
            disabled={saving}
          >
            Réinitialiser
          </button>

          <button
            type="submit"
            className="ticket-workspace-button primary"
            disabled={saving || loadingUser || !currentUser}
          >
            {saving ? (
              <RefreshCw size={17} className="ticket-workspace-spin" />
            ) : (
              <Send size={17} />
            )}
            {saving ? "Envoi..." : "Envoyer la demande"}
          </button>
        </footer>
      </form>
    </section>
  );
}

/* =====================================================
   PAGE PRINCIPALE
===================================================== */

export default function TicketWorkspace({ mode = "mine" }) {
  const navigate = useNavigate();

  const [tickets, setTickets] = useState([]);
  const [currentUser, setCurrentUser] = useState(() => getStoredUser());
  const [loadingUser, setLoadingUser] = useState(true);
  const [loading, setLoading] = useState(mode !== "create");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("TOUS");
  const [priorityFilter, setPriorityFilter] = useState("TOUTES");
  const [busyId, setBusyId] = useState(null);

  const isCreateMode = mode === "create";

  const administrator = isAdministrator(currentUser);
  const technician = isDsiTechnician(currentUser);
  const canProcessTickets = administrator || technician;

  /* Récupérer le profil connecté */
  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      try {
        const response = await api.get("/auth/me/");
        const user = getCurrentUserFromResponse(response.data);

        if (user && (user.id != null || user.username) && mounted) {
          setCurrentUser(user);
          localStorage.setItem("user", JSON.stringify(user));
        }
      } catch (err) {
        console.error("Récupération du profil :", err);
      } finally {
        if (mounted) setLoadingUser(false);
      }
    }

    loadUser();

    return () => {
      mounted = false;
    };
  }, []);

  /* Django applique le filtrage selon l'utilisateur connecté :
     administrateur = tous les tickets
     technicien = tickets disponibles et tickets qui lui sont affectés
     autre utilisateur = ses propres tickets
  */
  const loadTickets = useCallback(async () => {
    if (isCreateMode) return;

    setLoading(true);
    setError("");

    try {
      const response = await api.get("/tickets/");
      setTickets(readTickets(response.data));
    } catch (err) {
      setTickets([]);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [isCreateMode]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const filteredTickets = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tickets.filter((ticket) => {
      const status = getTicketStatus(ticket);
      const priority = getTicketPriority(ticket);

      const matchesSearch =
        !query ||
        [
          getTicketNumber(ticket),
          ticket.objet,
          ticket.description,
          ticket.service,
          ticket.demandeur_username,
          ticket.technicien_username,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      const matchesStatus =
        statusFilter === "TOUS" || status === statusFilter;

      const matchesPriority =
        priorityFilter === "TOUTES" || priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tickets, search, statusFilter, priorityFilter]);

  const counts = useMemo(
    () => ({
      total: tickets.length,
      attente: tickets.filter((item) =>
        ["NOUVELLE", "NOUVEAU", "EN_ATTENTE"].includes(
          getTicketStatus(item)
        )
      ).length,
      enCours: tickets.filter(
        (item) => getTicketStatus(item) === "EN_COURS"
      ).length,
      termines: tickets.filter((item) =>
        ["RESOLUE", "RESOLU", "CLOTUREE", "CLOTURE"].includes(
          getTicketStatus(item)
        )
      ).length,
    }),
    [tickets]
  );

  async function takeTicket(ticket) {
    if (!canProcessTickets) {
      setNotice(PROCESSING_MESSAGE);
      return;
    }

    setBusyId(ticket.id);
    setError("");
    setNotice("");

    try {
      await api.post(`/tickets/${ticket.id}/prendre-en-charge/`);

      setNotice(
        `Le ticket ${getTicketNumber(ticket)} a été pris en charge.`
      );

      await loadTickets();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function updateStatus(ticket, newStatus) {
    if (!canProcessTickets) {
      setNotice(PROCESSING_MESSAGE);
      return;
    }

    if (newStatus === getTicketStatus(ticket)) return;

    setBusyId(ticket.id);
    setError("");
    setNotice("");

    try {
      await api.patch(`/tickets/${ticket.id}/statut/`, {
        statut: newStatus,
      });

      setNotice(
        `Le statut du ticket ${getTicketNumber(ticket)} a été modifié.`
      );

      await loadTickets();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  const title = isCreateMode
    ? "Nouvelle demande"
    : administrator
      ? "Tous les tickets"
      : technician
        ? "Gestion des tickets"
        : "Mes tickets";

  const subtitle = isCreateMode
    ? "Transmettez une demande d'assistance à la DSI."
    : administrator
      ? "Consultez et gérez toutes les demandes adressées à la DSI."
      : technician
        ? "Consultez les demandes disponibles et celles qui vous sont attribuées."
        : "Consultez les demandes que vous avez envoyées et leur avancement.";

  return (
    <main className="ticket-workspace">
      <header className="ticket-workspace-header">
        <div className="ticket-workspace-heading">
          <span className="ticket-workspace-heading-icon">
            <Ticket size={25} />
          </span>

          <div>
            <span className="ticket-workspace-eyebrow">
              SUPPORT INFORMATIQUE DSI
            </span>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
        </div>

        {!isCreateMode && (
          <div className="ticket-workspace-header-actions">
            <button
              type="button"
              className="ticket-workspace-button primary"
              onClick={() => navigate("/tickets/nouveau")}
            >
              <Plus size={17} />
              Nouvelle demande
            </button>

            <button
              type="button"
              className="ticket-workspace-button secondary"
              onClick={loadTickets}
              disabled={loading}
            >
              <RefreshCw size={16} />
              Actualiser
            </button>
          </div>
        )}
      </header>

      {error && (
        <div className="ticket-workspace-message is-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
      )}

      {notice && (
        <div className="ticket-workspace-message is-success" role="status">
          <CheckCircle2 size={18} />
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
      )}

      {isCreateMode ? (
        <TicketCreateForm
          onCreated={async () => {
            setError("");
          }}
        />
      ) : (
        <>
          <section className="ticket-workspace-stats">
            <article>
              <span><Ticket size={18} /></span>
              <div>
                <small>Total des tickets</small>
                <strong>{loading ? "…" : counts.total}</strong>
              </div>
            </article>

            <article>
              <span className="ticket-workspace-stat-amber">
                <Clock3 size={18} />
              </span>
              <div>
                <small>En attente</small>
                <strong>{loading ? "…" : counts.attente}</strong>
              </div>
            </article>

            <article>
              <span className="ticket-workspace-stat-blue">
                <Wrench size={18} />
              </span>
              <div>
                <small>En cours</small>
                <strong>{loading ? "…" : counts.enCours}</strong>
              </div>
            </article>

            <article>
              <span className="ticket-workspace-stat-green">
                <CheckCircle2 size={18} />
              </span>
              <div>
                <small>Terminés</small>
                <strong>{loading ? "…" : counts.termines}</strong>
              </div>
            </article>
          </section>

          <section className="ticket-workspace-list-panel">
            <header className="ticket-workspace-list-header">
              <div>
                <h2>
                  {administrator
                    ? "Liste de tous les tickets"
                    : technician
                      ? "Tickets disponibles et attribués"
                      : "Historique de mes demandes"}
                </h2>
                <p>
                  {loading
                    ? "Chargement..."
                    : `${filteredTickets.length} résultat(s)`}
                </p>
              </div>
            </header>

            <div className="ticket-workspace-filters">
              <label className="ticket-workspace-search">
                <Search size={17} />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Rechercher un ticket..."
                />
              </label>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filtrer par statut"
              >
                <option value="TOUS">Tous les statuts</option>
                {STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>

              <select
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value)}
                aria-label="Filtrer par priorité"
              >
                <option value="TOUTES">Toutes les priorités</option>
                {PRIORITIES.map((priority) => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </select>
            </div>

            {!loading && !canProcessTickets && !loadingUser && (
              <div className="ticket-workspace-message is-info" role="status">
                <AlertCircle size={18} />
                <span>{PROCESSING_MESSAGE}</span>
              </div>
            )}

            {loading ? (
              <div className="ticket-workspace-empty">
                <RefreshCw
                  size={22}
                  className="ticket-workspace-spin"
                />
                <p>Chargement des tickets...</p>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="ticket-workspace-empty">
                <FileText size={34} />
                <h3>Aucun ticket trouvé</h3>
                <p>
                  {tickets.length === 0
                    ? "Aucune demande n'est actuellement disponible pour votre compte."
                    : "Aucun résultat ne correspond aux filtres sélectionnés."}
                </p>
              </div>
            ) : (
              <div className="ticket-workspace-list">
                {filteredTickets.map((ticket) => {
                  const status = getTicketStatus(ticket);
                  const priority = getTicketPriority(ticket);
                  const assigned = hasTechnician(ticket);
                  const isBusy = busyId === ticket.id;

                  const requester =
                    ticket.demandeur_username ||
                    getPersonName(ticket.demandeur);

                  const technicianName =
                    getTicketTechnician(ticket) || "Non assigné";

                  return (
                    <article
                      className="ticket-workspace-card"
                      key={ticket.id}
                    >
                      <div className="ticket-workspace-card-main">
                        <div className="ticket-workspace-card-icon">
                          <Ticket size={21} />
                        </div>

                        <div className="ticket-workspace-card-body">
                          <div className="ticket-workspace-card-badges">
                            <span className="ticket-workspace-number">
                              {getTicketNumber(ticket)}
                            </span>

                            <span
                              className={`ticket-workspace-status status-${status.toLowerCase()}`}
                            >
                              {getLabel(STATUSES, status)}
                            </span>

                            <span
                              className={`ticket-workspace-priority priority-${priority.toLowerCase()}`}
                            >
                              {getLabel(PRIORITIES, priority)}
                            </span>
                          </div>

                          <h3>{ticket.objet || "Demande sans objet"}</h3>

                          <p
                            className="ticket-workspace-description"
                            style={{ whiteSpace: "pre-line" }}
                          >
                            {ticket.description ||
                              "Aucune description disponible."}
                          </p>

                          <div className="ticket-workspace-meta">
                            <span>
                              <UserRound size={14} />
                              {requester}
                            </span>

                            <span>
                              <Wrench size={14} />
                              {technicianName}
                            </span>

                            <span>
                              <CalendarDays size={14} />
                              {formatDate(ticket.date_creation)}
                            </span>
                          </div>

                          <div className="ticket-workspace-category">
                            {getLabel(CATEGORIES, ticket.categorie)}
                            {ticket.service ? ` · ${ticket.service}` : ""}
                          </div>
                        </div>
                      </div>

                      <div className="ticket-workspace-card-actions">
                        {!canProcessTickets ? (
                          <button
                            type="button"
                            className="ticket-workspace-button secondary"
                            disabled
                            title={PROCESSING_MESSAGE}
                          >
                            <Wrench size={16} />
                            Traitement réservé
                          </button>
                        ) : !assigned ? (
                          <button
                            type="button"
                            className="ticket-workspace-button primary"
                            onClick={() => takeTicket(ticket)}
                            disabled={isBusy}
                          >
                            <Wrench size={16} />
                            {isBusy
                              ? "Traitement..."
                              : "Prendre en charge"}
                          </button>
                        ) : (
                          <label className="ticket-workspace-status-control">
                            <span>Modifier le statut</span>
                            <select
                              value={status}
                              onChange={(event) =>
                                updateStatus(ticket, event.target.value)
                              }
                              disabled={isBusy}
                            >
                              {STATUSES.map((item) => (
                                <option key={item.value} value={item.value}>
                                  {item.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
