
import { Construction, Clock3 } from "lucide-react";
import "./ModulePlaceholder.css";

function ModulePlaceholder({ title, description }) {
  return (
    <main className="module-placeholder">
      <div className="module-breadcrumb">
        Portail DSI <span>/</span> {title}
      </div>

      <section className="module-welcome">
        <div className="module-icon">
          <Construction size={28} />
        </div>

        <span className="module-eyebrow">
          MODULE DU SYSTÈME DSI
        </span>

        <h1>{title}</h1>
        <p>{description}</p>

        <div className="module-status">
          <Clock3 size={17} />
          <span>Module prévu dans le développement de l’application</span>
        </div>
      </section>

      <footer className="module-footer">
        Direction des Systèmes d’Information · Portail interne
      </footer>
    </main>
  );
}

export default ModulePlaceholder;
