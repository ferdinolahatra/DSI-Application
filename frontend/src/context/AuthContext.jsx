
import {
  createContext,
  useContext,
  useState,
} from "react";

const AuthContext = createContext(null);

/* =====================================================
   RÉCUPÉRATION SÉCURISÉE DES DONNÉES
===================================================== */

function getSavedUser() {
  try {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) {
      return null;
    }

    const parsedUser = JSON.parse(savedUser);

    return parsedUser && typeof parsedUser === "object"
      ? parsedUser
      : null;
  } catch (error) {
    console.error(
      "Impossible de récupérer les informations utilisateur :",
      error
    );

    return null;
  }
}

/* =====================================================
   AUTH PROVIDER
===================================================== */

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getSavedUser);

  const [accessToken, setAccessToken] = useState(() => {
    return localStorage.getItem("access_token");
  });

  /* ===================================================
     CONNEXION
  =================================================== */

  const login = (userData, access, refresh) => {
    if (!userData || typeof userData !== "object") {
      throw new Error("Les informations utilisateur sont invalides.");
    }

    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("access_token", access);
    localStorage.setItem("refresh_token", refresh);

    setUser(userData);
    setAccessToken(access);
  };

  /* ===================================================
     MISE À JOUR DES INFORMATIONS UTILISATEUR
  =================================================== */

  const updateUser = (userData) => {
    if (!userData || typeof userData !== "object") {
      return;
    }

    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  /* ===================================================
     DÉCONNEXION
  =================================================== */

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("connected");

    setUser(null);
    setAccessToken(null);
  };

  /* ===================================================
     CONTEXTE
  =================================================== */

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        login,
        logout,
        updateUser,
        isAuthenticated: !!accessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* =====================================================
   HOOK PERSONNALISÉ
===================================================== */

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth doit être utilisé à l'intérieur de AuthProvider."
    );
  }

  return context;
}
