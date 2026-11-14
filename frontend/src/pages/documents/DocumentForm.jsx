
import { useEffect, useRef, useState } from "react";
import { X, Save, Upload, AlertCircle } from "lucide-react";
import api from "../../services/api";
import "./DocumentForm.css";

const EMPTY_FORM = {
  titre: "",
  description: "",
  categorie: "GUIDE",
  publie: true,
};

const UPLOAD_CONFIG = {
  headers: {
    "Content-Type": "multipart/form-data",
  },
};

function getFormError(error) {
  const status = error?.response?.status;
  const data = error?.response?.data;

  if (status === 401) {
    return "Votre session a expiré. Reconnectez-vous.";
  }

  if (status === 403) {
    return "Vous n'avez pas la permission de gérer les documents.";
  }

  if (status === 415) {
    return "Format de fichier non accepté par Django. Vérifiez les parseurs de l'API et la configuration Axios.";
  }

  if (typeof data === "string") {
    return data;
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

  return "Enregistrement impossible. Vérifiez Django et votre connexion.";
}

export default function DocumentForm({
  document = null,
  onClose,
  onCancel,
  onSaved,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [fichier, setFichier] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef(null);
  const editing = Boolean(document?.id);

  const closeForm = onClose || onCancel || (() => {});

  // Initialiser les champs pour l'ajout ou la modification.
  useEffect(() => {
    setForm({
      titre:
        document?.titre ||
        document?.title ||
        document?.nom ||
        "",
      description: document?.description || "",
      categorie:
        document?.categorie ||
        document?.category ||
        "GUIDE",
      publie: Boolean(
        document?.publie ??
        document?.is_published ??
        document?.published ??
        true
      ),
    });

    setFichier(null);
    setError("");
  }, [document]);

  // Gérer les changements des champs.
  function handleChange(event) {
    const { name, value, checked, type } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  // Ouvrir directement le sélecteur Windows au clic utilisateur.
  function handleChooseFile() {
    if (!saving) {
      fileInputRef.current?.click();
    }
  }

  // Enregistrer le fichier choisi.
  function handleFileChange(event) {
    setFichier(event.target.files?.[0] || null);
    setError("");
  }

  // Envoyer les données à Django.
  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) return;

    setError("");

    if (!form.titre.trim()) {
      setError("Veuillez saisir le titre du document.");
      return;
    }

    if (!editing && !fichier) {
      setError("Veuillez sélectionner un fichier.");
      return;
    }

    const data = new FormData();

    data.append("titre", form.titre.trim());
    data.append("description", form.description.trim());
    data.append("categorie", form.categorie);
    data.append("publie", String(form.publie));

    if (fichier) {
      data.append("fichier", fichier);
    }

    setSaving(true);

    try {
      if (editing) {
        await api.patch(
          `documents/${document.id}/`,
          data,
          UPLOAD_CONFIG
        );
      } else {
        await api.post(
          "documents/",
          data,
          UPLOAD_CONFIG
        );
      }

      if (typeof onSaved === "function") {
        await onSaved();
      } else {
        closeForm();
      }
    } catch (err) {
      setError(getFormError(err));
    } finally {
      setSaving(false);
    }
  }

  // Fermer en cliquant sur l'arrière-plan.
  function handleOverlayMouseDown(event) {
    if (event.target === event.currentTarget && !saving) {
      closeForm();
    }
  }

  return (
    <div
      className="document-form-overlay"
      onMouseDown={handleOverlayMouseDown}
    >
      <section
        className="document-form-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-form-title"
      >
        <header className="document-form-header">
          <div className="document-form-heading-content">
            <span className="document-form-eyebrow">
              GESTION DOCUMENTAIRE DSI
            </span>

            <h2 id="document-form-title">
              {editing
                ? "Modifier le document"
                : "Ajouter un document"}
            </h2>

            <p>Complétez les informations du document.</p>
          </div>

          <button
            type="button"
            className="document-form-close"
            onClick={closeForm}
            disabled={saving}
            aria-label="Fermer le formulaire"
          >
            <X size={20} />
          </button>
        </header>

        <form className="document-form" onSubmit={handleSubmit}>
          {/* Titre */}
          <div className="document-form-field">
            <label htmlFor="doc-titre">
              Titre du document *
            </label>

            <input
              id="doc-titre"
              name="titre"
              type="text"
              value={form.titre}
              onChange={handleChange}
              placeholder="Ex. Guide utilisateur"
              required
              maxLength={255}
            />
          </div>

          {/* Catégorie */}
          <div className="document-form-field">
            <label htmlFor="doc-categorie">
              Catégorie *
            </label>

            <select
              id="doc-categorie"
              name="categorie"
              value={form.categorie}
              onChange={handleChange}
              required
            >
              <option value="GUIDE">Guide utilisateur</option>
              <option value="PROCEDURE">Procédure</option>
              <option value="FORMULAIRE">Formulaire</option>
              <option value="NOTE_TECHNIQUE">Note technique</option>
              <option value="ADMINISTRATIF">
                Document administratif
              </option>
              <option value="TECHNIQUE">Technique</option>
              <option value="AUTRE">Autre</option>
            </select>
          </div>

          {/* Description */}
          <div className="document-form-field">
            <label htmlFor="doc-description">
              Description
            </label>

            <textarea
              id="doc-description"
              name="description"
              rows={3}
              value={form.description}
              onChange={handleChange}
              placeholder="Décrivez brièvement le document..."
            />
          </div>

          {/* Fichier */}
          <div className="document-form-field">
            <label htmlFor="doc-fichier">
              Fichier {editing ? "(facultatif)" : "*"}
            </label>

            <input
              ref={fileInputRef}
              id="doc-fichier"
              className="document-file-input"
              type="file"
              onChange={handleFileChange}
              aria-describedby="doc-fichier-help"
              tabIndex={-1}
            />

            <button
              type="button"
              className="document-file-picker"
              onClick={handleChooseFile}
              disabled={saving}
            >
              <Upload size={21} />

              <span className="document-file-name">
                {fichier
                  ? fichier.name
                  : editing
                    ? "Choisir un nouveau fichier"
                    : "Choisir un fichier sur mon PC"}
              </span>
            </button>

            <small
              id="doc-fichier-help"
              className="document-form-help"
            >
              {editing
                ? "Sans nouveau fichier, le fichier actuel est conservé."
                : "Cliquez sur le bouton pour ouvrir vos dossiers Windows."}
            </small>
          </div>

          {/* Publication */}
          <label className="document-publish-option">
            <input
              type="checkbox"
              name="publie"
              checked={form.publie}
              onChange={handleChange}
            />

            <span className="document-publish-text">
              <strong>Publier ce document</strong>

              <small>
                Le document sera accessible selon les permissions
                définies par l'application.
              </small>
            </span>
          </label>

          {/* Erreurs */}
          {error && (
            <div className="documents-error" role="alert">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <footer className="document-form-actions">
            <button
              type="button"
              className="document-form-cancel"
              onClick={closeForm}
              disabled={saving}
            >
              Annuler
            </button>

            <button
              type="submit"
              className="document-form-save"
              disabled={saving}
            >
              <Save size={17} />

              {saving
                ? "Enregistrement..."
                : editing
                  ? "Enregistrer les modifications"
                  : "Enregistrer le document"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
