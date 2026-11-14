
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Search,
  FileText,
  Ticket,
  Wrench,
  Bell,
  Users,
  LayoutDashboard,
  MessageSquare,
  ShieldCheck,
  LogOut,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Circle,
  Download,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  AlertCircle,
  X,
  GraduationCap,
  ClipboardList,
  Lightbulb,
  FolderOpen,
  Clock,
  ArrowRight,
  Home,
} from "lucide-react";

import api from "../../services/api";
import DocumentForm from "./DocumentForm";
import "./DocumentsPage.css";

const BACKEND_URL = "http://127.0.0.1:8000";

const GUIDE_CHAPTERS = [
  {
    id: "presentation",
    number: "01",
    title: "Présentation de la plateforme",
    subtitle: "Comprendre le fonctionnement général",
    icon: LayoutDashboard,
    category: "Démarrage",
    intro:
      "La plateforme de gestion DSI centralise les demandes d'assistance informatique, leur traitement, les interventions techniques, les notifications et les documents de la Direction des Systèmes d'Information.",
    steps: [
      {
        title: "Accéder à la plateforme",
        description:
          "Ouvrez votre navigateur et accédez à l'adresse de la plateforme communiquée par votre administrateur DSI.",
      },
      {
        title: "Comprendre les modules",
        description:
          "Le menu latéral permet d'accéder aux différents espaces disponibles : tableau de bord, tickets, interventions, notifications, documents et autres modules autorisés.",
      },
      {
        title: "Utiliser votre compte personnel",
        description:
          "Chaque utilisateur doit utiliser son propre identifiant. Ne partagez jamais votre mot de passe avec une autre personne.",
      },
    ],
    tip:
      "Les menus et les actions accessibles peuvent varier selon les autorisations attribuées à votre compte.",
  },
  {
    id: "inscription",
    number: "02",
    title: "Inscription et création du compte",
    subtitle: "Créer votre accès à la plateforme",
    icon: Users,
    category: "Démarrage",
    intro:
      "Avant d'utiliser la plateforme, chaque nouvel utilisateur doit disposer d'un compte personnel.",
    steps: [
      {
        title: "Ouvrir la page d'inscription",
        description:
          "Depuis la page de connexion, sélectionnez le lien permettant de créer un compte ou de vous inscrire.",
      },
      {
        title: "Renseigner vos informations",
        description:
          "Complétez les champs demandés : nom, prénom, nom d'utilisateur, identifiant, adresse électronique, direction ou service et fonction.",
      },
      {
        title: "Créer un mot de passe",
        description:
          "Choisissez un mot de passe personnel suffisamment robuste et confirmez-le dans le champ prévu à cet effet.",
      },
      {
        title: "Envoyer la demande",
        description:
          "Vérifiez les informations saisies puis validez le formulaire d'inscription.",
      },
      {
        title: "Attendre la validation",
        description:
          "Si votre inscription nécessite une validation administrative, votre compte restera désactivé jusqu'à son activation par l'administrateur DSI.",
      },
    ],
    tip:
      "Utilisez des informations exactes, notamment votre fonction et votre service, afin de faciliter la validation de votre compte.",
  },
  {
    id: "connexion",
    number: "03",
    title: "Connexion et déconnexion",
    subtitle: "Accéder à votre espace personnel en sécurité",
    icon: ShieldCheck,
    category: "Démarrage",
    intro:
      "La connexion permet d'accéder à votre espace personnel à l'aide des identifiants associés à votre compte.",
    steps: [
      {
        title: "Ouvrir la page de connexion",
        description:
          "Accédez à la page de connexion de la plateforme DSI.",
      },
      {
        title: "Saisir vos identifiants",
        description:
          "Renseignez votre nom d'utilisateur ou l'identifiant demandé par le formulaire, puis votre mot de passe.",
      },
      {
        title: "Valider la connexion",
        description:
          "Cliquez sur le bouton de connexion. Si vos informations sont correctes et votre compte actif, vous accédez à votre espace.",
      },
      {
        title: "Se déconnecter",
        description:
          "À la fin de votre travail, utilisez la fonction Déconnexion de l'application pour fermer votre session.",
      },
    ],
    tip:
      "Si la connexion échoue, vérifiez vos identifiants et assurez-vous que votre compte a bien été activé.",
  },
  {
    id: "tableau-de-bord",
    number: "04",
    title: "Découvrir le tableau de bord",
    subtitle: "Comprendre les informations principales",
    icon: LayoutDashboard,
    category: "Utilisation",
    intro:
      "Le tableau de bord présente une vue synthétique de l'activité de la plateforme et des informations auxquelles votre compte a accès.",
    steps: [
      {
        title: "Consulter les indicateurs",
        description:
          "Les indicateurs peuvent présenter le nombre de tickets, les demandes en attente, les tickets en cours, les tickets résolus et les interventions.",
      },
      {
        title: "Comprendre les graphiques",
        description:
          "Les graphiques permettent de visualiser la répartition des tickets par catégorie, priorité, statut, service ou technicien, selon les données disponibles.",
      },
      {
        title: "Actualiser les informations",
        description:
          "Utilisez les fonctions d'actualisation disponibles sur la page pour consulter les données les plus récentes.",
      },
    ],
    tip:
      "Les statistiques affichées dépendent des données enregistrées et des permissions de votre compte.",
  },
  {
    id: "tickets",
    number: "05",
    title: "Créer et suivre un ticket",
    subtitle: "Déclarer une demande d'assistance informatique",
    icon: Ticket,
    category: "Tickets",
    intro:
      "Un ticket est une demande d'assistance informatique enregistrée dans la plateforme. Il permet de suivre un incident ou un besoin depuis sa déclaration jusqu'à son traitement.",
    steps: [
      {
        title: "Ouvrir le module Tickets",
        description:
          "Accédez au menu Tickets pour consulter les demandes auxquelles votre compte a accès.",
      },
      {
        title: "Créer une nouvelle demande",
        description:
          "Utilisez le bouton de création d'un ticket lorsque cette action est disponible.",
      },
      {
        title: "Choisir la catégorie",
        description:
          "Sélectionnez la catégorie correspondant au problème : matériel, logiciel, réseau, accès ou autre.",
      },
      {
        title: "Définir la priorité",
        description:
          "Choisissez le niveau de priorité adapté à la situation. Une demande très urgente doit correspondre à un besoin réellement prioritaire.",
      },
      {
        title: "Décrire le problème",
        description:
          "Donnez un titre clair et décrivez précisément le problème : contexte, matériel concerné, message d'erreur et circonstances.",
      },
      {
        title: "Enregistrer le ticket",
        description:
          "Vérifiez les informations puis validez la création. La plateforme attribue un numéro de référence au ticket.",
      },
      {
        title: "Suivre l'avancement",
        description:
          "Consultez la liste des tickets et ouvrez le ticket concerné pour vérifier son statut et les informations disponibles.",
      },
    ],
    tip:
      "Une description précise et, lorsque cela est possible, une capture du problème facilitent le diagnostic du technicien.",
    action: {
      label: "Ouvrir le module Tickets",
      path: "/tickets",
    },
  },
  {
    id: "commentaires",
    number: "06",
    title: "Commentaires et réponses",
    subtitle: "Échanger autour d'une demande",
    icon: MessageSquare,
    category: "Tickets",
    intro:
      "Les commentaires permettent au demandeur et aux personnes autorisées à intervenir sur un ticket d'échanger des informations complémentaires.",
    steps: [
      {
        title: "Ouvrir le ticket concerné",
        description:
          "Depuis la liste des tickets, ouvrez le ticket sur lequel vous souhaitez apporter une information.",
      },
      {
        title: "Consulter les échanges",
        description:
          "Consultez les commentaires déjà publiés afin de comprendre les informations communiquées.",
      },
      {
        title: "Ajouter un commentaire",
        description:
          "Utilisez la zone de commentaire pour transmettre une précision, répondre à une question ou communiquer une information utile.",
      },
      {
        title: "Répondre à un commentaire",
        description:
          "Lorsque l'action Répondre est disponible, sélectionnez le commentaire concerné puis saisissez votre réponse.",
      },
      {
        title: "Envoyer votre message",
        description:
          "Relisez votre texte et validez son envoi. Votre message sera associé au ticket.",
      },
    ],
    tip:
      "Restez précis et professionnel. Évitez de publier des mots de passe ou des informations confidentielles dans les commentaires.",
    action: {
      label: "Consulter les tickets",
      path: "/tickets",
    },
  },
  {
    id: "prise-en-charge",
    number: "07",
    title: "Prise en charge d'un ticket",
    subtitle: "Démarrer le traitement d'une demande",
    icon: ClipboardList,
    category: "Interventions",
    intro:
      "La prise en charge permet à une personne autorisée de commencer le traitement d'un ticket. Dans les règles de gestion de la plateforme, cette action est réservée à l'administrateur et au Technicien DSI.",
    steps: [
      {
        title: "Consulter les tickets disponibles",
        description:
          "Ouvrez le module Tickets et identifiez les demandes qui nécessitent une prise en charge.",
      },
      {
        title: "Examiner les informations",
        description:
          "Lisez la description, la catégorie, la priorité, les commentaires et les éventuelles informations complémentaires.",
      },
      {
        title: "Prendre en charge la demande",
        description:
          "Si vous êtes administrateur ou Technicien DSI autorisé, utilisez l'action de prise en charge proposée sur le ticket.",
      },
      {
        title: "Vérifier le statut",
        description:
          "Après la prise en charge, vérifiez que le ticket apparaît avec le statut correspondant au traitement en cours.",
      },
    ],
    tip:
      "Les utilisateurs qui ne disposent pas de l'autorisation de traitement peuvent consulter leurs demandes et communiquer des informations, mais ne peuvent pas prendre en charge un ticket.",
    action: {
      label: "Ouvrir les tickets",
      path: "/tickets",
    },
  },
  {
    id: "interventions",
    number: "08",
    title: "Réaliser une intervention",
    subtitle: "Enregistrer le travail technique effectué",
    icon: Wrench,
    category: "Interventions",
    intro:
      "Une intervention conserve la trace du diagnostic et des opérations réalisées pour résoudre un incident informatique.",
    steps: [
      {
        title: "Ouvrir le ticket en cours",
        description:
          "Sélectionnez le ticket pris en charge afin d'accéder à ses informations et à son suivi.",
      },
      {
        title: "Accéder à l'intervention",
        description:
          "Utilisez l'action permettant d'enregistrer une intervention lorsque vous disposez des autorisations nécessaires.",
      },
      {
        title: "Renseigner le diagnostic",
        description:
          "Décrivez la cause identifiée ou les vérifications techniques effectuées.",
      },
      {
        title: "Décrire la solution",
        description:
          "Indiquez les opérations réalisées et la solution apportée au problème.",
      },
      {
        title: "Renseigner la durée",
        description:
          "Saisissez la durée de l'intervention en respectant l'unité demandée par le formulaire.",
      },
      {
        title: "Indiquer le résultat",
        description:
          "Sélectionnez le résultat correspondant à l'intervention, notamment Résolu ou Non résolu selon les choix proposés dans le formulaire.",
      },
      {
        title: "Enregistrer l'intervention",
        description:
          "Vérifiez les informations puis enregistrez l'intervention afin de conserver son historique.",
      },
    ],
    tip:
      "Un diagnostic et une solution bien détaillés facilitent le suivi des incidents et les interventions ultérieures.",
  },
  {
    id: "notifications",
    number: "09",
    title: "Consulter les notifications",
    subtitle: "Rester informé des événements importants",
    icon: Bell,
    category: "Communication",
    intro:
      "Les notifications signalent les événements importants concernant les tickets, les commentaires, les changements de statut et les annonces.",
    steps: [
      {
        title: "Ouvrir les notifications",
        description:
          "Utilisez l'icône ou le menu Notifications de la plateforme.",
      },
      {
        title: "Lire une notification",
        description:
          "Sélectionnez une notification pour consulter son contenu et, lorsque cela est prévu, accéder à l'élément concerné.",
      },
      {
        title: "Vérifier les notifications non lues",
        description:
          "Consultez les notifications qui n'ont pas encore été lues afin de ne manquer aucune information importante.",
      },
      {
        title: "Marquer comme lue",
        description:
          "Utilisez les actions disponibles pour marquer une notification comme lue.",
      },
    ],
    tip:
      "Consultez régulièrement vos notifications pour suivre les réponses et les changements concernant vos demandes.",
  },
  {
    id: "documents-annonces",
    number: "10",
    title: "Documents et annonces",
    subtitle: "Accéder aux ressources de la DSI",
    icon: FolderOpen,
    category: "Communication",
    intro:
      "La bibliothèque documentaire centralise les guides, procédures, formulaires, notes techniques et autres ressources publiées par la DSI.",
    steps: [
      {
        title: "Ouvrir le menu Documents",
        description:
          "Accédez à la bibliothèque documentaire depuis le menu de la plateforme.",
      },
      {
        title: "Rechercher un document",
        description:
          "Utilisez la recherche et les filtres disponibles pour retrouver un document par son titre, sa description ou sa catégorie.",
      },
      {
        title: "Consulter ou télécharger",
        description:
          "Sélectionnez le document souhaité pour ouvrir le fichier ou le télécharger selon les possibilités proposées.",
      },
      {
        title: "Consulter les annonces",
        description:
          "Accédez au module Annonces pour prendre connaissance des informations, alertes et communications publiées par la DSI.",
      },
    ],
    tip:
      "Vérifiez la date et la version d'un document avant d'utiliser une procédure technique.",
  },
  {
    id: "administration",
    number: "11",
    title: "Gestion des utilisateurs",
    subtitle: "Administration et contrôle des comptes",
    icon: Users,
    category: "Administration",
    intro:
      "Les fonctions d'administration permettent aux personnes habilitées de gérer les comptes et de contrôler les accès à la plateforme.",
    steps: [
      {
        title: "Consulter les comptes",
        description:
          "L'administrateur accède au module de gestion des utilisateurs pour consulter les comptes enregistrés.",
      },
      {
        title: "Vérifier les informations",
        description:
          "Les informations utiles comprennent notamment le nom, le prénom, l'identifiant, la fonction et le service.",
      },
      {
        title: "Valider ou gérer un compte",
        description:
          "Selon les fonctions disponibles, l'administrateur peut valider, activer, désactiver ou modifier un compte.",
      },
      {
        title: "Respecter les autorisations",
        description:
          "Les permissions déterminent les actions qu'un utilisateur peut effectuer. Le traitement des tickets est réservé à l'administrateur et au Technicien DSI autorisé.",
      },
    ],
    tip:
      "N'accordez que les autorisations nécessaires aux missions de chaque utilisateur.",
  },
  {
    id: "historique-statistiques",
    number: "12",
    title: "Historique et statistiques",
    subtitle: "Suivre l'activité et les résultats",
    icon: ClipboardList,
    category: "Administration",
    intro:
      "L'historique et les statistiques permettent de conserver une trace des opérations et d'obtenir une vision globale de l'activité de la DSI.",
    steps: [
      {
        title: "Consulter l'historique",
        description:
          "Lorsque le module est disponible, consultez les actions enregistrées pour suivre les changements effectués sur les tickets et les interventions.",
      },
      {
        title: "Analyser les indicateurs",
        description:
          "Examinez le volume de tickets, les statuts, les catégories, les priorités et les durées d'intervention.",
      },
      {
        title: "Comparer les périodes",
        description:
          "Utilisez les filtres de période disponibles pour comparer l'évolution de l'activité.",
      },
      {
        title: "Utiliser les données avec prudence",
        description:
          "Les statistiques dépendent des informations réellement enregistrées dans la plateforme.",
      },
    ],
    tip:
      "Un ticket correctement renseigné améliore la qualité des statistiques et des rapports.",
  },
  {
    id: "bonnes-pratiques",
    number: "13",
    title: "Bonnes pratiques et sécurité",
    subtitle: "Utiliser la plateforme correctement",
    icon: ShieldCheck,
    category: "Sécurité",
    intro:
      "Chaque utilisateur contribue à la sécurité et à la qualité des informations enregistrées dans la plateforme.",
    steps: [
      {
        title: "Protéger son compte",
        description:
          "Ne partagez pas vos identifiants et choisissez un mot de passe difficile à deviner.",
      },
      {
        title: "Fournir des informations exactes",
        description:
          "Lors de la création d'un ticket, décrivez le problème de façon claire, précise et complète.",
      },
      {
        title: "Respecter les échanges",
        description:
          "Utilisez les commentaires pour communiquer des informations utiles et professionnelles.",
      },
      {
        title: "Ne pas divulguer de données sensibles",
        description:
          "Ne publiez pas de mots de passe, de codes secrets ou d'informations confidentielles dans les tickets.",
      },
      {
        title: "Se déconnecter",
        description:
          "Fermez votre session lorsque vous avez terminé, en particulier sur un ordinateur partagé.",
      },
    ],
    tip:
      "En cas de difficulté ou d'accès non autorisé, contactez l'administrateur ou le support DSI.",
  },
];

