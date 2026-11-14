
import { useCallback, useEffect, useState } from "react";
import {
  MessageSquare,
  Send,
  RefreshCw,
  Reply,
  X,
} from "lucide-react";

import api from "../../services/api";

/* =====================================================
   UTILITAIRES
===================================================== */

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.commentaires)) return data.commentaires;
  return [];
}

function displayValue(value) {
  if (value === null || value === undefined || value === "") {
    return "Non renseigné";
  }

  if (typeof value === "object") {
    return (
      value.username ||
      value.nom_complet ||
      value.full_name ||
      value.nom ||
      value.name ||
      value.label ||
      value.id ||
      "Non renseigné"
    );
  }

  return String(value);
}

function displayDate(value) {
  if (!value) return "Non renseignée";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return displayValue(value);
  }

  return date.toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getCommentText(comment) {
  return (
    comment.contenu ||
    comment.commentaire ||
    comment.texte ||
    comment.message ||
    comment.comment ||
    "Commentaire"
  );
}

function authorText(comment) {
  return displayValue(
    comment.auteur_username ||
    comment.auteur_nom ||
    comment.auteur ||
    comment.username
  );
}

function getApiError(error, defaultMessage) {
  const data = error?.response?.data;

  if (typeof data === "string") return data;

  if (data && typeof data === "object") {
    if (data.detail) return String(data.detail);
    if (data.message) return String(data.message);

    const messages = Object.entries(data).flatMap(([field, value]) => {
      const values = Array.isArray(value) ? value : [value];

      return values.map((message) => {
        if (typeof message === "object") {
          return `${field} : erreur de validation`;
        }

        return `${field} : ${String(message)}`;
      });
    });

    if (messages.length > 0) {
      return messages.join("\n");
    }
  }

  if (error?.response?.status === 401) {
    return "Votre session a expiré. Veuillez vous reconnecter.";
  }

  if (error?.response?.status === 403) {
    return "Vous n'êtes pas autorisé à effectuer cette action.";
  }

  return defaultMessage;
}

/* =====================================================
   COMPOSANT COMMENTAIRES ET RÉPONSES
===================================================== */

