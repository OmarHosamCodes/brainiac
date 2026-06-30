import { AlertTriangle, Archive, Building2, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { AgencyMultiSelectFilter } from "@/components/agency/agency-multi-select-filter";
import {
  agencyEmptyPanelClass,
  agencyErrorPanelClass,
  agencyLabelClass,
} from "@/lib/utils/agency-ui";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { taskMatchesAnyAssigneeFilter } from "@/lib/utils/agency-query-cache";
import { getTaskGroupKey, groupTasksByProjectTitle } from "@/lib/utils/agency-task-utils";
import {
  useAgencyClientsQuery,
  useAgencyContactQuery,
  useAgencyProjectTasksQuery,
  useAgencyProjectsQuery,
  useAgencyTimeEntriesQuery,
} from "@/lib/queries/agency";
import { formatDuration } from "@/lib/utils/format-duration";
import { projectHueStyle } from "@/lib/utils/project-palette";
import {
  selectIsClientMutationPending,
  selectIsContactMutationPending,
  selectIsProjectMutationPending,
  useAgencyOpsStore,
} from "@/stores/agency-ops";

type AgencyClientsSurfaceProps = {
  teamId: string;
};

function getWeekStartUtc(): Date {
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay();
  const diff = (day + 6) % 7;
  date.setUTCDate(date.getUTCDate() - diff);
  return date;
}

export function AgencyClientsSurface({ teamId }: AgencyClientsSurfaceProps) {
  const agencyOps = useAgencyOpsStore();
  const isClientMutationPending = useAgencyOpsStore(selectIsClientMutationPending);
  const isProjectMutationPending = useAgencyOpsStore(selectIsProjectMutationPending);
  const isContactMutationPending = useAgencyOpsStore(selectIsContactMutationPending);

  const [filterTerm, setFilterTerm] = useState("");
  const [selectedPeopleIds, setSelectedPeopleIds] = useState<string[]>([]);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [renameClientId, setRenameClientId] = useState("");
  const [newProjectClientId, setNewProjectClientId] = useState("");
  const [contactClientId, setContactClientId] = useState("");
  const [renameDraft, setRenameDraft] = useState("");
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactDirty, setContactDirty] = useState(false);

  const clientsQuery = useAgencyClientsQuery(teamId);
  const projectsQuery = useAgencyProjectsQuery(teamId);
  const entriesQuery = useAgencyTimeEntriesQuery(teamId, 1, 100);
  const tasksQuery = useAgencyProjectTasksQuery(teamId);
  const contactQuery = useAgencyContactQuery(teamId, contactClientId);

  const clients = clientsQuery.data?.items ?? [];
  const projects = projectsQuery.data?.items ?? [];
  const entries = entriesQuery.data?.items ?? [];
  const tasks = tasksQuery.data?.items ?? [];

  const peopleOptions = useMemo(() => {
    const people = new Map<string, string>();
    for (const task of tasks) {
      for (const assignee of task.assignees) {
        people.set(assignee.userId, assignee.userName);
      }
    }
    return Array.from(people, ([value, label]) => ({ value, label })).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }, [tasks]);

  const clientOptions = useMemo(
    () => clients.map((client) => ({ value: client.id, label: client.name })),
    [clients],
  );
  const projectOptions = useMemo(
    () => projects.map((project) => ({ value: project.id, label: project.name })),
    [projects],
  );
  const taskOptions = useMemo(
    () =>
      groupTasksByProjectTitle(tasks).map((group) => ({
        value: group.groupKey,
        label: group.title,
      })),
    [tasks],
  );

  const weekHoursByClient = useMemo(() => {
    const weekStartMs = getWeekStartUtc().getTime();
    const totals = new Map<string, number>();
    for (const entry of entries) {
      if (new Date(entry.startedAt).getTime() < weekStartMs) continue;
      totals.set(entry.clientId, (totals.get(entry.clientId) ?? 0) + entry.durationSeconds);
    }
    return totals;
  }, [entries]);

  const projectsByClient = useMemo(() => {
    const map = new Map<string, typeof projects>();
    for (const project of projects) {
      const list = map.get(project.clientId) ?? [];
      list.push(project);
      map.set(project.clientId, list);
    }
    return map;
  }, [projects]);

  const filteredClients = useMemo(() => {
    const term = filterTerm.trim().toLowerCase();
    const peopleSet = new Set(selectedPeopleIds);
    const clientsSet = new Set(selectedClientIds);
    const projectsSet = new Set(selectedProjectIds);
    const tasksSet = new Set(selectedTaskIds);
    return clients.filter((client) => {
      if (term && !client.name.toLowerCase().includes(term)) return false;
      if (clientsSet.size > 0 && !clientsSet.has(client.id)) return false;

      const clientProjects = projects.filter((project) => project.clientId === client.id);
      if (projectsSet.size > 0 && !clientProjects.some((project) => projectsSet.has(project.id))) {
        return false;
      }
      if (
        peopleSet.size > 0 &&
        !clientProjects.some((project) =>
          tasks.some(
            (task) =>
              task.projectId === project.id && taskMatchesAnyAssigneeFilter(task, peopleSet),
          ),
        )
      ) {
        return false;
      }
      if (
        tasksSet.size > 0 &&
        !clientProjects.some((project) =>
          tasks.some(
            (task) => task.projectId === project.id && tasksSet.has(getTaskGroupKey(task)),
          ),
        )
      ) {
        return false;
      }
      return true;
    });
  }, [
    clients,
    filterTerm,
    projects,
    selectedClientIds,
    selectedPeopleIds,
    selectedProjectIds,
    selectedTaskIds,
    tasks,
  ]);

  const contactClient = clients.find((client) => client.id === contactClientId) ?? null;

  useEffect(() => {
    const contact = contactQuery.data;
    if (contact) {
      setContactName(contact.name);
      setContactEmail(contact.email);
      setContactPhone(contact.phone);
    } else {
      setContactName("");
      setContactEmail("");
      setContactPhone("");
    }
    setContactDirty(false);
  }, [contactQuery.data]);

  useEffect(() => {
    setContactDirty(false);
  }, [contactClientId]);

  useEffect(() => {
    const client = clients.find((entry) => entry.id === renameClientId);
    if (client) {
      setRenameDraft(client.name);
    }
  }, [clients, renameClientId]);

  async function createClient() {
    const name = newClientName.trim();
    if (!name || !teamId) return;
    setNewClientName("");
    setNewClientOpen(false);
    await agencyOps.createClient({ teamId, name });
  }

  async function renameClient(clientId: string) {
    const client = clients.find((entry) => entry.id === clientId);
    if (!client || !teamId) return;
    const name = renameDraft.trim();
    if (!name || name === client.name) {
      setRenameClientId("");
      return;
    }
    setRenameClientId("");
    await agencyOps.updateClient({ teamId, clientId, name });
  }

  async function createProject(clientId: string) {
    const client = clients.find((entry) => entry.id === clientId);
    const name = newProjectName.trim();
    if (!name || !teamId || !client) return;
    setNewProjectName("");
    setNewProjectClientId("");
    await agencyOps.createProject({
      teamId,
      clientId: client.id,
      clientName: client.name,
      name,
    });
  }

  async function saveContact() {
    if (!teamId || !contactClientId) return;
    await agencyOps.upsertContact(
      {
        teamId,
        clientId: contactClientId,
        name: contactName.trim(),
        email: contactEmail.trim(),
        phone: contactPhone.trim(),
      },
      { onSuccess: () => setContactDirty(false) },
    );
  }

  async function archiveClient(clientId: string) {
    const client = clients.find((entry) => entry.id === clientId);
    if (!client || !teamId) return;
    await agencyOps.archiveClient({
      teamId,
      clientId: client.id,
      clientName: client.name,
    });
  }

  const isLoading = clientsQuery.isPending || projectsQuery.isPending;
  const isError = clientsQuery.isError || projectsQuery.isError;

  return (
    <div className="agency-clients">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-default bg-elevated p-2">
          <div className="relative min-w-64 flex-1 md:max-w-72">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted" />
            <Input
              value={filterTerm}
              onChange={(e) => setFilterTerm(e.target.value)}
              placeholder="Filter clients"
              className="h-9 rounded-xl bg-default pl-9 text-sm"
            />
          </div>

          <AgencyMultiSelectFilter
            label="All People"
            values={selectedPeopleIds}
            options={peopleOptions}
            onValuesChange={setSelectedPeopleIds}
            disabled={tasksQuery.isPending}
          />
          <AgencyMultiSelectFilter
            label="All Clients"
            values={selectedClientIds}
            options={clientOptions}
            onValuesChange={setSelectedClientIds}
            disabled={clientsQuery.isPending}
          />
          <AgencyMultiSelectFilter
            label="All Projects"
            values={selectedProjectIds}
            options={projectOptions}
            onValuesChange={setSelectedProjectIds}
            disabled={projectsQuery.isPending}
          />
          <AgencyMultiSelectFilter
            label="All Tasks"
            values={selectedTaskIds}
            options={taskOptions}
            onValuesChange={setSelectedTaskIds}
            disabled={tasksQuery.isPending}
          />

          <div className="ml-auto">
            <Popover open={newClientOpen} onOpenChange={setNewClientOpen}>
              <PopoverTrigger asChild>
                <Button size="sm" disabled={!teamId}>
                  <Plus />
                  New client
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 space-y-2 p-3">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void createClient();
                  }}
                >
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                    New client
                  </p>
                  <Input
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="Client name"
                    className="mt-2"
                    autoFocus
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="mt-2 w-full"
                    disabled={!newClientName.trim() || isClientMutationPending}
                  >
                    Create
                  </Button>
                </form>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {isLoading ? (
          <div className="overflow-hidden rounded-2xl border border-default bg-default">
            {[1, 2, 3, 4, 5, 6].map((rowIndex) => (
              <div key={rowIndex} className="border-b border-default px-4 py-4 last:border-b-0">
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className={agencyErrorPanelClass} role="alert">
            <AlertTriangle className="mx-auto size-5 text-error" />
            <p className="mt-3 text-sm font-bold text-highlighted">Couldn't load clients.</p>
            <p className="mt-1 text-xs text-muted">
              {getErrorMessage(clientsQuery.error ?? projectsQuery.error, "Try refreshing.")}
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() => {
                void clientsQuery.refetch();
                void projectsQuery.refetch();
              }}
            >
              Retry
            </Button>
          </div>
        ) : clients.length === 0 ? (
          <div className={agencyEmptyPanelClass}>
            <Building2 className="mx-auto size-6 text-muted" />
            <p className="mt-3 text-sm font-bold text-highlighted">No clients yet.</p>
            <p className="mt-1 text-xs text-muted">
              Add your first client to start grouping projects and time.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={() => setNewClientOpen(true)}
            >
              <Plus />
              New client
            </Button>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="rounded-2xl border border-default bg-default p-8 text-center">
            <p className="text-sm font-bold text-highlighted">No clients match.</p>
            <p className="mt-1 text-xs text-muted">Try a different search.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-default bg-default">
            <table className="w-full min-w-[54rem] text-xs">
              <thead className="border-b border-default bg-muted">
                <tr className={agencyLabelClass}>
                  <th scope="col" className="px-4 py-2.5 font-bold">
                    Client
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-bold">
                    Projects
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right font-bold">
                    Hours · this week
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-bold">
                    Contact
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-bold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => {
                  const clientProjects = projectsByClient.get(client.id) ?? [];
                  const visibleProjects = clientProjects.slice(0, 3);

                  return (
                    <tr
                      key={client.id}
                      className="border-b border-default transition-colors last:border-b-0 hover:bg-elevated/40"
                    >
                      <td className="px-4 py-3">
                        <span className="truncate font-bold text-highlighted">{client.name}</span>
                      </td>
                      <td className="px-3 py-3">
                        {clientProjects.length > 0 ? (
                          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                            {visibleProjects.map((project) => (
                              <span
                                key={project.id}
                                className="inline-flex max-w-36 items-center gap-1.5 rounded-full bg-elevated px-2 py-1 text-[11px] font-bold text-muted"
                              >
                                <span
                                  className="inline-block size-1.5 shrink-0 rounded-full"
                                  aria-hidden="true"
                                  style={projectHueStyle(project.id)}
                                />
                                <span className="truncate">{project.name}</span>
                              </span>
                            ))}
                            {clientProjects.length > visibleProjects.length ? (
                              <span className="text-[11px] text-dimmed">
                                +{clientProjects.length - visibleProjects.length} more
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-dimmed">No projects</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span
                          className={[
                            "font-mono font-bold tabular-nums",
                            (weekHoursByClient.get(client.id) ?? 0) > 0
                              ? "text-highlighted"
                              : "text-dimmed",
                          ].join(" ")}
                        >
                          {formatDuration(weekHoursByClient.get(client.id) ?? 0, "short")}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-muted">
                        <Popover
                          open={contactClientId === client.id}
                          onOpenChange={(open) => setContactClientId(open ? client.id : "")}
                        >
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm">
                              Contact
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-80 space-y-3 p-3">
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                void saveContact();
                              }}
                            >
                              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                                {contactClient?.name ?? client.name}
                              </p>
                              <div className="mt-3 space-y-2">
                                <div>
                                  <label className="text-[11px] font-bold text-muted">Name</label>
                                  <Input
                                    value={contactName}
                                    onChange={(e) => {
                                      setContactName(e.target.value);
                                      setContactDirty(true);
                                    }}
                                    placeholder="Contact name"
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <label className="text-[11px] font-bold text-muted">Email</label>
                                  <Input
                                    value={contactEmail}
                                    onChange={(e) => {
                                      setContactEmail(e.target.value);
                                      setContactDirty(true);
                                    }}
                                    type="email"
                                    placeholder="contact@example.com"
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <label className="text-[11px] font-bold text-muted">Phone</label>
                                  <Input
                                    value={contactPhone}
                                    onChange={(e) => {
                                      setContactPhone(e.target.value);
                                      setContactDirty(true);
                                    }}
                                    type="tel"
                                    placeholder="+1 555 000 0000"
                                    className="mt-1"
                                  />
                                </div>
                              </div>
                              <Button
                                type="submit"
                                size="sm"
                                className="mt-3 w-full"
                                disabled={
                                  !contactDirty ||
                                  contactQuery.isFetching ||
                                  isContactMutationPending
                                }
                              >
                                Save contact
                              </Button>
                            </form>
                          </PopoverContent>
                        </Popover>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          <Popover
                            open={newProjectClientId === client.id}
                            onOpenChange={(open) => setNewProjectClientId(open ? client.id : "")}
                          >
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Plus />
                                Project
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-72 space-y-2 p-3">
                              <form
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  void createProject(client.id);
                                }}
                              >
                                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                                  New project for {client.name}
                                </p>
                                <Input
                                  value={newProjectName}
                                  onChange={(e) => setNewProjectName(e.target.value)}
                                  placeholder="Project name"
                                  className="mt-2"
                                  autoFocus
                                />
                                <Button
                                  type="submit"
                                  size="sm"
                                  className="mt-2 w-full"
                                  disabled={!newProjectName.trim() || isProjectMutationPending}
                                >
                                  Create project
                                </Button>
                              </form>
                            </PopoverContent>
                          </Popover>

                          <Popover
                            open={renameClientId === client.id}
                            onOpenChange={(open) => setRenameClientId(open ? client.id : "")}
                          >
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="sm">
                                Rename
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-72 space-y-2 p-3">
                              <form
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  void renameClient(client.id);
                                }}
                              >
                                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                                  Rename client
                                </p>
                                <Input
                                  value={renameDraft}
                                  onChange={(e) => setRenameDraft(e.target.value)}
                                  className="mt-2"
                                  autoFocus
                                />
                                <Button
                                  type="submit"
                                  size="sm"
                                  className="mt-2 w-full"
                                  disabled={!renameDraft.trim() || isClientMutationPending}
                                >
                                  Save
                                </Button>
                              </form>
                            </PopoverContent>
                          </Popover>

                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isClientMutationPending}
                            onClick={() => void archiveClient(client.id)}
                          >
                            <Archive />
                            Archive
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
