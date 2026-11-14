import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  UserRound,
  UserPlus,
  Eye,
  EyeOff,
  ArrowLeft,
} from "lucide-react";

import api from "../../services/api";
import "./Register.css";

/* =====================================================
   RÔLE INITIAL
   Aucun champ de sélection du rôle dans le formulaire.
===================================================== */

const DEFAULT_ROLE = "AGENT";

/* =====================================================
   SERVICES DE L'ORGANIGRAMME
   Les directions régionales et les organes consultatifs
   et d'appui sont volontairement exclus.
===================================================== */

const SERVICES = [
  { value: "DPMEP", label: "DPMEP" },
  { value: "DAI", label: "DAI" },
  { value: "PRMP", label: "PRMP" },
  { value: "DGCR", label: "DGCR" },
  { value: "DGC", label: "DGC" },
  { value: "DGESO", label: "DGESO" },
  { value: "DRH", label: "DRH" },
  { value: "DAAF", label: "DAAF" },
  { value: "DAJ", label: "DAJ" },
  { value: "DCOM", label: "DCOM" },
  { value: "DSI", label: "DSI" },
];

/* =====================================================
   FONCTIONS PROFESSIONNELLES
   Liste commune à tous les utilisateurs.
===================================================== */

const FONCTIONS = [
  { value: "Ministre", label: "Ministre" },
  { value: "Coordonnateur Général", label: "Coordonnateur Général" },
  { value: "Inspecteur", label: "Inspecteur" },
  { value: "Chargé de mission", label: "Chargé de mission" },
  { value: "Conseiller Technique", label: "Conseiller Technique" },
  { value: "Attaché de Presse", label: "Attaché de Presse" },
  {
    value: "Chef du Secrétariat Particulier",
    label: "Chef du Secrétariat Particulier",
  },
  { value: "Chef du Protocole", label: "Chef du Protocole" },
  { value: "Directeur", label: "Directeur" },
  { value: "Directeur Général", label: "Directeur Général (DG)" },
  { value: "Secrétaire Général", label: "Secrétaire Général (SG)" },
  { value: "Directeur de service", label: "Directeur de service" },
  { value: "Chef de service", label: "Chef de service" },
  { value: "Secrétaire", label: "Secrétaire" },
  { value: "Assistant / Référent", label: "Assistant / Référent" },
  { value: "Responsable / Référent", label: "Responsable / Référent" },
  { value: "Planificateur", label: "Planificateur" },
  { value: "Agent", label: "Agent" },
  { value: "Technicien DSI", label: "Technicien DSI" },
];

/* =====================================================
   FORMULAIRE INITIAL
===================================================== */

const INITIAL_FORM = {
  username: "",
  first_name: "",
  last_name: "",
  identifiant: "",
  email: "",
  service: "",
  fonction: "",
  password: "",
  password_confirmation: "",
};

/* =====================================================
   COMPOSANT REGISTER
===================================================== */

