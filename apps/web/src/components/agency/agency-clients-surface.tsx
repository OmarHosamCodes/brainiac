import { useQuery } from "@tanstack/react-query";
import { Archive, Building2, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/lib/orpc";
import { withAgencyLiveQueryOptions } from "@/lib/utils/agency-query-options";
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
  const [selectedClientId, setSelectedClientId] = useState("");
  const [renameDraft, setRenameDraft] = useState("");
  const [renameOpen, setRenameOpen] = useState(false);
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactDirty, setContactDirty] = useState(false);

  const clientsQuery = useQuery(
    withAgencyLiveQueryOptions({
      ...orpc.agencyOps.clients.list.queryOptions({ input: { teamId } }),
      enabled: Boolean(teamId),
    }),
  );

  const projectsQuery = useQuery(
    withAgencyLiveQueryOptions({
      ...orpc.agencyOps.projects.list.queryOptions({ input: { teamId } }),
      enabled: Boolean(teamId),
    }),
  );

  const entriesQuery = useQuery(
    withAgencyLiveQueryOptions({
      ...orpc.agencyOps.timeEntries.listMine.queryOptions({
        input: { teamId, page: 1, pageSize: 100 },
      }),
      enabled: Boolean(teamId),
    }),
  );

  const contactQuery = useQuery(
    withAgencyLiveQueryOptions({
      ...orpc.agencyOps.contacts.get.queryOptions({
        input: { teamId, clientId: selectedClientId },
      }),
      enabled: Boolean(teamId) && Boolean(selectedClientId),
    }),
  );

  const clientsQueryKey = orpc.agencyOps.clients.list.queryOptions({ input: { teamId } }).queryKey;
  const projectsQueryKey = orpc.agencyOps.projects.list.queryOptions({ input: { teamId } }).queryKey;
  const contactQueryKey = orpc.agencyOps.contacts.get.queryOptions({
    input: { teamId, clientId: selectedClientId },
  }).queryKey;

  useEffect(() => {
    if (!teamId || !selectedClientId) return;
    agencyOps.registerContactQuery({ queryKey: contactQueryKey, teamId, clientId: selectedClientId });
    return () => agencyOps.unregisterContactQuery(contactQueryKey);
  }, [teamId, selectedClientId, contactQueryKey, agencyOps]);

  useEffect(() => {
    if (!teamId) return;
    agencyOps.registerClientsQuery({ queryKey: clientsQueryKey, teamId });
    return () => agencyOps.unregisterClientsQuery(clientsQueryKey);
  }, [teamId, clientsQueryKey, agencyOps]);

  useEffect(() => {
    if (!teamId) return;
    agencyOps.registerProjectsQuery({ queryKey: projectsQueryKey, teamId });
    return () => agencyOps.unregisterProjectsQuery(projectsQueryKey);
  }, [teamId, projectsQueryKey, agencyOps]);

  const clients = clientsQuery.data?.items ?? [];
  const projects = projectsQuery.data?.items ?? [];
  const entries = entriesQuery.data?.items ?? [];

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
    if (!term) return clients;
    return clients.filter((client) => client.name.toLowerCase().includes(term));
  }, [clients, filterTerm]);

  useEffect(() => {
    if (filteredClients.length === 0) {
      setSelectedClientId("");
      return;
    }
    if (!filteredClients.some((client) => client.id === selectedClientId)) {
      setSelectedClientId(filteredClients[0]!.id);
    }
  }, [filteredClients, selectedClientId]);

  const selectedClient = clients.find((client) => client.id === selectedClientId) ?? null;
  const selectedClientProjects = projectsByClient.get(selectedClientId) ?? [];

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
  }, [selectedClientId]);

  useEffect(() => {
    if (renameOpen && selectedClient) {
      setRenameDraft(selectedClient.name);
    }
  }, [renameOpen, selectedClient]);

  async function createClient() {
    const name = newClientName.trim();
    if (!name || !teamId) return;
    setNewClientName("");
    setNewClientOpen(false);
    await agencyOps.createClient({ teamId, name }, { onSuccess: (clientId) => setSelectedClientId(clientId) });
  }

  async function renameClient() {
    if (!selectedClient || !teamId) return;
    const name = renameDraft.trim();
    if (!name || name === selectedClient.name) {
      setRenameOpen(false);
      return;
    }
    setRenameOpen(false);
    await agencyOps.updateClient({ teamId, clientId: selectedClient.id, name });
  }

  async function createProject() {
    const name = newProjectName.trim();
    if (!name || !teamId || !selectedClient) return;
    setNewProjectName("");
    await agencyOps.createProject({
      teamId,
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      name,
    });
  }

  async function saveContact() {
    if (!teamId || !selectedClientId) return;
    await agencyOps.upsertContact(
      {
        teamId,
        clientId: selectedClientId,
        name: contactName.trim(),
        email: contactEmail.trim(),
        phone: contactPhone.trim(),
      },
      { onSuccess: () => setContactDirty(false) },
    );
  }

  async function archiveClient() {
    if (!selectedClient || !teamId) return;
    await agencyOps.archiveClient({
      teamId,
      clientId: selectedClient.id,
      clientName: selectedClient.name,
    });
    setSelectedClientId("");
  }

  const isLoading = clientsQuery.isPending || projectsQuery.isPending;

  return (
    <div className="agency-clients">
      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-[18rem,1fr]">
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : clients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-default bg-muted/20 p-10 text-center">
          <Building2 className="mx-auto size-7 text-muted" />
          <p className="mt-4 text-sm font-bold text-highlighted">No clients yet.</p>
          <p className="mt-1 text-xs text-muted">Add your first client to start grouping projects and time.</p>
          <Popover open={newClientOpen} onOpenChange={setNewClientOpen}>
            <PopoverTrigger asChild>
              <Button variant="secondary" size="sm" className="mt-4">
                <Plus />
                Add client
              </Button>
            </PopoverTrigger>
            <PopoverContent align="center" className="w-72 space-y-2 p-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void createClient();
                }}
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">New client</p>
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
      ) : (
        <div className="grid gap-4 lg:grid-cols-[18rem,1fr]">
          <aside className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted" />
                <Input
                  value={filterTerm}
                  onChange={(e) => setFilterTerm(e.target.value)}
                  placeholder="Filter clients"
                  className="pl-9"
                />
              </div>
              <Popover open={newClientOpen} onOpenChange={setNewClientOpen}>
                <PopoverTrigger asChild>
                  <Button size="sm" aria-label="New client">
                    <Plus />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 space-y-2 p-3">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void createClient();
                    }}
                  >
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">New client</p>
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

            <ul className="space-y-1">
              {filteredClients.map((client) => (
                <li key={client.id}>
                  <button
                    type="button"
                    className={[
                      "group flex w-full items-center justify-between gap-2 rounded-xl border border-transparent px-3 py-2.5 text-left transition-colors",
                      client.id === selectedClientId
                        ? "border-default bg-elevated"
                        : "hover:bg-elevated/60",
                    ].join(" ")}
                    onClick={() => setSelectedClientId(client.id)}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-highlighted">{client.name}</p>
                      <p className="text-[11px] text-muted">
                        {projectsByClient.get(client.id)?.length ?? 0} projects
                      </p>
                    </div>
                    <span className="font-mono text-[11px] tabular-nums text-muted">
                      {formatDuration(weekHoursByClient.get(client.id) ?? 0, "short")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            {filteredClients.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-muted">No matches.</p>
            ) : null}
          </aside>

          {selectedClient ? (
            <section className="space-y-4">
              <div className="flex flex-wrap items-baseline justify-between gap-3 rounded-2xl border border-default bg-default p-5">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Client</p>
                  <h2 className="mt-1 truncate text-lg font-bold text-highlighted">{selectedClient.name}</h2>
                  <p className="mt-1 font-mono text-[11px] tabular-nums text-muted">
                    {formatDuration(weekHoursByClient.get(selectedClient.id) ?? 0, "short")} this week ·{" "}
                    {selectedClientProjects.length} projects
                  </p>
                </div>
                <Popover open={renameOpen} onOpenChange={setRenameOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm">
                      Rename
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-72 space-y-2 p-3">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void renameClient();
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
              </div>

              <div className="rounded-2xl border border-default bg-default">
                <div className="border-b border-default px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Projects</p>
                </div>
                {selectedClientProjects.length > 0 ? (
                  <ul>
                    {selectedClientProjects.map((project) => (
                      <li
                        key={project.id}
                        className="flex items-center gap-3 border-b border-default px-4 py-3 last:border-b-0"
                      >
                        <span
                          className="agency-clients__dot inline-block size-2 shrink-0 rounded-full"
                          aria-hidden="true"
                          style={projectHueStyle(project.id)}
                        />
                        <span className="flex-1 truncate text-xs font-bold text-highlighted">
                          {project.name}
                        </span>
                        <span className="text-[11px] text-dimmed">Active</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-4 py-6 text-center">
                    <p className="text-xs text-muted">No projects yet for this client.</p>
                  </div>
                )}
                <form
                  className="flex items-center gap-2 border-t border-default px-4 py-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void createProject();
                  }}
                >
                  <Input
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Add a project"
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!newProjectName.trim() || isProjectMutationPending}
                  >
                    Add
                  </Button>
                </form>
              </div>

              <div className="space-y-0 divide-y divide-default overflow-hidden rounded-2xl border border-default bg-default">
                <section className="px-5 py-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                    Primary contact
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
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
                  <div className="mt-3 flex items-center gap-3">
                    <Button
                      size="sm"
                      disabled={!contactDirty || isContactMutationPending}
                      onClick={() => void saveContact()}
                    >
                      Save contact
                    </Button>
                  </div>
                </section>

                <section className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Archive</p>
                    <p className="mt-1 text-xs text-muted">
                      Archive {selectedClient.name} to remove them from active filters and billing without
                      losing their history.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isClientMutationPending}
                    onClick={() => void archiveClient()}
                  >
                    <Archive />
                    Archive client
                  </Button>
                </section>
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
