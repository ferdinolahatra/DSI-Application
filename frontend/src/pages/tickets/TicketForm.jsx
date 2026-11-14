
import { useEffect, useState } from "react";

import {
  X,
  Save,
  Ticket,
  UserRound,
  RefreshCw,
  AlertCircle,
  Monitor,
  Laptop,
  Smartphone,
} from "lucide-react";

import api from "../../services/api";
import "./TicketForm.css";

/* =====================================================
   CATÉGORIES
===================================================== */

const CATEGORIES = [
  { value: "MATERIEL", label: "Matériel informatique" },
  { value: "TELEPHONE", label: "Téléphone" },
  { value: "LOGICIEL", label: "Logiciel" },
  { value: "RESEAU", label: "Réseau" },
  { value: "ACCES", label: "Accès système" },
  { value: "AUTRE", label: "Autre" },
];

/* =====================================================
   PRIORITÉS
===================================================== */

const PRIORITIES = [
  { value: "FAIBLE", label: "Faible" },
  { value: "MOYENNE", label: "Moyen" },
  { value: "URGENTE", label: "Urgent" },
  { value: "TRES_URGENTE", label: "Très urgent" },
];

/* =====================================================
   SERVICES
===================================================== */

const SERVICE_ALIASES = {
  DPMEP: [
    "DPMEP",
    "DIRECTION DU PACTE MORAL ET DE L ETHIQUE PUBLIQUE",
  ],
  DAI: [
    "DAI",
    "DIRECTION DE L AUDIT INTERNE",
  ],
  PRMP: [
    "PRMP",
    "PERSONNE RESPONSABLE DES MARCHES PUBLICS",
  ],
  DGCR: [
    "DGCR",
    "DIRECTION GENERALE DE LA COORDINATION DE LA REFONDATION",
  ],
  DGC: [
    "DGC",
    "DIRECTION GENERALE DE LA CONCERTATION",
  ],
  DGESO: [
    "DGESO",
    "DIRECTION GENERALE DES ENCADREMENTS STRATEGIQUES ET OPERATIONNELS",
  ],
  DRH: [
    "DRH",
    "DIRECTION DES RESSOURCES HUMAINES",
  ],
  DAAF: [
    "DAAF",
    "DIRECTION DES AFFAIRES ADMINISTRATIVES ET FINANCIERES",
  ],
  DAJ: [
    "DAJ",
    "DIRECTION DES AFFAIRES JURIDIQUES",
  ],
  DCOM: [
    "DCOM",
    "DIRECTION DE LA COMMUNICATION",
  ],
  DSI: [
    "DSI",
    "DIRECTION DES SYSTEMES D INFORMATION",
  ],
};

