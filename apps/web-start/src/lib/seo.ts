export function seo(input: { title: string; description?: string }) {
  return [
    { title: input.title },
    ...(input.description ? [{ name: "description", content: input.description }] : []),
  ];
}