function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    ...INITIAL_FORM,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* ===================================================
     MODIFICATION DES CHAMPS
  =================================================== */

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  };

  /* ===================================================
     VALIDATION ET INSCRIPTION
  =================================================== */

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (
      !form.username.trim() ||
      !form.identifiant.trim()
    ) {
      setError(
        "Veuillez renseigner votre nom d'utilisateur et votre identifiant."
      );
      return;
    }

    if (!form.service) {
      setError("Veuillez sélectionner votre direction ou service.");
      return;
    }

    if (!form.fonction) {
      setError("Veuillez sélectionner votre fonction.");
      return;
    }

    if (form.password !== form.password_confirmation) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    if (form.password.length < 8) {
      setError(
        "Le mot de passe doit contenir au moins 8 caractères."
      );
      return;
    }

    setLoading(true);

    try {
      await api.post("/auth/register/", {
        username: form.username.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        identifiant: form.identifiant.trim(),
        email: form.email.trim(),
        service: form.service,
        fonction: form.fonction,

        // Valeur interne envoyée à Django.
        // Aucun choix de rôle n'est affiché à l'inscription.
        role: DEFAULT_ROLE,

        password: form.password,
        password_confirmation: form.password_confirmation,
      });

      setSuccess(
        "Votre demande d'inscription a été envoyée. Votre compte reste désactivé jusqu'à sa validation par l'administrateur DSI."
      );

      setForm({
        ...INITIAL_FORM,
      });

    } catch (err) {
      console.error(
        "Erreur inscription :",
        err.response?.data || err.message
      );

      const data = err.response?.data;

      if (data && typeof data === "object") {
        const labels = {
          username: "Nom d'utilisateur",
          first_name: "Prénom",
          last_name: "Nom",
          identifiant: "Identifiant",
          email: "Adresse électronique",
          service: "Direction / service",
          fonction: "Fonction",
          role: "Rôle interne",
          password: "Mot de passe",
          password_confirmation: "Confirmation du mot de passe",
          detail: "Inscription",
        };

        const messages = Object.entries(data).flatMap(
          ([field, value]) => {
            const label = labels[field] || field;

            const details = Array.isArray(value)
              ? value.join(" ")
              : typeof value === "string"
                ? value
                : JSON.stringify(value);

            return [`${label} : ${details}`];
          }
        );

        setError(
          messages.join("\n") ||
          "Vérifiez les informations saisies."
        );

      } else {
        setError(
          "Impossible d'envoyer l'inscription. Vérifiez que le serveur Django fonctionne."
        );
      }

    } finally {
      setLoading(false);
    }
  };

  /* ===================================================
     AFFICHAGE
  =================================================== */

  return (
    <main className="register-page">

      <section className="register-card">

        {/* EN-TÊTE */}

        <header className="register-header">

          <div className="register-icon">
            <UserPlus size={30} />
          </div>

          <h1>Créer un compte</h1>

          <p className="register-subtitle">
            Application de gestion des services de la DSI
          </p>

          <p className="register-description">
            Ministère Chargé de la Refondation
          </p>

        </header>

        {/* MESSAGE D'ERREUR */}

        {error && (
          <div
            className="register-message register-error"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* MESSAGE DE SUCCÈS */}

        {success && (
          <div
            className="register-message register-success"
            role="status"
          >
            {success}

            <button
              type="button"
              className="register-back-button"
              onClick={() => navigate("/login")}
            >
              Retour à la connexion
            </button>
          </div>
        )}

        {/* FORMULAIRE */}

        {!success && (
          <form
            className="register-form"
            onSubmit={handleSubmit}
          >

            <div className="register-section-title">
              <UserRound size={19} />
              <h2>Informations de l'utilisateur</h2>
            </div>

            <div className="register-grid">

              {/* NOM */}

              <div className="register-group">
                <label htmlFor="last_name">
                  Nom
                </label>

                <input
                  id="last_name"
                  name="last_name"
                  value={form.last_name}
                  onChange={handleChange}
                  placeholder="Votre nom"
                  autoComplete="family-name"
                  required
                />
              </div>

              {/* PRÉNOM */}

              <div className="register-group">
                <label htmlFor="first_name">
                  Prénom
                </label>

                <input
                  id="first_name"
                  name="first_name"
                  value={form.first_name}
                  onChange={handleChange}
                  placeholder="Votre prénom"
                  autoComplete="given-name"
                  required
                />
              </div>

              {/* NOM D'UTILISATEUR */}

              <div className="register-group">
                <label htmlFor="username">
                  Nom d'utilisateur
                </label>

                <input
                  id="username"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="Nom de connexion"
                  autoComplete="username"
                  required
                />
              </div>

              {/* IDENTIFIANT */}

              <div className="register-group">
                <label htmlFor="identifiant">
                  Identifiant professionnel
                </label>

                <input
                  id="identifiant"
                  name="identifiant"
                  value={form.identifiant}
                  onChange={handleChange}
                  placeholder="Votre identifiant"
                  required
                />
              </div>

              {/* EMAIL */}

              <div className="register-group">
                <label htmlFor="email">
                  Adresse électronique
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="nom@ministere.mg"
                  autoComplete="email"
                  required
                />
              </div>

              {/* SERVICE : LISTE DÉROULANTE */}

              <div className="register-group">
                <label htmlFor="service">
                  Direction / Service
                </label>

                <select
                  id="service"
                  name="service"
                  value={form.service}
                  onChange={handleChange}
                  required
                >
                  <option value="">
                    Sélectionner votre service
                  </option>

                  {SERVICES.map((service) => (
                    <option
                      key={service.value}
                      value={service.value}
                    >
                      {service.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* FONCTION */}

              <div className="register-group">
                <label htmlFor="fonction">
                  Fonction
                </label>

                <select
                  id="fonction"
                  name="fonction"
                  value={form.fonction}
                  onChange={handleChange}
                  required
                >
                  <option value="">
                    Sélectionner votre fonction
                  </option>

                  {FONCTIONS.map((fonction) => (
                    <option
                      key={fonction.value}
                      value={fonction.value}
                    >
                      {fonction.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* MOT DE PASSE */}

              <div className="register-group">
                <label htmlFor="password">
                  Mot de passe
                </label>

                <div className="register-password">

                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={handleChange}
                    placeholder="8 caractères minimum"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />

                  <button
                    type="button"
                    className="register-password-toggle"
                    onClick={() =>
                      setShowPassword((value) => !value)
                    }
                    aria-label={
                      showPassword
                        ? "Masquer le mot de passe"
                        : "Afficher le mot de passe"
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}
                  </button>

                </div>
              </div>

              {/* CONFIRMATION MOT DE PASSE */}

              <div className="register-group">
                <label htmlFor="password_confirmation">
                  Confirmer le mot de passe
                </label>

                <div className="register-password">

                  <input
                    id="password_confirmation"
                    name="password_confirmation"
                    type={
                      showConfirmation
                        ? "text"
                        : "password"
                    }
                    value={form.password_confirmation}
                    onChange={handleChange}
                    placeholder="Répétez le mot de passe"
                    autoComplete="new-password"
                    required
                  />

                  <button
                    type="button"
                    className="register-password-toggle"
                    onClick={() =>
                      setShowConfirmation((value) => !value)
                    }
                    aria-label={
                      showConfirmation
                        ? "Masquer la confirmation"
                        : "Afficher la confirmation"
                    }
                  >
                    {showConfirmation ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}
                  </button>

                </div>
              </div>

            </div>

            {/* INFORMATION VALIDATION */}

            <p className="register-notice">
              Après l'inscription, votre compte restera désactivé
              jusqu'à sa validation par l'administrateur DSI.
              Votre fonction et votre service seront associés
              à votre compte.
            </p>

            {/* BOUTON */}

            <button
              type="submit"
              className="register-submit"
              disabled={loading}
            >
              <UserPlus size={19} />

              {loading
                ? "Envoi en cours..."
                : "Envoyer l'inscription"}
            </button>

          </form>
        )}

        {/* PIED DE PAGE */}

        <footer className="register-footer">
          <Link
            to="/login"
            className="register-back-link"
          >
            <ArrowLeft size={17} />
            Retour à la connexion
          </Link>
        </footer>

      </section>
    </main>
  );
}

export default Register;