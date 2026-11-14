import axios from "axios";

const API_URL = "http://127.0.0.1:8000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Évite plusieurs renouvellements simultanés du même jeton.
let refreshPromise = null;

// Ajouter automatiquement le jeton d'accès aux requêtes.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Renouveler le jeton si Django renvoie une erreur 401.
api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const requestUrl = originalRequest?.url || "";

    // Ne traiter que les erreurs d'authentification 401.
    if (status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    // Ne pas renouveler les jetons sur les routes d'authentification.
    if (
      requestUrl.includes("/auth/login/") ||
      requestUrl.includes("/auth/refresh/") ||
      originalRequest._retry
    ) {
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem("refresh_token");

    // Aucun jeton de renouvellement disponible.
    if (!refreshToken) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");

      return Promise.reject(error);
    }

    // Ne réessayer la requête d'origine qu'une seule fois.
    originalRequest._retry = true;

    try {
      // Partager le même renouvellement entre les requêtes simultanées.
      if (!refreshPromise) {
        refreshPromise = axios
          .post(`${API_URL}/auth/refresh/`, {
            refresh: refreshToken,
          })
          .then((response) => {
            const newAccessToken = response.data.access;
            const newRefreshToken = response.data.refresh;

            if (!newAccessToken) {
              throw new Error(
                "Le serveur n'a pas retourné de nouveau jeton d'accès."
              );
            }

            localStorage.setItem("access_token", newAccessToken);

            // Avec la rotation des jetons, Django peut aussi
            // retourner un nouveau refresh_token.
            if (newRefreshToken) {
              localStorage.setItem("refresh_token", newRefreshToken);
            }

            return newAccessToken;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const newAccessToken = await refreshPromise;

      // Réexécuter la requête avec le nouveau jeton.
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      return api(originalRequest);
    } catch (refreshError) {
      // Le renouvellement a échoué : il faut se reconnecter.
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");

      return Promise.reject(refreshError);
    }
  }
);

export default api;