function TicketCommentaire({
  ticketId,
  onCommentAdded,
  onSuccess,
}) {
  const [comments, setComments] = useState([]);

  const [commentText, setCommentText] = useState("");

  const [replyText, setReplyText] = useState("");
  const [replyTo, setReplyTo] = useState(null);

  const [loadingComments, setLoadingComments] = useState(true);
  const [sendingComment, setSendingComment] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);

  const [commentError, setCommentError] = useState("");
  const [replyError, setReplyError] = useState("");
  const [loadingError, setLoadingError] = useState("");

  /* ---------------------------------------------------
     CHARGEMENT DES COMMENTAIRES
  --------------------------------------------------- */

  const loadComments = useCallback(async () => {
    try {
      setLoadingError("");

      const response = await api.get(
        `/tickets/${ticketId}/commentaires/`
      );

      setComments(normalizeList(response.data));
    } catch (error) {
      console.error("Erreur de chargement :", error);

      setLoadingError(
        getApiError(
          error,
          "Impossible de charger les commentaires."
        )
      );
    } finally {
      setLoadingComments(false);
    }
  }, [ticketId]);

  useEffect(() => {
    setLoadingComments(true);
    loadComments();
  }, [loadComments]);

  /* ---------------------------------------------------
     ACTUALISATION DE L'HISTORIQUE
  --------------------------------------------------- */

  const refreshHistory = async () => {
    if (typeof onCommentAdded === "function") {
      await Promise.resolve(onCommentAdded());
    }
  };

  /* ---------------------------------------------------
     AJOUTER UN NOUVEAU COMMENTAIRE
  --------------------------------------------------- */

  const handleSubmitComment = async (event) => {
    event.preventDefault();

    const message = commentText.trim();

    if (!message) {
      setCommentError("Veuillez saisir un commentaire.");
      return;
    }

    setSendingComment(true);
    setCommentError("");

    onSuccess?.("");

    try {
      await api.post(
        `/tickets/${ticketId}/commentaires/`,
        {
          contenu: message,
        }
      );

      setCommentText("");

      await loadComments();
      await refreshHistory();

      onSuccess?.("Commentaire ajouté avec succès.");
    } catch (error) {
      console.error("Erreur ajout commentaire :", error);

      setCommentError(
        getApiError(
          error,
          "Impossible d'ajouter le commentaire."
        )
      );
    } finally {
      setSendingComment(false);
    }
  };

  /* ---------------------------------------------------
     OUVRIR LE FORMULAIRE DE RÉPONSE
  --------------------------------------------------- */

  const handleOpenReply = (comment) => {
    setReplyTo(comment);
    setReplyText("");
    setReplyError("");
    setCommentError("");
  };

  /* ---------------------------------------------------
     ANNULER UNE RÉPONSE
  --------------------------------------------------- */

  const handleCancelReply = () => {
    setReplyTo(null);
    setReplyText("");
    setReplyError("");
  };

  /* ---------------------------------------------------
     ENVOYER UNE RÉPONSE
  --------------------------------------------------- */

  const handleSubmitReply = async (event) => {
    event.preventDefault();

    const message = replyText.trim();

    if (!message) {
      setReplyError("Veuillez saisir votre réponse.");
      return;
    }

    if (!replyTo?.id) {
      setReplyError("Commentaire d'origine introuvable.");
      return;
    }

    setSendingReply(true);
    setReplyError("");

    onSuccess?.("");

    try {
      await api.post(
        `/tickets/${ticketId}/commentaires/`,
        {
          contenu: message,
          reponse_a: replyTo.id,
        }
      );

      setReplyText("");
      setReplyTo(null);

      await loadComments();
      await refreshHistory();

      onSuccess?.("Réponse envoyée avec succès.");
    } catch (error) {
      console.error("Erreur envoi réponse :", error);

      setReplyError(
        getApiError(
          error,
          "Impossible d'envoyer la réponse."
        )
      );
    } finally {
      setSendingReply(false);
    }
  };

  /* ---------------------------------------------------
     SÉPARER LES COMMENTAIRES ET LES RÉPONSES
  --------------------------------------------------- */

  const commentairesPrincipaux = comments.filter(
    (comment) => !comment.reponse_a
  );

  const getReplies = (commentId) => {
    return comments.filter(
      (comment) => Number(comment.reponse_a) === Number(commentId)
    );
  };

  /* ---------------------------------------------------
     AFFICHAGE D'UN COMMENTAIRE
  --------------------------------------------------- */

  const renderComment = (comment, isReply = false) => (
    <article
      className={
        isReply
          ? "ticket-comment ticket-comment-reply"
          : "ticket-comment"
      }
      key={comment.id}
    >
      <div className="ticket-comment-heading">
        <strong>{authorText(comment)}</strong>

        <span>
          {displayDate(
            comment.date_creation ||
            comment.created_at ||
            comment.date ||
            comment.created
          )}
        </span>
      </div>

      <p>{getCommentText(comment)}</p>

      {!isReply && (
        <button
          type="button"
          className="ticket-comment-reply-button"
          onClick={() => handleOpenReply(comment)}
        >
          <Reply size={15} />
          Répondre
        </button>
      )}

      {/* FORMULAIRE DE RÉPONSE */}
      {!isReply && replyTo?.id === comment.id && (
        <form
          className="ticket-comment-reply-form"
          onSubmit={handleSubmitReply}
        >
          <label>
            Répondre à {authorText(comment)}
          </label>

          <textarea
            value={replyText}
            onChange={(event) => {
              setReplyText(event.target.value);
              setReplyError("");
            }}
            placeholder="Écrivez votre réponse..."
            rows={3}
            maxLength={3000}
            disabled={sendingReply}
            required
          />

          {replyError && (
            <p className="ticket-details-message error">
              {replyError}
            </p>
          )}

          <div className="ticket-comment-form-actions">
            <button
              type="button"
              className="ticket-action-button secondary"
              onClick={handleCancelReply}
              disabled={sendingReply}
            >
              <X size={15} />
              Annuler
            </button>

            <button
              type="submit"
              className="ticket-action-button primary"
              disabled={sendingReply || !replyText.trim()}
            >
              <Send size={15} />

              {sendingReply
                ? "Envoi..."
                : "Envoyer la réponse"}
            </button>
          </div>
        </form>
      )}

      {/* RÉPONSES LIÉES AU COMMENTAIRE */}
      {!isReply && getReplies(comment.id).length > 0 && (
        <div className="ticket-comment-replies">
          {getReplies(comment.id).map((reply) =>
            renderComment(reply, true)
          )}
        </div>
      )}
    </article>
  );

  /* ---------------------------------------------------
     AFFICHAGE PRINCIPAL
  --------------------------------------------------- */

  return (
    <section className="ticket-details-card">

      <h3 className="ticket-details-section-title">
        <MessageSquare size={19} />

        Commentaires et réponses

        <span className="ticket-details-count">
          {comments.length}
        </span>
      </h3>

      {/* CHARGEMENT */}
      {loadingComments ? (
        <p className="ticket-details-empty">
          <RefreshCw
            size={15}
            className="ticket-details-spinner"
          />
          Chargement des commentaires...
        </p>
      ) : loadingError ? (
        <div className="ticket-details-message error">
          <p>{loadingError}</p>

          <button
            type="button"
            className="ticket-action-button secondary"
            onClick={() => {
              setLoadingComments(true);
              loadComments();
            }}
          >
            <RefreshCw size={15} />
            Réessayer
          </button>
        </div>
      ) : commentairesPrincipaux.length === 0 ? (
        <p className="ticket-details-empty">
          Aucun commentaire pour le moment.
        </p>
      ) : (
        <div className="ticket-comments-list">
          {commentairesPrincipaux.map((comment) =>
            renderComment(comment)
          )}
        </div>
      )}

      {/* FORMULAIRE NOUVEAU COMMENTAIRE */}
      <form
        className="ticket-comment-form"
        onSubmit={handleSubmitComment}
      >
        <label htmlFor={`ticket-new-comment-${ticketId}`}>
          Ajouter une information ou un commentaire
        </label>

        <textarea
          id={`ticket-new-comment-${ticketId}`}
          value={commentText}
          onChange={(event) => {
            setCommentText(event.target.value);
            setCommentError("");
            onSuccess?.("");
          }}
          placeholder="Écrivez votre commentaire ici..."
          rows={4}
          maxLength={3000}
          disabled={sendingComment}
          required
        />

        {commentError && (
          <p className="ticket-details-message error">
            {commentError}
          </p>
        )}

        <button
          className="ticket-action-button primary"
          type="submit"
          disabled={sendingComment || !commentText.trim()}
        >
          <Send size={16} />

          {sendingComment
            ? "Enregistrement..."
            : "Envoyer le commentaire"}
        </button>
      </form>
    </section>
  );
}

export default TicketCommentaire;
