import { useQuery } from "@tanstack/react-query";
import { Tag, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/lib/orpc";
import { agencySectionTitleClass } from "@/lib/utils/agency-ui";
import { selectIsTagMutationPending, useAgencyOpsStore } from "@/stores/agency-ops";

type AgencySettingsTagsPaneProps = {
  teamId: string;
  active: boolean;
};

export function AgencySettingsTagsPane({ teamId, active }: AgencySettingsTagsPaneProps) {
  const agencyOps = useAgencyOpsStore();
  const isTagMutationPending = useAgencyOpsStore(selectIsTagMutationPending);
  const [newTagName, setNewTagName] = useState("");

  const tagsQuery = useQuery({
    ...orpc.agencyOps.tags.list.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId) && active,
  });

  const tags = tagsQuery.data?.items ?? [];

  const tagsQueryKey = useMemo(
    () => orpc.agencyOps.tags.list.queryOptions({ input: { teamId } }).queryKey,
    [teamId],
  );

  useEffect(() => {
    if (!teamId) return;
    agencyOps.registerTagsQuery({ queryKey: tagsQueryKey, teamId });
    return () => agencyOps.unregisterTagsQuery(tagsQueryKey);
  }, [teamId, tagsQueryKey, agencyOps]);

  async function createTag(event: FormEvent) {
    event.preventDefault();
    const name = newTagName.trim();
    if (!name || !teamId) return;
    setNewTagName("");
    await agencyOps.createTag({ teamId, name });
  }

  async function deleteTag(tagId: string, tagName: string) {
    if (!teamId) return;
    await agencyOps.deleteTag({ teamId, tagId, tagName });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className={agencySectionTitleClass}>Label time entries across projects</h2>
      </div>

      <form className="flex items-center gap-2" onSubmit={(event) => void createTag(event)}>
        <Input
          value={newTagName}
          onChange={(event) => setNewTagName(event.target.value)}
          placeholder="New tag (e.g. design, qa, meetings)"
          className="max-w-md flex-1"
        />
        <Button type="submit" size="sm" disabled={!newTagName.trim() || isTagMutationPending}>
          Add tag
        </Button>
      </form>

      {tagsQuery.isPending ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
      ) : tags.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <li
              key={tag.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-default bg-muted px-3 py-1 text-xs font-bold text-highlighted"
            >
              <span>{tag.name}</span>
              <button
                type="button"
                className="text-dimmed transition-colors hover:text-error"
                aria-label={`Remove tag ${tag.name}`}
                onClick={() => void deleteTag(tag.id, tag.name)}
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="py-8 text-center">
          <Tag className="mx-auto size-5 text-muted" />
          <p className="mt-2 text-sm text-muted">No tags yet. Add your first above.</p>
        </div>
      )}
    </div>
  );
}
