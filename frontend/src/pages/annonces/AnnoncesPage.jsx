
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BellRing,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Edit3,
  Eye,
  EyeOff,
  Info,
  Megaphone,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
  Wrench,
  X,
} from "lucide-react";

import api from "../../services/api";
import "./AnnoncesPage.css";

const TYPES = [
  { value: "INFORMATION", label: "Information" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "ALERTE", label: "Alerte" },
  { value: "INTERRUPTION", label: "Interruption de service" },
];

const EMPTY_FORM = {
  titre: "",
  contenu: "",
  type: "INFORMATION",
  date_debut: "",
  date_fin: "",
};

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

function getErrorMessage(error) {
  const status = error?.response?.status;
  const data = error?.response?.data;

  if (status === 401) {
    return "Votre session a expiré. Déconnectez-vous puis reconnectez-vous.";
  }

  if (status === 403) {
    return "Vous n'avez pas la permission d'effectuer cette opération.";
  }

  if (status === 404) {
    return "Annonce introuvable ou route API incorrecte.";
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

  return "Impossible de contacter Django. Vérifiez que le serveur fonctionne.";
}

function toLocalDateTime(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset() * 60000;

  return new Date(date.getTime() - offset)
    .toISOString()
    .slice(0, 16);
}

function toApiDate(value) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Une date saisie est invalide.");
  }

  return date.toISOString();
}

