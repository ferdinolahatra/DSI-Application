
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  UserCheck,
  UserX,
  RefreshCw,
  ShieldCheck,
  Clock3,
  Users,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

import api from "../../services/api";
import "./UserManagement.css";

function getUserName(user) {
  const fullName = [user.first_name, user.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || user.username || user.identifiant || "Utilisateur";
}

function getRoleLabel(role) {
  switch (String(role || "").toUpperCase()) {
    case "ADMIN":
      return "Administrateur DSI";
    case "TECHNICIEN":
      return "Technicien DSI";
    case "AGENT":
      return "Agent du ministère";
    default:
      return role || "Non défini";
  }
}

function isUserActive(user) {
  return user.compte_actif === true && user.is_active !== false;
}

function isProtectedAdmin(user) {
  // Le backend doit également protéger les superutilisateurs.
  // Le nom admin sert de protection de secours si l'API
  // ne renvoie pas encore le champ is_superuser.
  return (
    user.is_superuser === true ||
    String(user.username || "").toLowerCase() === "admin"
  );
}

function normalizeUsers(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.users)) return data.users;
  return [];
}

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =========================================================
  // CHARGEMENT DES UTILISATEURS
  // =========================================================

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/users/");
      setUsers(normalizeUsers(response.data));
    } catch (err) {
      console.error(
        "Erreur chargement utilisateurs :",
        err.response?.data || err.message
      );

      if (err.response?.status === 403) {
        setError(
          "Accès refusé. Seul l'administrateur DSI peut gérer les utilisateurs."
        );
      } else if (err.response?.status === 401) {
        setError(
          "Votre session a expiré. Veuillez vous reconnecter."
        );
      } else {
        setError(
          "Impossible de charger les utilisateurs. Vérifiez que Django fonctionne."
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // =========================================================
  // ACTIVER / DÉSACTIVER UN COMPTE
  // =========================================================

  const changeAccountStatus = async (user, active) => {
    if (isProtectedAdmin(user)) {
      setError(
        "Le compte super administrateur est protégé contre la désactivation."
      );
      return;
    }

    const action = active ? "activer" : "désactiver";
    const name = getUserName(user);

    const confirmed = window.confirm(
      `Voulez-vous vraiment ${action} le compte de ${name} ?`
    );

    if (!confirmed) return;

    setActionLoading(user.id);
    setError("");
    setSuccess("");

    try {
      await api.patch(`/users/${user.id}/`, {
        compte_actif: active,
      });

      setUsers((previousUsers) =>
        previousUsers.map((item) =>
          item.id === user.id
            ? {
                ...item,
                compte_actif: active,
                is_active: active,
              }
            : item
        )
      );

      setSuccess(
        active
          ? `Le compte de ${name} a été activé.`
          : `Le compte de ${name} a été désactivé.`
      );
    } catch (err) {
      console.error(
        `Erreur lors de l'action ${action} :`,
        err.response?.data || err.message
      );

      if (err.response?.status === 401) {
        setError(
          "Votre session a expiré. Reconnectez-vous avant de réessayer."
        );
      } else if (err.response?.status === 403) {
        setError(
          "Vous n'avez pas l'autorisation de modifier ce compte."
        );
      } else if (err.response?.status === 404) {
        setError("Utilisateur introuvable.");
      } else {
        const data = err.response?.data;

        if (data && typeof data === "object") {
          setError(
            Object.entries(data)
              .map(([field, value]) => {
                const message = Array.isArray(value)
                  ? value.join(", ")
                  : typeof value === "string"
                    ? value
                    : JSON.stringify(value);

                return `${field} : ${message}`;
              })
              .join(" | ") || `Impossible de ${action} le compte.`
          );
        } else {
          setError(`Impossible de ${action} le compte.`);
        }
      }
    } finally {
      setActionLoading(null);
    }
  };

  // =========================================================
  // RECHERCHE
  // =========================================================

  const filteredUsers = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return users;

    return users.filter((user) => {
      const text = [
        user.username,
        user.first_name,
        user.last_name,
        user.email,
        user.identifiant,
        user.service,
        user.fonction,
        user.role,
        user.role_display,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(value);
    });
  }, [users, search]);

  // =========================================================
  // STATISTIQUES
  // =========================================================

  const activeCount = users.filter(isUserActive).length;
  const pendingCount = users.length - activeCount;

  // =========================================================
  // AFFICHAGE
  // =========================================================

  return (
    <main className="users-page">
      <header className="users-header">
        <div className="users-title-row">
          <div className="users-title-icon">
            <Users size={25} />
          </div>

          <div className="users-heading-text">
            <h1>Gestion des utilisateurs</h1>
            <p>Administration des comptes de la DSI</p>
          </div>
        </div>

        <button
          type="button"
          className="users-refresh-button"
          onClick={loadUsers}
          disabled={loading}
        >
          <RefreshCw
            size={17}
            className={loading ? "spin" : ""}
          />
          <span>Actualiser</span>
        </button>
      </header>

      {/* Statistiques */}
      <section className="users-stats">
        <article className="users-stat-card">
          <div className="users-stat-icon users-stat-total">
            <Users size={21} />
          </div>
          <div className="users-stat-content">
            <span>Total des comptes</span>
            <strong>{loading ? "—" : users.length}</strong>
          </div>
        </article>

        <article className="users-stat-card">
          <div className="users-stat-icon users-stat-active">
            <UserCheck size={21} />
          </div>
          <div className="users-stat-content">
            <span>Comptes actifs</span>
            <strong>{loading ? "—" : activeCount}</strong>
          </div>
        </article>

        <article className="users-stat-card">
          <div className="users-stat-icon users-stat-pending">
            <Clock3 size={21} />
          </div>
          <div className="users-stat-content">
            <span>En attente</span>
            <strong>{loading ? "—" : pendingCount}</strong>
          </div>
        </article>
      </section>

      {/* Messages */}
      {error && (
        <div
          className="users-message users-error"
          role="alert"
        >
          <AlertCircle size={19} />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Fermer le message d'erreur"
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div
          className="users-message users-success"
          role="status"
        >
          <CheckCircle2 size={19} />
          <span>{success}</span>
          <button
            type="button"
            onClick={() => setSuccess("")}
            aria-label="Fermer le message de succès"
          >
            ×
          </button>
        </div>
      )}

      {/* Recherche */}
      <section className="users-toolbar">
        <div className="users-search">
          <Search size={19} />

          <input
            type="search"
            aria-label="Rechercher un utilisateur"
            placeholder="Rechercher un utilisateur..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          {search && (
            <button
              type="button"
              className="users-clear-search"
              onClick={() => setSearch("")}
              aria-label="Effacer la recherche"
            >
              ×
            </button>
          )}
        </div>

        <span className="users-result-count">
          {filteredUsers.length} utilisateur
          {filteredUsers.length > 1 ? "s" : ""}
          {search ? " trouvé(s)" : ""}
        </span>
      </section>

      {/* Tableau responsive */}
      <section className="users-table-card">
        <div className="users-table-heading">
          <div>
            <h2>Comptes enregistrés</h2>
            <p>
              Consultez et gérez les accès à la plateforme DSI.
            </p>
          </div>

          <ShieldCheck size={23} />
        </div>

        {loading ? (
          <div className="users-empty">
            <RefreshCw size={25} className="spin" />
            <p>Chargement des utilisateurs...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="users-empty">
            <Users size={30} />
            <p>
              {search
                ? "Aucun utilisateur ne correspond à votre recherche."
                : "Aucun utilisateur trouvé."}
            </p>
          </div>
        ) : (
          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Identifiant</th>
                  <th>Email</th>
                  <th>Direction / Service</th>
                  <th>Fonction</th>
                  <th>Rôle</th>
                  <th>Statut</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((user) => {
                  const active = isUserActive(user);
                  const protectedAdmin = isProtectedAdmin(user);
                  const isLoading = actionLoading === user.id;

                  const roleClass = String(user.role || "")
                    .toLowerCase()
                    .replace(/[^a-z0-9_-]/g, "");

                  return (
                    <tr key={user.id ?? user.username}>
                      <td data-label="Utilisateur">
                        <div className="user-cell">
                          <div className="user-avatar">
                            {(
                              user.first_name?.[0] ||
                              user.username?.[0] ||
                              "U"
                            ).toUpperCase()}
                          </div>

                          <div className="user-identity">
                            <strong>{getUserName(user)}</strong>
                            <span>@{user.username}</span>
                          </div>
                        </div>
                      </td>

                      <td data-label="Identifiant">
                        <span className="table-text">
                          {user.identifiant || "—"}
                        </span>
                      </td>

                      <td data-label="Email">
                        <span className="table-text">
                          {user.email || "—"}
                        </span>
                      </td>

                      <td data-label="Direction / Service">
                        <span className="table-text">
                          {user.service || "—"}
                        </span>
                      </td>

                      <td data-label="Fonction">
                        <span className="table-text">
                          {user.fonction || "—"}
                        </span>
                      </td>

                      <td data-label="Rôle">
                        <span
                          className={`role-badge role-${roleClass}`}
                        >
                          {getRoleLabel(user.role)}
                        </span>
                      </td>

                      <td data-label="Statut">
                        {active ? (
                          <span className="status-badge status-active">
                            <UserCheck size={14} />
                            Actif
                          </span>
                        ) : (
                          <span className="status-badge status-pending">
                            <Clock3 size={14} />
                            En attente
                          </span>
                        )}
                      </td>

                      <td data-label="Action">
                        {active ? (
                          <button
                            type="button"
                            className="user-action user-deactivate"
                            onClick={() =>
                              changeAccountStatus(user, false)
                            }
                            disabled={isLoading || protectedAdmin}
                            title={
                              protectedAdmin
                                ? "Le super administrateur est protégé"
                                : "Désactiver le compte"
                            }
                          >
                            <UserX size={15} />
                            <span>
                              {isLoading ? "..." : "Désactiver"}
                            </span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="user-action user-activate"
                            onClick={() =>
                              changeAccountStatus(user, true)
                            }
                            disabled={isLoading || protectedAdmin}
                            title={
                              protectedAdmin
                                ? "Le super administrateur est protégé"
                                : "Activer le compte"
                            }
                          >
                            <ShieldCheck size={15} />
                            <span>
                              {isLoading ? "..." : "Activer"}
                            </span>
                          </button>
                        )}

                        {protectedAdmin && (
                          <span className="admin-protected-label">
                            <ShieldCheck size={12} />
                            Protégé
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredUsers.length > 0 && (
          <footer className="users-table-footer">
            <span>
              Affichage de {filteredUsers.length} sur {users.length} compte(s)
            </span>
            <span>
              <ShieldCheck size={14} />
              Accès administrateur
            </span>
          </footer>
        )}
      </section>
    </main>
  );
}

export default UserManagement;
