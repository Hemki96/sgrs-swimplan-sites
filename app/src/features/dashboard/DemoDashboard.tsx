export function DemoDashboard() {
  return (
    <section className="page">
      <h1>Saisonplanung</h1>
      <p className="muted">Demo-Shell. Fachfunktionen folgen den ExecPlans.</p>
      <div className="grid">
        <article className="card">
          <h2>Aktuelle Woche</h2>
          <p>KW 35 · Target RPE 6</p>
        </article>
        <article className="card">
          <h2>Nächster Wettkampf</h2>
          <p>Noch nicht konfiguriert</p>
        </article>
        <article className="card">
          <h2>Schwerpunkt</h2>
          <p>Aerobic Base</p>
        </article>
      </div>
    </section>
  );
}
