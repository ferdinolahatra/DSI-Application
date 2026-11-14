
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogIn, Eye, EyeOff } from "lucide-react";

import { loginUser } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [identifiant, setIdentifiant] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!identifiant.trim() || !password) {
      setError("Veuillez remplir tous les champs.");
      return;
    }

    try {
      setLoading(true);

      // 1. Connexion auprès du backend Django.
      // POST /api/auth/login/
      const data = await loginUser(
        identifiant.trim(),
        password
      );

      // 2. Vérifier la réponse du serveur.
      if (!data.access || !data.refresh || !data.user) {
        throw new Error(
          "La réponse du serveur est incomplète."
        );
      }

      // 3. Enregistrer l'utilisateur et les tokens JWT.
      login(
        data.user,
        data.access,
        data.refresh
      );

      // 4. Rediriger vers le tableau de bord.
      navigate("/dashboard", { replace: true });

    } catch (err) {
      console.error(
        "Erreur de connexion :",
        err.response?.data || err.message
      );

      // Nettoyer la session en cas d'échec.
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");

      if (err.response?.status === 400) {
        const details = err.response.data;

        if (details?.identifiant) {
          setError(
            "Veuillez vérifier le champ identifiant."
          );
        } else if (details?.password) {
          setError(
            "Veuillez vérifier le champ mot de passe."
          );
        } else {
          setError(
            details?.detail ||
            "Identifiant ou mot de passe incorrect, ou compte inactif."
          );
        }

      } else if (err.response?.status === 401) {
        setError(
          "Identifiant ou mot de passe incorrect, ou compte inactif."
        );

      } else if (err.response) {
        setError(
          `Erreur du serveur (${err.response.status}). Réessayez.`
        );

      } else if (
        err.message ===
        "La réponse du serveur est incomplète."
      ) {
        setError(err.message);

      } else {
        setError(
          "Impossible de contacter le serveur Django. Vérifiez que Django fonctionne."
        );
      }

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">

        {/* Icône */}
        <div className="login-icon">
          <LogIn size={28} />
        </div>

        {/* Titre */}
        <h1>Connexion</h1>

        <p className="login-subtitle">
          Plateforme de gestion DSI
        </p>

        {/* Message d'erreur */}
        {error && (
          <div className="login-error" role="alert">
            {error}
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleSubmit}>

          {/* Identifiant */}
          <div className="form-group">
            <label htmlFor="identifiant">
              Identifiant
            </label>

            <input
              id="identifiant"
              name="identifiant"
              type="text"
              placeholder="Votre identifiant"
              value={identifiant}
              onChange={(event) =>
                setIdentifiant(event.target.value)
              }
              autoComplete="username"
              required
              disabled={loading}
            />
          </div>

          {/* Mot de passe */}
          <div className="form-group">
            <label htmlFor="password">
              Mot de passe
            </label>

            <div className="password-wrapper">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Votre mot de passe"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                autoComplete="current-password"
                required
                disabled={loading}
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowPassword((previous) => !previous)
                }
                aria-label={
                  showPassword
                    ? "Masquer le mot de passe"
                    : "Afficher le mot de passe"
                }
                disabled={loading}
              >
                {showPassword ? (
                  <EyeOff size={20} />
                ) : (
                  <Eye size={20} />
                )}
              </button>
            </div>
          </div>

          {/* Bouton de connexion */}
          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>

        </form>

        {/* Inscription */}
        <div className="login-register">
          <span>
            Vous n'avez pas encore de compte ?
          </span>

          <Link
            to="/register"
            className="register-link-button"
          >
            S'inscrire
          </Link>
        </div>

      </div>
    </div>
  );
}

export default Login;