function formatDate(value) {
  if (!value) return "Non définie";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date indisponible";

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getTypeLabel(type) {
  return TYPES.find((item) => item.value === type)?.label || type || "Information";
}

function getTypeIcon(type) {
  switch (type) {
    case "MAINTENANCE":
      return Wrench;
    case "ALERTE":
      return BellRing;
    case "INTERRUPTION":
      return AlertCircle;
    default:
      return Info;
  }
}

function AnnonceForm({ annonce, onClose, onSaved }) {
  const editing = Boolean(annonce?.id);

  const [form, setForm] = useState(() => ({
    titre: annonce?.titre || "",
    contenu: annonce?.contenu || "",
    type: annonce?.type || "INFORMATION",
    date_debut: toLocalDateTime(annonce?.date_debut),
    date_fin: toLocalDateTime(annonce?.date_fin),
  }));

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) return;

    setError("");

    if (!form.titre.trim() || !form.contenu.trim()) {
      setError("Le titre et le contenu sont obligatoires.");
      return;
    }

    if (
      form.date_debut &&
      form.date_fin &&
      new Date(form.date_fin) < new Date(form.date_debut)
    ) {
      setError(
        "La date de fin doit être postérieure ou égale à la date de début."
      );
      return;
    }

    setSaving(true);

    try {
      const payload = {
        titre: form.titre.trim(),
        contenu: form.contenu.trim(),
        type: form.type,
        date_debut: toApiDate(form.date_debut),
        date_fin: toApiDate(form.date_fin),
      };

      if (editing) {
        await api.patch(`annonces/${annonce.id}/`, payload);
      } else {
        await api.post("annonces/", payload);
      }

      await onSaved();
    } catch (err) {
      setError(
        err instanceof Error && !err.response
          ? err.message
          : getErrorMessage(err)
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="annonce-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) {
          onClose();
        }
      }}
    >
      <section
        className="annonce-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="annonce-form-title"
      >
        <header className="annonce-modal-header">
          <div>
            <span className="annonce-eyebrow">COMMUNICATION INTERNE DSI</span>
            <h2 id="annonce-form-title">
              {editing ? "Modifier l'annonce" : "Créer une annonce"}
            </h2>
            <p>
              Les annonces nouvellement créées restent en brouillon jusqu'à
              leur publication.
            </p>
          </div>

          <button
            type="button"
            className="annonce-icon-button"
            onClick={onClose}
            disabled={saving}
            aria-label="Fermer le formulaire"
          >
            <X size={20} />
          </button>
        </header>

        <form className="annonce-form" onSubmit={handleSubmit}>
          <div className="annonce-field">
            <label htmlFor="annonce-titre">Titre de l'annonce *</label>
            <input
              id="annonce-titre"
              name="titre"
              type="text"
              value={form.titre}
              onChange={handleChange}
              maxLength={255}
              placeholder="Ex. Maintenance du réseau informatique"
              required
            />
          </div>

          <div className="annonce-field">
            <label htmlFor="annonce-type">Type d'annonce *</label>
            <select
              id="annonce-type"
              name="type"
              value={form.type}
              onChange={handleChange}
              required
            >
              {TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="annonce-field">
            <label htmlFor="annonce-contenu">Contenu de l'annonce *</label>
            <textarea
              id="annonce-contenu"
              name="contenu"
              value={form.contenu}
              onChange={handleChange}
              rows={5}
              placeholder="Rédigez le message destiné aux utilisateurs..."
              required
            />
          </div>

          <div className="annonce-date-grid">
            <div className="annonce-field">
              <label htmlFor="annonce-date-debut">
                Début de diffusion
              </label>
              <input
                id="annonce-date-debut"
                name="date_debut"
                type="datetime-local"
                value={form.date_debut}
                onChange={handleChange}
              />
              <small>Laisser vide pour ne pas définir de début.</small>
            </div>

            <div className="annonce-field">
              <label htmlFor="annonce-date-fin">
                Fin de diffusion
              </label>
              <input
                id="annonce-date-fin"
                name="date_fin"
                type="datetime-local"
                value={form.date_fin}
                onChange={handleChange}
                min={form.date_debut || undefined}
              />
              <small>Laisser vide pour ne pas définir de fin.</small>
            </div>
          </div>

          {error && (
            <div className="annonce-error" role="alert">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <footer className="annonce-form-actions">
            <button
              type="button"
              className="annonce-button annonce-button-secondary"
              onClick={onClose}
              disabled={saving}
            >
              Annuler
            </button>

            <button
              type="submit"
              className="annonce-button annonce-button-primary"
              disabled={saving}
            >
              <Send size={16} />
              {saving
                ? "Enregistrement..."
                : editing
                  ? "Enregistrer les modifications"
                  : "Créer le brouillon"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export default function AnnoncesPage() {
  const [annonces, setAnnonces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("TOUS");
  const [filterStatus, setFilterStatus] = useState("TOUS");
  const [showForm, setShowForm] = useState(false);
  const [editingAnnonce, setEditingAnnonce] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState("");

  const user = getCurrentUser();
  const isAdmin =
    Boolean(user?.is_superuser) ||
    String(user?.role || "").toUpperCase() === "ADMIN";

  const loadAnnonces = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("annonces/");
      const data = response.data;

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
          ? data.results
          : [];

      setAnnonces(list);
    } catch (err) {
      setAnnonces([]);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnnonces();
  }, [loadAnnonces]);

  const filteredAnnonces = useMemo(() => {
    const query = search.trim().toLowerCase();

    return annonces.filter((annonce) => {
      const matchesQuery =
        !query ||
        [annonce.titre, annonce.contenu, annonce.auteur_username, annonce.type]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      const matchesType =
        filterType === "TOUS" || annonce.type === filterType;

      const matchesStatus =
        filterStatus === "TOUS" ||
        (filterStatus === "PUBLIE" && annonce.publie) ||
        (filterStatus === "BROUILLON" && !annonce.publie);

      return matchesQuery && matchesType && matchesStatus;
    });
  }, [annonces, search, filterType, filterStatus]);

  const stats = useMemo(
    () => ({
      total: annonces.length,
      publiees: annonces.filter((item) => item.publie).length,
      brouillons: annonces.filter((item) => !item.publie).length,
      alertes: annonces.filter(
        (item) =>
          item.type === "ALERTE" || item.type === "INTERRUPTION"
      ).length,
    }),
    [annonces]
  );

  function openCreateForm() {
    setEditingAnnonce(null);
    setShowForm(true);
    setError("");
    setNotice("");
  }

  function openEditForm(annonce) {
    setEditingAnnonce(annonce);
    setShowForm(true);
    setError("");
    setNotice("");
  }

  async function handleSaved() {
    setShowForm(false);
    setEditingAnnonce(null);
    setNotice("L'annonce a été enregistrée.");
    await loadAnnonces();
  }

  async function handlePublish(annonce) {
    const action = annonce.publie ? "depublier" : "publier";
    const message = annonce.publie
      ? `Dépublier « ${annonce.titre} » ?`
      : `Publier « ${annonce.titre} » et envoyer les notifications aux utilisateurs actifs ?`;

    if (!window.confirm(message)) return;

    setBusyId(annonce.id);
    setError("");
    setNotice("");

    try {
      await api.post(`annonces/${annonce.id}/${action}/`);
      setNotice(
        annonce.publie
          ? "L'annonce a été dépubliée."
          : "L'annonce a été publiée. Django gère l'envoi des notifications."
      );
      await loadAnnonces();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(annonce) {
    if (
      !window.confirm(
        `Supprimer définitivement l'annonce « ${annonce.titre} » ?`
      )
    ) {
      return;
    }

    setBusyId(annonce.id);
    setError("");
    setNotice("");

    try {
      await api.delete(`annonces/${annonce.id}/`);
      setNotice("L'annonce a été supprimée.");
      await loadAnnonces();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="annonces-page">
      <header className="annonces-page-header">
        <div className="annonces-title-area">
          <div className="annonces-title-icon">
            <Megaphone size={27} />
          </div>

          <div>
            <span className="annonce-eyebrow">PLATEFORME DE GESTION DSI</span>
            <h1>Annonces et alertes</h1>
            <p>Les communications internes et informations de service.</p>
          </div>
        </div>

        <div className="annonces-header-actions">
          <button
            type="button"
            className="annonce-button annonce-button-secondary"
            onClick={loadAnnonces}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Actualiser
          </button>

          {isAdmin && (
            <button
              type="button"
              className="annonce-button annonce-button-primary"
              onClick={openCreateForm}
            >
              <Plus size={18} />
              Nouvelle annonce
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="annonce-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Fermer le message"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {notice && (
        <div className="annonce-notice" role="status">
          <CheckCircle2 size={18} />
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="Fermer le message"
          >
            <X size={17} />
          </button>
        </div>
      )}

      <section className="annonces-stats">
        <article className="annonce-stat">
          <span className="annonce-stat-icon"><Megaphone size={19} /></span>
          <div>
            <small>Total des annonces</small>
            <strong>{stats.total}</strong>
          </div>
        </article>

        <article className="annonce-stat">
          <span className="annonce-stat-icon annonce-stat-green">
            <Eye size={19} />
          </span>
          <div>
            <small>Publiées</small>
            <strong>{stats.publiees}</strong>
          </div>
        </article>

        <article className="annonce-stat">
          <span className="annonce-stat-icon annonce-stat-amber">
            <Clock3 size={19} />
          </span>
          <div>
            <small>Brouillons</small>
            <strong>{stats.brouillons}</strong>
          </div>
        </article>

        <article className="annonce-stat">
          <span className="annonce-stat-icon annonce-stat-red">
            <BellRing size={19} />
          </span>
          <div>
            <small>Alertes et interruptions</small>
            <strong>{stats.alertes}</strong>
          </div>
        </article>
      </section>

      <section className="annonces-toolbar">
        <label className="annonces-search">
          <Search size={18} />
          <input
            type="search"
            placeholder="Rechercher une annonce..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Rechercher une annonce"
          />
        </label>

        <select
          value={filterType}
          onChange={(event) => setFilterType(event.target.value)}
          aria-label="Filtrer par type"
        >
          <option value="TOUS">Tous les types</option>
          {TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>

        {isAdmin && (
          <select
            value={filterStatus}
            onChange={(event) => setFilterStatus(event.target.value)}
            aria-label="Filtrer par publication"
          >
            <option value="TOUS">Tous les statuts</option>
            <option value="PUBLIE">Publiées</option>
            <option value="BROUILLON">Brouillons</option>
          </select>
        )}
      </section>

      <section className="annonces-results">
        {loading ? (
          <div className="annonces-empty">
            <RefreshCw size={24} />
            <p>Chargement des annonces...</p>
          </div>
        ) : filteredAnnonces.length === 0 ? (
          <div className="annonces-empty">
            <Megaphone size={34} />
            <h3>Aucune annonce trouvée</h3>
            <p>
              {annonces.length === 0
                ? "Aucune annonce accessible pour votre compte."
                : "Modifiez les filtres ou votre recherche."}
            </p>

            {isAdmin && (
              <button
                type="button"
                className="annonce-button annonce-button-primary"
                onClick={openCreateForm}
              >
                <Plus size={17} />
                Créer une annonce
              </button>
            )}
          </div>
        ) : (
          <div className="annonces-list">
            {filteredAnnonces.map((annonce) => {
              const TypeIcon = getTypeIcon(annonce.type);

              return (
                <article
                  className={`annonce-card annonce-type-${String(
                    annonce.type || "information"
                  ).toLowerCase()}`}
                  key={annonce.id}
                >
                  <div className="annonce-card-main">
                    <div className="annonce-card-icon">
                      <TypeIcon size={21} />
                    </div>

                    <div className="annonce-card-content">
                      <div className="annonce-card-badges">
                        <span className="annonce-type-badge">
                          {getTypeLabel(annonce.type)}
                        </span>

                        {isAdmin && (
                          <span
                            className={`annonce-status-badge ${
                              annonce.publie ? "is-published" : "is-draft"
                            }`}
                          >
                            {annonce.publie ? "Publiée" : "Brouillon"}
                          </span>
                        )}
                      </div>

                      <h2>{annonce.titre}</h2>
                      <p className="annonce-content-text">{annonce.contenu}</p>

                      <div className="annonce-meta">
                        <span>
                          <CalendarClock size={15} />
                          Créée le {formatDate(annonce.date_creation)}
                        </span>

                        {annonce.auteur_username && (
                          <span>
                            Auteur : {annonce.auteur_username}
                          </span>
                        )}

                        {annonce.date_publication && (
                          <span>
                            Publiée le {formatDate(annonce.date_publication)}
                          </span>
                        )}
                      </div>

                      {(annonce.date_debut || annonce.date_fin) && (
                        <div className="annonce-period">
                          <CalendarClock size={15} />
                          <span>
                            Diffusion : {formatDate(annonce.date_debut)}
                            {" — "}
                            {formatDate(annonce.date_fin)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="annonce-card-actions">
                      <button
                        type="button"
                        className="annonce-action-button"
                        onClick={() => openEditForm(annonce)}
                        disabled={busyId === annonce.id}
                        title="Modifier"
                      >
                        <Edit3 size={16} />
                        Modifier
                      </button>

                      <button
                        type="button"
                        className="annonce-action-button annonce-publish-action"
                        onClick={() => handlePublish(annonce)}
                        disabled={busyId === annonce.id}
                        title={annonce.publie ? "Dépublier" : "Publier"}
                      >
                        {annonce.publie ? (
                          <EyeOff size={16} />
                        ) : (
                          <Send size={16} />
                        )}
                        {busyId === annonce.id
                          ? "Traitement..."
                          : annonce.publie
                            ? "Dépublier"
                            : "Publier"}
                      </button>

                      <button
                        type="button"
                        className="annonce-action-button annonce-delete-action"
                        onClick={() => handleDelete(annonce)}
                        disabled={busyId === annonce.id}
                        title="Supprimer"
                      >
                        <Trash2 size={16} />
                        Supprimer
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <footer className="annonces-footer">
        {filteredAnnonces.length} annonce(s) affichée(s)
      </footer>

      {showForm && isAdmin && (
        <AnnonceForm
          key={editingAnnonce?.id || "nouvelle-annonce"}
          annonce={editingAnnonce}
          onClose={() => {
            if (!showForm) return;
            setShowForm(false);
            setEditingAnnonce(null);
          }}
          onSaved={handleSaved}
        />
      )}
    </main>
  );
}
