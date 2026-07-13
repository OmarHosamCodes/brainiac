import { X } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Skeleton } from "@/ui/skeleton";
import { agencySectionTitleClass } from "@/features/shared/agency-ui";
import {
  createAgencyTag,
  useAgencyTagsQuery,
} from "@/features/time-tracking/hooks/use-agency-tags";
import { orpc, orpcClient } from "@/lib/orpc";
import { getQueryClient } from "@/lib/query-client";

type AgencySettingsTagsPaneProps = {
  teamId: string;
  active: boolean;
};

export function AgencySettingsTagsPane({ teamId, active }: AgencySettingsTagsPaneProps) {
  const [newTagName, setNewTagName] = useState("");
  const [pending, setPending] = useState(false);

  const tagsQuery = useAgencyTagsQuery(active ? teamId : "");
  const tags = tagsQuery.data?.items ?? [];

  async function createTag(event: FormEvent) {
    event.preventDefault();
    const name = newTagName.trim();
    if (!name || !teamId || pending) return;
    setPending(true);
    setNewTagName("");
    try {
      await createAgencyTag(teamId, name);
    } finally {
      setPending(false);
    }
  }

  async function deleteTag(tagId: string) {
    if (!teamId || pending) return;
    setPending(true);
    try {
      await orpcClient.agencyOps.tags.delete({ teamId, tagId });
      await getQueryClient().invalidateQueries({
        queryKey: orpc.agencyOps.tags.list.queryOptions({ input: { teamId } }).queryKey,
      });
    } finally {
      setPending(false);
    }
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
        <Button type="submit" size="sm" disabled={!newTagName.trim() || pending}>
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
              className="inline-flex items-center gap-1 rounded-full border border-default bg-elevated px-2.5 py-1 text-sm"
            >
              <span>{tag.name}</span>
              <button
                type="button"
                className="rounded-full p-0.5 text-muted hover:text-error"
                aria-label={`Delete tag ${tag.name}`}
                disabled={pending}
                onClick={() => void deleteTag(tag.id)}
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">No tags yet. Create one to categorize time entries.</p>
      )}
    </div>
  );
}
