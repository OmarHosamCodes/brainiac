export function renderSimpleMarkdown(input: string) {
    const escaped = input
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");

    const withFormatting = escaped
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/__(.+?)__/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/_(.+?)_/g, "<em>$1</em>");

    const lines = withFormatting.split("\n");
    const parts: string[] = [];
    let inList = false;

    for (const line of lines) {
        if (/^\s*[-*]\s+/.test(line)) {
            if (!inList) {
                parts.push('<ul class="ml-5 list-disc space-y-1">');
                inList = true;
            }

            parts.push(`<li>${line.replace(/^\s*[-*]\s+/, "")}</li>`);
            continue;
        }

        if (inList) {
            parts.push("</ul>");
            inList = false;
        }

        if (!line.trim()) {
            parts.push('<div class="h-3"></div>');
            continue;
        }

        parts.push(`<p>${line}</p>`);
    }

    if (inList) {
        parts.push("</ul>");
    }

    return parts.join("") || "<p>Nothing to preview yet.</p>";
}