function getDocumentTitle(document) {
  return (
    document.titre ||
    document.nom ||
    document.title ||
    "Document sans titre"
  );
}

function getDocumentFileUrl(document) {
  const rawUrl =
    document.fichier_url ||
    document.fichier ||
    document.file ||
    document.url ||
    "";

  if (!rawUrl || typeof rawUrl !== "string") return "";

  if (/^https?:\/\//i.test(rawUrl)) return rawUrl;

  if (rawUrl.startsWith("/media/")) {
    return `${BACKEND_URL}${rawUrl}`;
  }

  if (rawUrl.startsWith("/documents/")) {
    return `${BACKEND_URL}/media${rawUrl}`;
  }

  if (rawUrl.startsWith("documents/")) {
    return `${BACKEND_URL}/media/${rawUrl}`;
  }

  if (rawUrl.startsWith("/")) {
    return `${BACKEND_URL}${rawUrl}`;
  }

  return `${BACKEND_URL}/media/${rawUrl.replace(/^\/+/, "")}`;
}

function getErrorMessage(error) {
  if (error.response?.status === 401) {
    return "Votre session a expiré. Veuillez vous reconnecter.";
  }

  if (error.response?.status === 403) {
    return "Vous n'avez pas la permission d'effectuer cette action.";
  }

  const data = error.response?.data;

  if (typeof data?.detail === "string") {
    return data.detail;
  }

  if (typeof data === "string") return data;

  return "Impossible de contacter le serveur Django. Vérifiez votre connexion.";
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

export default function DocumentsPage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("guide");
  const [activeChapter, setActiveChapter] = useState("presentation");
  const [guideSearch, setGuideSearch] = useState("");
  const [completedChapters, setCompletedChapters] = useState([]);

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("TOUTES");

  const [showForm, setShowForm] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);

  const user = getCurrentUser();

  const isAdmin =
    Boolean(user.is_superuser) ||
    Boolean(user.is_staff) ||
    String(user.role || "").toUpperCase() === "ADMIN";

  const currentChapter = GUIDE_CHAPTERS.find(
    (chapter) => chapter.id === activeChapter
  ) || GUIDE_CHAPTERS[0];

  const currentIndex = GUIDE_CHAPTERS.findIndex(
    (chapter) => chapter.id === currentChapter.id
  );

  const guideProgress = Math.round(
    (completedChapters.length / GUIDE_CHAPTERS.length) * 100
  );

  const filteredChapters = useMemo(() => {
    const query = guideSearch.trim().toLowerCase();

    if (!query) return GUIDE_CHAPTERS;

    return GUIDE_CHAPTERS.filter((chapter) => {
      const content = [
        chapter.title,
        chapter.subtitle,
        chapter.category,
        chapter.intro,
        chapter.tip,
        ...chapter.steps.map(
          (step) => `${step.title} ${step.description}`
        ),
      ]
        .join(" ")
        .toLowerCase();

      return content.includes(query);
    });
  }, [guideSearch]);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("documents/");
      const data = response.data;

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data?.documents)
            ? data.documents
            : [];

      setDocuments(list);
    } catch (err) {
      setDocuments([]);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "bibliotheque") {
      loadDocuments();
    }
  }, [activeTab, loadDocuments]);

  const categories = useMemo(() => {
    const values = documents
      .map((document) => document.categorie)
      .filter(Boolean);

    return ["TOUTES", ...new Set(values)];
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return documents.filter((document) => {
      const title = getDocumentTitle(document).toLowerCase();
      const description = String(
        document.description || ""
      ).toLowerCase();
      const documentCategory = String(
        document.categorie || ""
      );

      const matchesSearch =
        !query ||
        title.includes(query) ||
        description.includes(query) ||
        documentCategory.toLowerCase().includes(query);

      const matchesCategory =
        category === "TOUTES" ||
        documentCategory === category;

      const isPublished =
        document.publie ??
        document.is_published ??
        document.published ??
        true;

      return matchesSearch && matchesCategory && (isAdmin || isPublished);
    });
  }, [documents, search, category, isAdmin]);

  function openChapter(chapterId) {
    setActiveChapter(chapterId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function markChapterCompleted() {
    setCompletedChapters((previous) =>
      previous.includes(currentChapter.id)
        ? previous
        : [...previous, currentChapter.id]
    );
  }

  function goToPreviousChapter() {
    if (currentIndex > 0) {
      openChapter(GUIDE_CHAPTERS[currentIndex - 1].id);
    }
  }

  function goToNextChapter() {
    markChapterCompleted();

    if (currentIndex < GUIDE_CHAPTERS.length - 1) {
      openChapter(GUIDE_CHAPTERS[currentIndex + 1].id);
    }
  }

  function handleAdd() {
    setEditingDocument(null);
    setShowForm(true);
    setError("");
  }

  function handleEdit(document) {
    setEditingDocument(document);
    setShowForm(true);
    setError("");
  }

  function handleCancelForm() {
    setShowForm(false);
    setEditingDocument(null);
  }

  async function handleSaved() {
    setShowForm(false);
    setEditingDocument(null);
    await loadDocuments();
  }

  async function handleDelete(document) {
    const title = getDocumentTitle(document);

    if (!window.confirm(`Voulez-vous vraiment supprimer « ${title} » ?`)) {
      return;
    }

    setError("");

    try {
      await api.delete(`documents/${document.id}/`);
      await loadDocuments();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <main className="documents-page">
      <header className="documents-hero">
        <div className="documents-hero-content">
          <div className="documents-hero-breadcrumb">
            <Home size={15} />
            <span>Plateforme DSI</span>
            <ChevronRight size={14} />
            <span>Centre de ressources</span>
          </div>

          <div className="documents-hero-main">
            <div className="documents-hero-icon">
              <GraduationCap size={34} />
            </div>

            <div>
              <span className="documents-eyebrow">
                CENTRE D'ASSISTANCE ET DE DOCUMENTATION
              </span>

              <h1>Centre d'aide DSI</h1>

              <p>
                Retrouvez les guides, procédures et explications
                nécessaires pour utiliser la plateforme DSI de A à Z.
              </p>
            </div>
          </div>

          <div className="documents-hero-stats">
            <div>
              <BookOpen size={18} />
              <span>{GUIDE_CHAPTERS.length} chapitres</span>
            </div>

            <div>
              <Clock size={18} />
              <span>Guide pas à pas</span>
            </div>

            <div>
              <CheckCircle2 size={18} />
              <span>Progression personnelle</span>
            </div>
          </div>
        </div>
      </header>

      <div className="documents-tabs">
        <button
          type="button"
          className={activeTab === "guide" ? "active" : ""}
          onClick={() => setActiveTab("guide")}
        >
          <BookOpen size={18} />
          Guide utilisateur
        </button>

        <button
          type="button"
          className={activeTab === "bibliotheque" ? "active" : ""}
          onClick={() => setActiveTab("bibliotheque")}
        >
          <FolderOpen size={18} />
          Bibliothèque documentaire
        </button>
      </div>

      {activeTab === "guide" && (
        <section className="guide-layout">
          <aside className="guide-sidebar">
            <div className="guide-sidebar-heading">
              <div>
                <span className="guide-sidebar-label">VOTRE PARCOURS</span>
                <h2>Sommaire du guide</h2>
              </div>

              <span className="guide-chapter-count">
                {GUIDE_CHAPTERS.length}
              </span>
            </div>

            <div className="guide-search">
              <Search size={17} />
              <input
                type="search"
                value={guideSearch}
                onChange={(event) => setGuideSearch(event.target.value)}
                placeholder="Rechercher un chapitre..."
                aria-label="Rechercher dans le guide"
              />
              {guideSearch && (
                <button
                  type="button"
                  onClick={() => setGuideSearch("")}
                  aria-label="Effacer la recherche"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <div className="guide-progress-card">
              <div className="guide-progress-top">
                <span>Votre progression</span>
                <strong>{guideProgress}%</strong>
              </div>

              <div className="guide-progress-track">
                <span style={{ width: `${guideProgress}%` }} />
              </div>

              <small>
                {completedChapters.length} chapitre(s) terminé(s) sur{" "}
                {GUIDE_CHAPTERS.length}
              </small>
            </div>

            <nav className="guide-chapter-list" aria-label="Chapitres du guide">
              {filteredChapters.length === 0 ? (
                <p className="guide-no-result">
                  Aucun chapitre ne correspond à votre recherche.
                </p>
              ) : (
                filteredChapters.map((chapter) => {
                  const Icon = chapter.icon;
                  const isActive = chapter.id === activeChapter;
                  const isCompleted = completedChapters.includes(chapter.id);

                  return (
                    <button
                      type="button"
                      key={chapter.id}
                      className={`guide-chapter-link ${
                        isActive ? "active" : ""
                      }`}
                      onClick={() => openChapter(chapter.id)}
                    >
                      <span className="guide-chapter-number">
                        {isCompleted ? (
                          <CheckCircle2 size={17} />
                        ) : (
                          chapter.number
                        )}
                      </span>

                      <span className="guide-chapter-icon">
                        <Icon size={17} />
                      </span>

                      <span className="guide-chapter-name">
                        <strong>{chapter.title}</strong>
                        <small>{chapter.category}</small>
                      </span>

                      <ChevronRight
                        size={16}
                        className="guide-chapter-chevron"
                      />
                    </button>
                  );
                })
              )}
            </nav>

            <div className="guide-sidebar-help">
              <Lightbulb size={20} />
              <div>
                <strong>Conseil</strong>
                <p>
                  Suivez les chapitres dans l'ordre pour découvrir
                  progressivement la plateforme.
                </p>
              </div>
            </div>
          </aside>

          <div className="guide-content">
            <div className="guide-content-topline">
              <span>
                CHAPITRE {currentChapter.number} / {GUIDE_CHAPTERS.length}
              </span>

              <span className="guide-category-pill">
                {currentChapter.category}
              </span>
            </div>

            <div className="guide-article-heading">
              <div className="guide-article-icon">
                <currentChapter.icon size={30} />
              </div>

              <div>
                <h2>{currentChapter.title}</h2>
                <p>{currentChapter.subtitle}</p>
              </div>
            </div>

            <div className="guide-introduction">
              <span className="guide-section-kicker">INTRODUCTION</span>
              <p>{currentChapter.intro}</p>
            </div>

            <div className="guide-steps-heading">
              <div>
                <span className="guide-section-kicker">APPRENDRE À FAIRE</span>
                <h3>Procédure étape par étape</h3>
              </div>

              <span className="guide-step-count">
                {currentChapter.steps.length} étapes
              </span>
            </div>

            <div className="guide-steps">
              {currentChapter.steps.map((step, index) => (
                <article className="guide-step" key={`${currentChapter.id}-${index}`}>
                  <div className="guide-step-marker">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    {index !== currentChapter.steps.length - 1 && (
                      <span className="guide-step-line" />
                    )}
                  </div>

                  <div className="guide-step-body">
                    <h4>{step.title}</h4>
                    <p>{step.description}</p>
                  </div>
                </article>
              ))}
            </div>

            {currentChapter.tip && (
              <div className="guide-tip">
                <div className="guide-tip-icon">
                  <Lightbulb size={21} />
                </div>

                <div>
                  <strong>Conseil pratique</strong>
                  <p>{currentChapter.tip}</p>
                </div>
              </div>
            )}

            {currentChapter.action && (
              <div className="guide-action">
                <div>
                  <strong>Passer à la pratique</strong>
                  <p>
                    Vous pouvez maintenant accéder directement au module
                    concerné.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => navigate(currentChapter.action.path)}
                >
                  {currentChapter.action.label}
                  <ArrowRight size={17} />
                </button>
              </div>
            )}

            <div className="guide-completion">
              <div className="guide-completion-icon">
                <CheckCircle2 size={22} />
              </div>

              <div>
                <strong>Vous avez terminé ce chapitre ?</strong>
                <p>
                  Marquez-le comme terminé pour suivre votre progression.
                </p>
              </div>

              <button
                type="button"
                className={
                  completedChapters.includes(currentChapter.id)
                    ? "completed"
                    : ""
                }
                onClick={markChapterCompleted}
                disabled={completedChapters.includes(currentChapter.id)}
              >
                {completedChapters.includes(currentChapter.id)
                  ? "Chapitre terminé"
                  : "Marquer comme terminé"}
              </button>
            </div>

            <div className="guide-navigation">
              <button
                type="button"
                className="guide-previous"
                onClick={goToPreviousChapter}
                disabled={currentIndex === 0}
              >
                <ChevronLeft size={18} />
                <span>
                  <small>PRÉCÉDENT</small>
                  Chapitre précédent
                </span>
              </button>

              <button
                type="button"
                className="guide-next"
                onClick={goToNextChapter}
                disabled={currentIndex === GUIDE_CHAPTERS.length - 1}
              >
                <span>
                  <small>SUIVANT</small>
                  Chapitre suivant
                </span>
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </section>
      )}

      {activeTab === "bibliotheque" && (
        <section className="documents-library">
          <header className="documents-library-header">
            <div>
              <span className="guide-section-kicker">
                RESSOURCES DOCUMENTAIRES
              </span>
              <h2>Bibliothèque documentaire</h2>
              <p>
                Consultez les guides, procédures, formulaires et documents
                publiés par la DSI.
              </p>
            </div>

            <div className="documents-library-actions">
              <button
                type="button"
                className="documents-refresh-button"
                onClick={loadDocuments}
                disabled={loading}
              >
                <RefreshCw size={17} />
                Actualiser
              </button>

              {isAdmin && (
                <button
                  type="button"
                  className="documents-add-button"
                  onClick={handleAdd}
                >
                  <Plus size={18} />
                  Ajouter un document
                </button>
              )}
            </div>
          </header>

          {error && (
            <div className="documents-error" role="alert">
              <AlertCircle size={19} />
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

          {showForm && isAdmin && (
            <section className="documents-form-section">
              <div className="documents-form-heading">
                <h3>
                  {editingDocument
                    ? "Modifier le document"
                    : "Ajouter un document"}
                </h3>

                <button
                  type="button"
                  onClick={handleCancelForm}
                  aria-label="Fermer le formulaire"
                >
                  <X size={20} />
                </button>
              </div>

              <DocumentForm
                document={editingDocument}
                onCancel={handleCancelForm}
                onSaved={handleSaved}
              />
            </section>
          )}

          <div className="documents-toolbar">
            <div className="documents-search">
              <Search size={19} />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un document..."
                aria-label="Rechercher un document"
              />
            </div>

            <select
              className="documents-category-filter"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              aria-label="Filtrer par catégorie"
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item === "TOUTES" ? "Toutes les catégories" : item}
                </option>
              ))}
            </select>
          </div>

          <div className="documents-results">
            {loading ? (
              <div className="documents-empty">
                <RefreshCw size={25} className="documents-loading-icon" />
                <p>Chargement des documents...</p>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="documents-empty">
                <FileText size={38} />
                <h3>Aucun document trouvé</h3>
                <p>
                  {documents.length === 0
                    ? "Aucun document publié n'est actuellement disponible."
                    : "Modifiez votre recherche ou sélectionnez une autre catégorie."}
                </p>
              </div>
            ) : (
              <div className="documents-grid">
                {filteredDocuments.map((document) => {
                  const fileUrl = getDocumentFileUrl(document);
                  const title = getDocumentTitle(document);

                  return (
                    <article className="document-card" key={document.id}>
                      <div className="document-card-top">
                        <div className="document-file-icon">
                          <FileText size={25} />
                        </div>

                        <span className="document-category">
                          {document.categorie || "Sans catégorie"}
                        </span>
                      </div>

                      <div className="document-card-content">
                        <h3>{title}</h3>
                        <p>
                          {document.description ||
                            "Aucune description disponible."}
                        </p>
                      </div>

                      <div className="document-card-footer">
                        {fileUrl ? (
                          <a
                            className="document-download-button"
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download size={17} />
                            Consulter le fichier
                          </a>
                        ) : (
                          <span className="document-no-file">
                            Fichier indisponible
                          </span>
                        )}

                        {isAdmin && (
                          <div className="document-admin-actions">
                            <button
                              type="button"
                              className="document-edit-button"
                              onClick={() => handleEdit(document)}
                              title="Modifier le document"
                              aria-label={`Modifier ${title}`}
                            >
                              <Pencil size={17} />
                            </button>

                            <button
                              type="button"
                              className="document-delete-button"
                              onClick={() => handleDelete(document)}
                              title="Supprimer le document"
                              aria-label={`Supprimer ${title}`}
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <footer className="documents-count">
            {filteredDocuments.length} document(s) affiché(s)
          </footer>
        </section>
      )}
    </main>
  );
}
