export function buildCanvasScopedPatchNote(input: {
  scopeNodes: Array<{ id: string; title: string }>;
}) {
  const node = input.scopeNodes[0];
  if (!node) return "";
  return [
    `Scoped node: ${node.id} (“${node.title}”).`,
    "Draft or propose patches against this nodeId (block.patch / node.update).",
    "Do not propose node.create unless the user explicitly asks for a new node.",
    "After propose_canvas_action, ui_present kind workspaceBlock or workspaceNode, then ask for Approve.",
    "To link Agency: node.update agencyRef { teamId, projectId?, taskId? } on a team-visible node. Never invent ids.",
  ].join(" ");
}
