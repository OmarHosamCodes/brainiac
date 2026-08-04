import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import {
  agencyFormFieldClass,
  agencyFormLabelClass,
  agencyWorkMetaClass,
} from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";

import type { AgencyDepartmentOption } from "./agency-departments";

type AgencyPeopleDepartmentsProps = {
  departments: readonly AgencyDepartmentOption[];
  canEdit: boolean;
  busy: boolean;
  onCreate: (name: string) => Promise<void>;
  onRename: (departmentId: string, name: string) => Promise<void>;
  onDelete: (departmentId: string) => Promise<void>;
};

export function AgencyPeopleDepartments({
  departments,
  canEdit,
  busy,
  onCreate,
  onRename,
  onDelete,
}: AgencyPeopleDepartmentsProps) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  async function handleCreate() {
    const name = newName.trim();
    if (!name || busy) return;
    await onCreate(name);
    setNewName("");
  }

  async function handleRename(departmentId: string) {
    const name = editName.trim();
    if (!name || busy) return;
    await onRename(departmentId, name);
    setEditingId(null);
    setEditName("");
  }

  return (
    <section className="space-y-4" data-testid="people-departments">
      <div>
        <h3 className="text-sm font-semibold text-highlighted">Departments</h3>
        <p className={cn(agencyWorkMetaClass, "mt-1 text-pretty")}>
          Team catalog for optional member assignment. Delete is blocked while members are assigned.
        </p>
      </div>

      {departments.length === 0 ? (
        <p className="text-muted text-sm" role="status">
          No departments yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {departments.map((department) => {
            const editing = editingId === department.id;
            return (
              <li
                key={department.id}
                className="border-border flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2"
              >
                {editing ? (
                  <Input
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    className="min-w-0 flex-1"
                    maxLength={50}
                    disabled={busy || !canEdit}
                    aria-label={`Rename ${department.name}`}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleRename(department.id);
                      }
                    }}
                  />
                ) : (
                  <span className="text-highlighted min-w-0 flex-1 truncate text-sm font-medium">
                    {department.name}
                  </span>
                )}
                {canEdit ? (
                  <div className="ms-auto flex items-center gap-1">
                    {editing ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={busy || !editName.trim()}
                        onClick={() => void handleRename(department.id)}
                      >
                        Save
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        disabled={busy}
                        aria-label={`Rename ${department.name}`}
                        onClick={() => {
                          setEditingId(department.id);
                          setEditName(department.name);
                        }}
                      >
                        <Pencil className="size-3.5" aria-hidden />
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      disabled={busy}
                      aria-label={`Delete ${department.name}`}
                      onClick={() => void onDelete(department.id)}
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {canEdit ? (
        <div className={agencyFormFieldClass}>
          <Label className={agencyFormLabelClass}>Add department</Label>
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="e.g. Engineering"
              maxLength={50}
              disabled={busy}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleCreate();
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              className="shrink-0 gap-1.5"
              disabled={busy || !newName.trim()}
              onClick={() => void handleCreate()}
            >
              <Plus className="size-3.5" aria-hidden />
              Add
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