const SERVICE_OPTIONS = [
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
   MATÉRIELS ET PROBLÈMES
===================================================== */

const MATERIELS = [
  {
    value: "BUREAU",
    label: "Ordinateur de bureau",
    icon: Monitor,
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
    icon: Laptop,
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
    icon: Smartphone,
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

const MATERIAL_TYPES = MATERIELS.filter(
  (item) => item.value !== "TELEPHONE"
);

/* =====================================================
   PROBLÈMES PAR CATÉGORIE
===================================================== */

const CATEGORY_PROBLEMS = {
  TELEPHONE: [
    "Téléphone ne s'allume pas",
    "Téléphone bloqué ou ne répond plus",
    "Téléphone redémarre tout seul",
    "Batterie défectueuse",
    "Batterie se décharge rapidement",
    "Téléphone ne charge pas",
    "Chargeur ou câble défectueux",
    "Connecteur de charge endommagé",
    "Écran cassé ou fissuré",
    "Écran tactile ne fonctionne pas",
    "Écran noir",
    "Carte SIM non détectée",
    "Problème de réseau mobile ou de signal",
    "Impossible de passer des appels",
    "Impossible de recevoir des appels",
    "Problème de qualité des appels",
    "Problème d'envoi ou de réception des SMS",
    "Connexion Internet mobile indisponible",
    "Problème de configuration Internet mobile",
    "Connexion Wi-Fi indisponible",
    "Bluetooth ne fonctionne pas",
    "Problème de son ou de haut-parleur",
    "Microphone ne fonctionne pas",
    "Caméra ou appareil photo défectueux",
    "Application ne fonctionne pas",
    "Installation d'une application",
    "Téléphone trop lent",
    "Mémoire ou stockage saturé",
    "Problème de mise à jour",
    "Configuration d'un compte utilisateur",
    "Configuration de la messagerie électronique",
    "Transfert ou sauvegarde des données",
    "Autre problème de téléphone",
  ],

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

/* =====================================================
   FORMULAIRE INITIAL
===================================================== */

const EMPTY_FORM = {
  demandeur: "",
  service: "",
  categorie: "MATERIEL",
  typeMateriel: "",
  probleme: "",
  priorite: "MOYENNE",
  description: "",
};

/* =====================================================
   UTILITAIRES
===================================================== */

function readList(data) {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  if (Array.isArray(data?.users)) {
    return data.users;
  }

  return [];
}

function relationId(value) {
  if (value == null || value === "") return "";

  if (typeof value === "object") {
    return value.id ?? value.pk ?? "";
  }

  return /^\d+$/.test(String(value))
    ? String(value)
    : "";
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

function getServiceCode(value) {
  if (!value) return "";

  const normalized = normalizeText(value);

  for (const [code, aliases] of Object.entries(SERVICE_ALIASES)) {
    if (
      aliases.some(
        (alias) => normalizeText(alias) === normalized
      )
    ) {
      return code;
    }
  }

  const directMatch = SERVICE_OPTIONS.find(
    (service) =>
      normalizeText(service.value) === normalized
  );

  return directMatch?.value || String(value).trim();
}

function getUserLabel(user) {
  if (!user) return "Utilisateur";

  const name = [
    user.first_name,
    user.last_name,
  ]
    .filter(Boolean)
    .join(" ");

  const nom =
    name ||
    user.username ||
    user.identifiant ||
    `Utilisateur ${user.id}`;

  return [
    nom,
    user.fonction || "",
    user.service
      ? `Service : ${getServiceCode(user.service)}`
      : "",
    user.username && name
      ? `(${user.username})`
      : "",
  ]
    .filter(Boolean)
    .join(" — ");
}

function unwrapUser(data) {
  return (
    data?.user ??
    data?.data?.user ??
    data?.data ??
    data ??
    {}
  );
}

function getStoredUser() {
  try {
    const stored = JSON.parse(
      localStorage.getItem("user") || "{}"
    );

    return unwrapUser(stored);
  } catch (error) {
    console.error(
      "Erreur de lecture du profil connecté :",
      error
    );

    return {};
  }
}

function isAdminUser(user) {
  const role = normalizeText(user?.role);

  return (
    user?.is_superuser === true ||
    user?.is_staff === true ||
    role === "ADMIN" ||
    role === "ADMINISTRATEUR"
  );
}

/* =====================================================
   GROUPE DU DEMANDEUR
===================================================== */

function getRequesterGroup(user) {
  const fonction = normalizeText(user?.fonction);

  const directeurService =
    fonction.includes("DIRECTEUR DE SERVICE") ||
    fonction.includes("DIRECTEUR DU SERVICE") ||
    fonction.includes("DIRECTEUR DES SERVICES") ||
    fonction.includes("DIRECTEUR SERVICE");

  const secretaireGeneral =
    fonction.includes("SECRETAIRE GENERAL") ||
    fonction === "SG" ||
    fonction === "S G";

  const coordonnateurGeneral =
    fonction.includes("COORDONNATEUR GENERAL") ||
    fonction.includes("COORDINATEUR GENERAL");

  if (
    fonction.includes("MINISTRE") ||
    coordonnateurGeneral ||
    fonction.includes("DIRECTEUR GENERAL") ||
    fonction === "DG" ||
    fonction === "D G" ||
    secretaireGeneral ||
    (
      fonction.includes("DIRECTEUR") &&
      !directeurService
    )
  ) {
    return "PRIORITAIRE";
  }

  if (
    directeurService ||
    (
      fonction.includes("SECRETAIRE") &&
      !secretaireGeneral
    )
  ) {
    return "URGENT";
  }

  return "MOYEN";
}

/* =====================================================
   PRIORITÉ AUTOMATIQUE
===================================================== */

function getPriorityFromRequester(user) {
  const groupe = getRequesterGroup(user);

  if (groupe === "PRIORITAIRE") {
    return "TRES_URGENTE";
  }

  if (groupe === "URGENT") {
    return "URGENTE";
  }

  return "MOYENNE";
}

function getPriorityLabel(value) {
  return (
    PRIORITIES.find(
      (item) => item.value === value
    )?.label || "Moyen"
  );
}

/* =====================================================
   EXTRACTION DES ANCIENS TICKETS
===================================================== */

function findMaterialValue(label) {
  const material = MATERIELS.find(
    (item) =>
      normalizeText(item.label) === normalizeText(label)
  );

  return material?.value || "";
}

function extractRequestInfo(description) {
  const text = String(description || "");

  const oldRegex =
    /^\[INFORMATIONS MATERIELLES\]\r?\nType de matériel : (.*?)\r?\nProblème : (.*?)\r?\n\r?\n([\s\S]*)$/;

  const oldMatch = text.match(oldRegex);

  if (oldMatch) {
    const typeMateriel = findMaterialValue(oldMatch[1]);

    const material = MATERIELS.find(
      (item) => item.value === typeMateriel
    );

    const probleme =
      material?.problems.find(
        (item) =>
          normalizeText(item) ===
          normalizeText(oldMatch[2])
      ) || oldMatch[2];

    return {
      typeMateriel,
      probleme,
      description: oldMatch[3],
    };
  }

  const newRegex =
    /^\[INFORMATIONS DEMANDE DSI\]\r?\nCatégorie : .*?\r?\n(?:Type de matériel : (.*?)\r?\n)?Problème : (.*?)\r?\n(?:Priorité attribuée : .*?\r?\n)?\r?\nDescription complémentaire :\r?\n([\s\S]*)$/;

  const newMatch = text.match(newRegex);

  if (newMatch) {
    const typeMateriel = findMaterialValue(
      newMatch[1] || ""
    );

    return {
      typeMateriel,
      probleme: newMatch[2] || "",
      description: newMatch[3] || "",
    };
  }

  return {
    typeMateriel: "",
    probleme: "",
    description: text,
  };
}

/* =====================================================
   CONSTRUCTION DE LA DESCRIPTION
===================================================== */

function buildTicketDescription(form) {
  const category = CATEGORIES.find(
    (item) => item.value === form.categorie
  );

  const material = MATERIELS.find(
    (item) => item.value === form.typeMateriel
  );

  return [
    "[INFORMATIONS DEMANDE DSI]",

    `Catégorie : ${
      category?.label || form.categorie
    }`,

    ...(
      form.categorie === "MATERIEL" && material
        ? [`Type de matériel : ${material.label}`]
        : []
    ),

    `Problème : ${form.probleme}`,

    "",

    "Description complémentaire :",

    form.description.trim(),

  ].join("\n");
}

/* =====================================================
   OBJET AUTOMATIQUE
===================================================== */

function buildTicketObject(form) {
  const category = CATEGORIES.find(
    (item) => item.value === form.categorie
  );

  const material = MATERIELS.find(
    (item) => item.value === form.typeMateriel
  );

  let prefix =
    category?.label || "Demande DSI";

  if (
    form.categorie === "MATERIEL" &&
    material
  ) {
    prefix = material.label;
  }

  const probleme =
    form.probleme || "Assistance informatique";

  return `${prefix} - ${probleme}`.slice(0, 255);
}

/* =====================================================
   INITIALISATION EN MODE MODIFICATION
===================================================== */

function initialForm(ticket) {
  if (!ticket) {
    return { ...EMPTY_FORM };
  }

  const details = extractRequestInfo(
    ticket.description
  );

  return {
    demandeur: relationId(
      ticket.demandeur_id ?? ticket.demandeur
    ),

    service: getServiceCode(
      ticket.service ?? ""
    ),

    categorie:
      ticket.categorie ?? "MATERIEL",

    typeMateriel:
      details.typeMateriel,

    probleme:
      details.probleme,

    priorite:
      ticket.priorite ?? "MOYENNE",

    description:
      details.description,
  };
}

/* =====================================================
   ERREURS API
===================================================== */

function formatApiError(data) {
  if (!data) {
    return "L'enregistrement a échoué. Veuillez réessayer.";
  }

  if (typeof data === "string") {
    return data;
  }

  if (data.detail) {
    return String(data.detail);
  }

  if (data.non_field_errors) {
    return data.non_field_errors.join(" ");
  }

  return Object.entries(data)
    .map(([field, messages]) => {
      const message = Array.isArray(messages)
        ? messages.join(" ")
        : typeof messages === "string"
          ? messages
          : JSON.stringify(messages);

      return `${field} : ${message}`;
    })
    .join(" | ") || "L'enregistrement a échoué.";
}

/* =====================================================
   COMPOSANT TICKET FORM
===================================================== */

function TicketForm({
  ticket = null,
  onClose,
  onSaved,
}) {
  const isEditing = Boolean(ticket?.id);

  /* ---------------------------------------------------
     PROFIL CONNECTÉ
  --------------------------------------------------- */

  const [currentUser, setCurrentUser] = useState(
    () => getStoredUser()
  );

  const isAdmin = isAdminUser(currentUser);

  const [loadingProfile, setLoadingProfile] = useState(true);

  /* ---------------------------------------------------
     FORMULAIRE
  --------------------------------------------------- */

  const [form, setForm] = useState(
    () => initialForm(ticket)
  );

  const [users, setUsers] = useState([]);

  const [loadingUsers, setLoadingUsers] = useState(false);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [usersWarning, setUsersWarning] = useState("");

  /* ===================================================
     CHARGEMENT DU PROFIL CONNECTÉ
  =================================================== */

  useEffect(() => {
    let mounted = true;

    async function loadCurrentUser() {
      setLoadingProfile(true);

      try {
        const response = await api.get("/auth/me/");

        const user = unwrapUser(response.data);

        if (!mounted) return;

        setCurrentUser(user);

        localStorage.setItem(
          "user",
          JSON.stringify(user)
        );

        if (!isEditing) {
          const userId =
            user?.id ??
            user?.user_id ??
            user?.pk ??
            "";

          setForm((previous) => ({
            ...previous,
            demandeur: relationId(userId),
            service: getServiceCode(user?.service || ""),
          }));
        }

      } catch (err) {
        console.warn(
          "Impossible de récupérer le profil connecté :",
          err
        );

      } finally {
        if (mounted) {
          setLoadingProfile(false);
        }
      }
    }

    loadCurrentUser();

    return () => {
      mounted = false;
    };

  }, [isEditing]);

  /* ===================================================
     CHARGEMENT DES UTILISATEURS

     Uniquement pour la modification par l'administrateur.
     La création utilise toujours le compte connecté.
  =================================================== */

  useEffect(() => {
    let mounted = true;

    if (!isAdmin || !isEditing) {
      setUsers([]);
      setLoadingUsers(false);

      return () => {
        mounted = false;
      };
    }

    async function loadUsers() {
      setLoadingUsers(true);
      setUsersWarning("");

      try {
        const response = await api.get("/users/");

        if (mounted) {
          setUsers(readList(response.data));
        }

      } catch (err) {
        console.error(
          "Chargement des utilisateurs :",
          err
        );

        if (mounted) {
          setUsersWarning(
            "Impossible de charger la liste des utilisateurs. Vérifiez l'API /users/ et vos permissions."
          );
        }

      } finally {
        if (mounted) {
          setLoadingUsers(false);
        }
      }
    }

    loadUsers();

    return () => {
      mounted = false;
    };

  }, [isAdmin, isEditing]);

  /* ===================================================
     UTILISATEURS ACTIFS
  =================================================== */

  const activeUsers = users.filter(
    (user) =>
      user.compte_actif !== false &&
      user.is_active !== false
  );

  /* ===================================================
     GROUPES DE DEMANDEURS
  =================================================== */

  const requesterGroups = [
    {
      label: "PRIORITAIRE",
      users: activeUsers.filter(
        (user) =>
          getRequesterGroup(user) === "PRIORITAIRE"
      ),
    },
    {
      label: "URGENT",
      users: activeUsers.filter(
        (user) =>
          getRequesterGroup(user) === "URGENT"
      ),
    },
    {
      label: "MOYEN",
      users: activeUsers.filter(
        (user) =>
          getRequesterGroup(user) === "MOYEN"
      ),
    },
  ];

  /* ===================================================
     DEMANDEUR SÉLECTIONNÉ
  =================================================== */

  const selectedRequester =
    isAdmin && isEditing
      ? activeUsers.find(
          (user) =>
            String(user.id) === String(form.demandeur)
        ) ||
        (
          relationId(
            ticket?.demandeur_id ?? ticket?.demandeur
          ) === relationId(
            currentUser?.id ??
            currentUser?.user_id ??
            currentUser?.pk
          )
            ? currentUser
            : null
        )
      : currentUser?.id ||
        currentUser?.user_id ||
        currentUser?.pk
        ? currentUser
        : null;

  const selectedMaterial = MATERIELS.find(
    (item) => item.value === form.typeMateriel
  );

  /* ===================================================
     PROBLÈMES DISPONIBLES
  =================================================== */

  const availableProblems =
    form.categorie === "MATERIEL"
      ? selectedMaterial?.problems || []
      : CATEGORY_PROBLEMS[form.categorie] || [];

  /* ===================================================
     PRIORITÉ AUTOMATIQUE
  =================================================== */

  const automaticPriority = selectedRequester
    ? getPriorityFromRequester(selectedRequester)
    : form.priorite;

  /* ===================================================
     SYNCHRONISATION SERVICE ET PRIORITÉ
  =================================================== */

  useEffect(() => {
    if (!selectedRequester) return;

    setForm((current) => ({
      ...current,

      service: getServiceCode(
        selectedRequester.service || current.service
      ),

      priorite: getPriorityFromRequester(
        selectedRequester
      ),
    }));

  }, [
    selectedRequester?.id,
    selectedRequester?.service,
    selectedRequester?.fonction,
  ]);

  /* ===================================================
     CHANGEMENT DES CHAMPS
  =================================================== */

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => {
      const updated = {
        ...current,
        [name]: value,
      };

      if (name === "categorie") {
        updated.typeMateriel = "";
        updated.probleme = "";
      }

      if (name === "typeMateriel") {
        updated.probleme = "";
      }

      if (name === "demandeur") {
        const requester = activeUsers.find(
          (user) =>
            String(user.id) === String(value)
        );

        updated.service = requester?.service
          ? getServiceCode(requester.service)
          : "";

        updated.priorite = requester
          ? getPriorityFromRequester(requester)
          : "MOYENNE";
      }

      return updated;
    });

    setError("");
  }

  /* ===================================================
     ENREGISTRER LE TICKET
  =================================================== */

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");

    if (loadingProfile) {
      setError(
        "Veuillez patienter pendant le chargement de votre profil."
      );
      return;
    }

    /* -------------------------------------------------
       IDENTIFIER LE DEMANDEUR
    ------------------------------------------------- */

    const selectedRequesterId =
      isAdmin && isEditing
        ? relationId(form.demandeur)
        : relationId(
            currentUser?.id ??
            currentUser?.user_id ??
            currentUser?.pk
          );

    if (!selectedRequesterId) {
      setError(
        "Impossible d'identifier le demandeur du ticket."
      );
      return;
    }

    /* -------------------------------------------------
       VÉRIFIER LE DEMANDEUR
    ------------------------------------------------- */

    if (!selectedRequester) {
      setError(
        "Le demandeur sélectionné est introuvable ou son compte n'est pas actif."
      );
      return;
    }

    /* -------------------------------------------------
       VÉRIFIER LE SERVICE
    ------------------------------------------------- */

    const service = getServiceCode(
      selectedRequester.service || form.service
    );

    if (!String(service || "").trim()) {
      setError(
        "Le service du demandeur n'est pas renseigné dans son inscription."
      );
      return;
    }

    /* -------------------------------------------------
       VÉRIFIER LE MATÉRIEL
    ------------------------------------------------- */

    if (
      form.categorie === "MATERIEL" &&
      !form.typeMateriel
    ) {
      setError(
        "Veuillez sélectionner le type de matériel."
      );
      return;
    }

    /* -------------------------------------------------
       VÉRIFIER LE PROBLÈME
    ------------------------------------------------- */

    if (!form.probleme) {
      setError(
        "Veuillez sélectionner le problème rencontré."
      );
      return;
    }

    /* -------------------------------------------------
       VÉRIFIER LA DESCRIPTION
    ------------------------------------------------- */

    if (!form.description.trim()) {
      setError(
        "La description complémentaire est obligatoire."
      );
      return;
    }

    /* -------------------------------------------------
       CONSTRUIRE LE PAYLOAD
    ------------------------------------------------- */

    const payload = {
      demandeur: Number(selectedRequesterId),

      service,

      categorie: form.categorie,

      priorite: getPriorityFromRequester(
        selectedRequester
      ),

      objet: buildTicketObject(form),

      description: buildTicketDescription(form),
    };

    setSaving(true);

    try {
      if (isEditing) {
        await api.patch(
          `/tickets/${ticket.id}/`,
          payload
        );
      } else {
        await api.post(
          "/tickets/",
          payload
        );
      }

      if (typeof onSaved === "function") {
        await onSaved();
      }

    } catch (err) {
      console.error(
        "Enregistrement du ticket :",
        err.response?.data || err
      );

      if (err.response?.status === 401) {
        setError(
          "Votre session a expiré. Reconnectez-vous."
        );

      } else if (err.response?.status === 403) {
        setError(
          "Accès refusé. Votre compte ne peut pas effectuer cette opération."
        );

      } else {
        setError(
          formatApiError(err.response?.data)
        );
      }

    } finally {
      setSaving(false);
    }
  }

  /* ===================================================
     AFFICHAGE
  =================================================== */

  const selectedService = getServiceCode(
    selectedRequester?.service || form.service
  );

  const serviceIsListed = SERVICE_OPTIONS.some(
    (item) => item.value === selectedService
  );

  return (
    <div
      className="ticket-form-backdrop"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !saving
        ) {
          onClose();
        }
      }}
    >
      <section
        className="ticket-form-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ticket-form-title"
      >
        {/* EN-TÊTE */}

        <header className="ticket-form-header">
          <div className="ticket-form-heading-icon">
            <Ticket size={22} />
          </div>

          <div className="ticket-form-heading-text">
            <span className="ticket-form-eyebrow">
              GESTION DU SUPPORT
            </span>

            <h2 id="ticket-form-title">
              {isEditing
                ? `Modifier ${ticket.numero ?? `le ticket #${ticket.id}`}`
                : "Créer un ticket"}
            </h2>

            <p>
              {isEditing
                ? "Modifiez les informations de cette demande."
                : "Renseignez les informations de votre demande d'assistance."}
            </p>
          </div>

          <button
            type="button"
            className="ticket-form-close"
            onClick={onClose}
            disabled={saving}
            aria-label="Fermer le formulaire"
          >
            <X size={20} />
          </button>
        </header>

        {/* FORMULAIRE */}

        <form onSubmit={handleSubmit}>
          <div className="ticket-form-body">
            {error && (
              <div
                className="ticket-form-error"
                role="alert"
              >
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {usersWarning && (
              <div
                className="ticket-form-warning"
                role="status"
              >
                {usersWarning}
              </div>
            )}

            {/* INFORMATIONS DU DEMANDEUR */}

            <div className="ticket-form-section-title">
              <UserRound size={17} />
              Informations du demandeur
            </div>

            <div className="ticket-form-grid">
              {/* DEMANDEUR */}

              <div className="ticket-field">
                <label htmlFor="ticket-demandeur">
                  Demandeur <span>*</span>
                </label>

                {isAdmin && isEditing ? (
                  <select
                    id="ticket-demandeur"
                    name="demandeur"
                    value={form.demandeur}
                    onChange={updateField}
                    required
                    disabled={saving || loadingUsers}
                  >
                    <option value="">
                      {loadingUsers
                        ? "Chargement des utilisateurs..."
                        : "Sélectionner un demandeur"}
                    </option>

                    {requesterGroups.map((group) => (
                      <optgroup
                        key={group.label}
                        label={`${group.label} (${group.users.length})`}
                      >
                        {group.users.map((user) => (
                          <option
                            key={user.id}
                            value={user.id}
                          >
                            {getUserLabel(user)}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                ) : (
                  <input
                    id="ticket-demandeur"
                    value={
                      selectedRequester
                        ? getUserLabel(selectedRequester)
                        : loadingProfile
                          ? "Chargement du profil..."
                          : "Utilisateur non identifié"
                    }
                    readOnly
                    disabled
                  />
                )}

                {!isEditing && (
                  <small>
                    Votre compte connecté est automatiquement
                    enregistré comme demandeur.
                  </small>
                )}

                {isAdmin && isEditing && (
                  <small>
                    Vous pouvez modifier le demandeur de ce ticket.
                  </small>
                )}
              </div>

              {/* SERVICE */}

              <div className="ticket-field">
                <label htmlFor="ticket-service">
                  Service <span>*</span>
                </label>

                {serviceIsListed ? (
                  <select
                    id="ticket-service"
                    name="service"
                    value={selectedService}
                    disabled
                  >
                    <option value="">
                      Sélectionner le service
                    </option>

                    {SERVICE_OPTIONS.map((service) => (
                      <option
                        key={service.value}
                        value={service.value}
                      >
                        {service.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="ticket-service"
                    value={selectedService}
                    readOnly
                    disabled
                  />
                )}

                <small>
                  Service récupéré depuis le profil du demandeur.
                </small>
              </div>

              {/* FONCTION */}

              {selectedRequester && (
                <div className="ticket-field">
                  <label htmlFor="ticket-fonction">
                    Fonction du demandeur
                  </label>

                  <input
                    id="ticket-fonction"
                    value={selectedRequester.fonction || ""}
                    readOnly
                    disabled
                  />
                </div>
              )}

              {/* PRIORITÉ AUTOMATIQUE */}

              <div className="ticket-field">
                <label htmlFor="ticket-priorite">
                  Priorité attribuée automatiquement
                </label>

                <input
                  id="ticket-priorite"
                  value={getPriorityLabel(automaticPriority)}
                  readOnly
                  disabled
                />

                <small>
                  Cette priorité est déterminée selon la fonction
                  du demandeur.
                </small>
              </div>
            </div>

            {/* DÉTAILS DE LA DEMANDE */}

            <div className="ticket-form-section-title">
              <Ticket size={17} />
              Détails de la demande
            </div>

            <div className="ticket-form-grid">
              {/* CATÉGORIE */}

              <div className="ticket-field">
                <label htmlFor="ticket-categorie">
                  Catégorie <span>*</span>
                </label>

                <select
                  id="ticket-categorie"
                  name="categorie"
                  value={form.categorie}
                  onChange={updateField}
                  required
                  disabled={saving}
                >
                  {CATEGORIES.map((category) => (
                    <option
                      key={category.value}
                      value={category.value}
                    >
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* TYPE DE MATÉRIEL */}

              {form.categorie === "MATERIEL" && (
                <div className="ticket-field">
                  <label htmlFor="ticket-type-materiel">
                    Type de matériel <span>*</span>
                  </label>

                  <select
                    id="ticket-type-materiel"
                    name="typeMateriel"
                    value={form.typeMateriel}
                    onChange={updateField}
                    required
                    disabled={saving}
                  >
                    <option value="">
                      Sélectionner le matériel
                    </option>

                    {MATERIAL_TYPES.map((material) => (
                      <option
                        key={material.value}
                        value={material.value}
                      >
                        {material.label}
                      </option>
                    ))}

                    {form.typeMateriel === "TELEPHONE" && (
                      <option value="TELEPHONE">
                        Téléphone (ancien classement)
                      </option>
                    )}
                  </select>
                </div>
              )}

              {/* PROBLÈME RENCONTRÉ */}

              {availableProblems.length > 0 && (
                <div className="ticket-field">
                  <label htmlFor="ticket-probleme">
                    Problème rencontré <span>*</span>
                  </label>

                  <select
                    id="ticket-probleme"
                    name="probleme"
                    value={form.probleme}
                    onChange={updateField}
                    required
                    disabled={
                      saving ||
                      (
                        form.categorie === "MATERIEL" &&
                        !form.typeMateriel
                      )
                    }
                  >
                    <option value="">
                      Sélectionner le problème
                    </option>

                    {availableProblems.map((problem) => (
                      <option
                        key={problem}
                        value={problem}
                      >
                        {problem}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* APERÇU MATÉRIEL */}

              {form.categorie === "MATERIEL" &&
                selectedMaterial && (
                  <div className="ticket-field ticket-field-full">
                    <div className="ticket-form-section-title">
                      {(() => {
                        const Icon = selectedMaterial.icon;
                        return <Icon size={18} />;
                      })()}
                      Matériel sélectionné
                    </div>

                    <p className="ticket-form-note">
                      {selectedMaterial.label}

                      {form.probleme
                        ? ` — ${form.probleme}`
                        : " — Sélectionnez le problème rencontré."}
                    </p>
                  </div>
                )}

              {/* APERÇU TÉLÉPHONE */}

              {form.categorie === "TELEPHONE" && (
                <div className="ticket-field ticket-field-full">
                  <div className="ticket-form-section-title">
                    <Smartphone size={18} />
                    Assistance téléphonique
                  </div>

                  <p className="ticket-form-note">
                    Sélectionnez le problème rencontré
                    sur le téléphone dans la liste ci-dessus.
                  </p>
                </div>
              )}

              {/* DESCRIPTION */}

              <div className="ticket-field ticket-field-full">
                <label htmlFor="ticket-description">
                  Description détaillée <span>*</span>
                </label>

                <textarea
                  id="ticket-description"
                  name="description"
                  value={form.description}
                  onChange={updateField}
                  placeholder="Décrivez le problème, les circonstances et le message d'erreur éventuel..."
                  rows={5}
                  required
                  disabled={saving}
                />
              </div>
            </div>
          </div>

          {/* PIED DU FORMULAIRE */}

          <footer className="ticket-form-footer">
            <button
              type="button"
              className="ticket-form-cancel"
              onClick={onClose}
              disabled={saving}
            >
              Annuler
            </button>

            <button
              type="submit"
              className="ticket-form-submit"
              disabled={
                saving ||
                loadingProfile ||
                (isAdmin && isEditing && loadingUsers)
              }
            >
              {saving ? (
                <>
                  <RefreshCw
                    size={17}
                    className="tickets-spinning"
                  />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save size={17} />
                  {isEditing
                    ? "Enregistrer les modifications"
                    : "Créer le ticket"}
                </>
              )}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export default TicketForm;
