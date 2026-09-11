/** Collapse raw IDs if the router integration still named the span from the URL. */
export function parameterizeTransactionName(name: string): string {
  if (!name) {
    return name;
  }

  return name
    .replace(/\/agency\/members\/[^/?#]+/g, "/agency/members/:userId")
    .replace(/\/agency\/projects\/[^/?#]+/g, "/agency/projects/:projectId")
    .replace(/\/agency\/clients\/[^/?#]+/g, "/agency/clients/:clientId")
    .replace(/\/agency\/reports\/[^/?#]+/g, "/agency/reports/:reportId")
    .replace(/\/node\/[^/?#]+/g, "/node/:id")
    .replace(/\/object\/[^/?#]+/g, "/object/:id")
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "/:id")
    .replace(/\/[0-9a-f]{20,}/gi, "/:id");
}
