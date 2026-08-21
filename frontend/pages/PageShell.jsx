const PageShell = ({ title, description }) => {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-cyan-950/20">
      <p className="text-sm uppercase tracking-[0.28em] text-cyan-300/80">Placeholder Page</p>
      <h2 className="mt-3 text-3xl font-semibold text-white">{title}</h2>
      <p className="mt-3 max-w-2xl text-slate-300">{description}</p>
    </section>
  );
};

export default PageShell;