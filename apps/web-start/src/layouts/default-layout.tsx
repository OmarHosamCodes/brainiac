export function DefaultLayout(props: { children: React.ReactNode }): React.ReactElement {
  return <main className="min-h-screen bg-background text-foreground">{props.children}</main>;
}
