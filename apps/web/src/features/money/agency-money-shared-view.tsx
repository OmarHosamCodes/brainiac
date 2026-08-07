function MoneyListGhostPreview({ rows = 3 }: { rows?: number }) {
  const opacities = [0.55, 0.4, 0.28].slice(0, rows);
  return (
    <ul className="flex flex-col gap-2" aria-hidden>
      {opacities.map((opacity, index) => (
        <li
          key={index}
          className="flex items-center gap-3 rounded-xl border border-default/60 bg-elevated/40 px-3 py-2.5"
          style={{ opacity }}
        >
          <span className="size-7 shrink-0 rounded-full bg-muted/40" />
          <span className="h-2.5 min-w-0 flex-1 rounded-full bg-muted/35" />
          <span className="hidden h-2.5 w-14 shrink-0 rounded-full bg-muted/30 sm:block" />
          <span className="h-2.5 w-10 shrink-0 rounded-full bg-muted/25" />
        </li>
      ))}
    </ul>
  );
}

export { MoneyListGhostPreview };
