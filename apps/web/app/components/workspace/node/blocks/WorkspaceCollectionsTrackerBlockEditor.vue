<script setup lang="ts">
import {
    WORKSPACE_RECEIVABLE_FILTERS,
    createWorkspaceReceivableInvoice,
    getCollectionsTrackerSummary,
    getReceivableDaysOverdue,
    getReceivableRiskLevel,
    matchesReceivableFilter,
    sortReceivableInvoices,
    workspaceReceivableFilterLabels,
    workspaceReceivableRiskLevelLabels,
    workspaceReceivableStatusLabels,
    type WorkspaceCollectionsTrackerBlock,
    type WorkspaceReceivableFilter,
    type WorkspaceReceivableStatus,
} from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";

const props = defineProps<{
    block: WorkspaceCollectionsTrackerBlock;
    tabId: string;
}>();

const { mutateTypedBlock } = useWorkspaceNodeEditorContext();

const summary = computed(() => getCollectionsTrackerSummary(props.block));
const filteredInvoices = computed(() =>
    sortReceivableInvoices(props.block.invoices).filter((invoice) =>
        matchesReceivableFilter(invoice, props.block.filter),
    ),
);
const overdueCount = computed(
    () =>
        props.block.invoices.filter(
            (invoice) => getReceivableDaysOverdue(invoice) > 0,
        ).length,
);
const highRiskCount = computed(
    () =>
        props.block.invoices.filter(
            (invoice) => getReceivableRiskLevel(invoice) === "high",
        ).length,
);
const paidCount = computed(
    () =>
        props.block.invoices.filter((invoice) => invoice.status === "paid")
            .length,
);
const statusOptions = Object.entries(workspaceReceivableStatusLabels).map(
    ([value, label]) => ({
        label,
        value: value as WorkspaceReceivableStatus,
    }),
) satisfies Array<{ label: string; value: WorkspaceReceivableStatus }>;

const rowGridStyle = {
    gridTemplateColumns:
        "minmax(12rem,1.1fr) minmax(8rem,0.8fr) minmax(9rem,0.9fr) minmax(7rem,0.6fr) minmax(9rem,0.8fr) minmax(9rem,0.8fr) minmax(8rem,0.8fr) minmax(8rem,0.8fr) minmax(18rem,1.3fr) auto",
};

function formatCurrency(value: number) {
    return `${Math.round(value).toLocaleString("en-US")} EGP`;
}

function toInteger(value: string | number | undefined, fallback = 0) {
    const numeric = Number(value);

    if (!Number.isFinite(numeric)) {
        return fallback;
    }

    return Math.max(0, Math.round(numeric));
}

function mutateInvoice(
    invoiceId: string,
    mutator: (
        invoice: WorkspaceCollectionsTrackerBlock["invoices"][number],
    ) => void,
) {
    mutateTypedBlock(
        props.tabId,
        props.block.id,
        "collections-tracker",
        (entry) => {
            const target = entry.invoices.find(
                (candidate) => candidate.id === invoiceId,
            );

            if (!target) {
                return;
            }

            mutator(target);
        },
    );
}

function addInvoice() {
    mutateTypedBlock(
        props.tabId,
        props.block.id,
        "collections-tracker",
        (entry) => {
            entry.invoices.unshift(createWorkspaceReceivableInvoice());
        },
    );
}

function removeInvoice(invoiceId: string) {
    mutateTypedBlock(
        props.tabId,
        props.block.id,
        "collections-tracker",
        (entry) => {
            entry.invoices = entry.invoices.filter(
                (invoice) => invoice.id !== invoiceId,
            );
        },
    );
}

function updateClientName(
    invoiceId: string,
    value: string | number | undefined,
) {
    mutateInvoice(invoiceId, (invoice) => {
        invoice.clientName = String(value ?? "").slice(0, 120);
    });
}

function updateAmount(invoiceId: string, value: string | number | undefined) {
    mutateInvoice(invoiceId, (invoice) => {
        invoice.amountEgp = toInteger(value, invoice.amountEgp);
    });
}

function updateDueDate(invoiceId: string, value: string | number | undefined) {
    mutateInvoice(invoiceId, (invoice) => {
        invoice.dueDate = String(value ?? "") || null;
    });
}

function updateOwner(invoiceId: string, value: string | number | undefined) {
    mutateInvoice(invoiceId, (invoice) => {
        invoice.owner = String(value ?? "").slice(0, 120);
    });
}

function updateNextFollowUpDate(
    invoiceId: string,
    value: string | number | undefined,
) {
    mutateInvoice(invoiceId, (invoice) => {
        invoice.nextFollowUpDate = String(value ?? "") || null;
    });
}

function updateStatus(
    invoiceId: string,
    value: WorkspaceReceivableStatus | string | undefined,
) {
    mutateInvoice(invoiceId, (invoice) => {
        invoice.status =
            value === "due-soon" ||
            value === "partial" ||
            value === "overdue" ||
            value === "paid"
                ? value
                : "due-soon";

        if (invoice.status !== "paid") {
            invoice.paidAt = null;
        }
    });
}

function updatePaidAt(invoiceId: string, value: string | number | undefined) {
    mutateInvoice(invoiceId, (invoice) => {
        invoice.paidAt = String(value ?? "") || null;
    });
}

function updateNotes(invoiceId: string, value: string | number | undefined) {
    mutateInvoice(invoiceId, (invoice) => {
        invoice.notes = String(value ?? "").slice(0, 2000);
    });
}

function getRiskTone(risk: ReturnType<typeof getReceivableRiskLevel>) {
    switch (risk) {
        case "high":
            return "error" as const;
        case "medium":
            return "warning" as const;
        default:
            return "success" as const;
    }
}

function setFilter(filter: WorkspaceReceivableFilter) {
    mutateTypedBlock(
        props.tabId,
        props.block.id,
        "collections-tracker",
        (entry) => {
            entry.filter = filter;
        },
    );
}
</script>

<template>
    <div class="space-y-6">
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div class="rounded-3xl border border-primary/20 bg-primary/10 p-5">
                <p
                    class="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70"
                >
                    Outstanding
                </p>
                <p
                    class="mt-2 text-xl font-black tracking-tight text-primary sm:text-2xl"
                >
                    {{ formatCurrency(summary.totalOutstanding) }}
                </p>
                <p class="mt-1 text-sm text-muted">
                    {{ props.block.invoices.length }} tracked invoices
                </p>
            </div>

            <div class="rounded-3xl border border-error/20 bg-error/10 p-5">
                <p
                    class="text-[10px] font-bold uppercase tracking-[0.2em] text-error/70"
                >
                    Overdue
                </p>
                <p
                    class="mt-2 text-xl font-black tracking-tight text-error sm:text-2xl"
                >
                    {{ formatCurrency(summary.overdueAmount) }}
                </p>
                <p class="mt-1 text-sm text-muted">
                    {{ overdueCount }} invoices need follow-up
                </p>
            </div>

            <div class="rounded-3xl border border-warning/20 bg-warning/10 p-5">
                <p
                    class="text-[10px] font-bold uppercase tracking-[0.2em] text-warning/70"
                >
                    Due This Week
                </p>
                <p
                    class="mt-2 text-xl font-black tracking-tight text-warning sm:text-2xl"
                >
                    {{ formatCurrency(summary.dueThisWeekAmount) }}
                </p>
                <p class="mt-1 text-sm text-muted">
                    {{ highRiskCount }} high-risk exposures
                </p>
            </div>

            <div class="rounded-3xl border border-success/20 bg-success/10 p-5">
                <p
                    class="text-[10px] font-bold uppercase tracking-[0.2em] text-success/70"
                >
                    Collected This Month
                </p>
                <p
                    class="mt-2 text-xl font-black tracking-tight text-success sm:text-2xl"
                >
                    {{ formatCurrency(summary.collectedThisMonth) }}
                </p>
                <p class="mt-1 text-sm text-muted">
                    {{ paidCount }} invoices marked paid
                </p>
            </div>
        </div>

        <div class="flex flex-wrap items-start justify-between gap-3 px-1">
            <div class="space-y-2">
                <div>
                    <p class="text-sm font-semibold text-highlighted">
                        Collections & receivables tracker
                    </p>
                    <p class="text-sm text-muted">
                        Risk is highlighted automatically from invoice size,
                        status, and delay length so the team can focus follow-up
                        where cash exposure is highest.
                    </p>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                    <UBadge color="neutral" variant="soft" class="rounded-2xl">
                        {{ filteredInvoices.length }} visible
                    </UBadge>
                    <UBadge color="neutral" variant="soft" class="rounded-2xl">
                        Filter:
                        {{ workspaceReceivableFilterLabels[block.filter] }}
                    </UBadge>
                    <UBadge
                        v-if="highRiskCount > 0"
                        color="warning"
                        variant="soft"
                        class="rounded-2xl"
                    >
                        {{ highRiskCount }} high risk
                    </UBadge>
                </div>
            </div>

            <div class="flex flex-wrap gap-2">
                <UButton
                    v-for="filter in WORKSPACE_RECEIVABLE_FILTERS"
                    :key="filter"
                    color="neutral"
                    size="sm"
                    :variant="block.filter === filter ? 'soft' : 'ghost'"
                    class="rounded-full px-4"
                    :aria-label="`Show ${workspaceReceivableFilterLabels[filter]} invoices`"
                    @click="setFilter(filter)"
                >
                    {{ workspaceReceivableFilterLabels[filter] }}
                </UButton>

                <UButton
                    color="primary"
                    variant="soft"
                    size="sm"
                    icon="i-lucide-plus"
                    class="rounded-full px-4"
                    aria-label="Add receivable invoice"
                    @click="addInvoice"
                >
                    Add Invoice
                </UButton>
            </div>
        </div>

        <div
            v-if="filteredInvoices.length === 0"
            class="rounded-3xl border border-dashed border-muted/20 bg-elevated/5 py-12 text-center"
        >
            <p
                class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/40"
            >
                No invoices match the current filter
            </p>
            <p class="mt-2 text-sm text-muted">
                Add a receivable or switch the filter to review another part of
                the cash pipeline.
            </p>
        </div>

        <div v-else class="overflow-x-auto pb-4">
            <div
                class="grid min-w-[1560px] gap-px overflow-hidden rounded-3xl border border-muted/20 bg-muted/20"
                :style="rowGridStyle"
            >
                <div
                    v-for="label in [
                        'Client',
                        'Amount',
                        'Due Date',
                        'Overdue',
                        'Owner',
                        'Follow-up',
                        'Status',
                        'Risk',
                        'Notes',
                        'Actions',
                    ]"
                    :key="label"
                    class="bg-elevated/10 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                >
                    {{ label }}
                </div>

                <template v-for="invoice in filteredInvoices" :key="invoice.id">
                    <div class="bg-default/40 p-3">
                        <UInput
                            :model-value="invoice.clientName"
                            variant="none"
                            placeholder="Client"
                            size="sm"
                            :aria-label="`Client name for invoice ${invoice.clientName || 'draft'}`"
                            :ui="{
                                base: 'px-0 font-semibold text-highlighted placeholder:text-muted/60',
                            }"
                            @update:model-value="
                                updateClientName(invoice.id, $event)
                            "
                        />
                    </div>

                    <div class="bg-default/40 p-3">
                        <UInput
                            :model-value="String(invoice.amountEgp)"
                            type="number"
                            size="sm"
                            class="rounded-2xl"
                            :aria-label="`Amount for ${invoice.clientName || 'invoice'}`"
                            @update:model-value="
                                updateAmount(invoice.id, $event)
                            "
                        />
                    </div>

                    <div class="bg-default/40 p-3">
                        <UInput
                            :model-value="invoice.dueDate ?? ''"
                            type="date"
                            size="sm"
                            class="rounded-2xl"
                            :aria-label="`Due date for ${invoice.clientName || 'invoice'}`"
                            @update:model-value="
                                updateDueDate(invoice.id, $event)
                            "
                        />
                    </div>

                    <div class="bg-default/40 p-3">
                        <p
                            class="rounded-2xl border px-3 py-2 text-center text-[10px] font-bold uppercase tracking-[0.1em]"
                            :class="
                                getReceivableDaysOverdue(invoice) > 0
                                    ? 'border-error/20 bg-error/10 text-error'
                                    : 'border-muted/20 bg-elevated/10 text-toned/60'
                            "
                        >
                            {{
                                getReceivableDaysOverdue(invoice) > 0
                                    ? `${getReceivableDaysOverdue(invoice)}d`
                                    : "0d"
                            }}
                        </p>
                    </div>

                    <div class="bg-default/40 p-3">
                        <UInput
                            :model-value="invoice.owner"
                            placeholder="Owner"
                            size="sm"
                            class="rounded-2xl"
                            :aria-label="`Owner for ${invoice.clientName || 'invoice'}`"
                            @update:model-value="
                                updateOwner(invoice.id, $event)
                            "
                        />
                    </div>

                    <div class="bg-default/40 p-3">
                        <UInput
                            :model-value="invoice.nextFollowUpDate ?? ''"
                            type="date"
                            size="sm"
                            class="rounded-2xl"
                            :aria-label="`Next follow-up date for ${invoice.clientName || 'invoice'}`"
                            @update:model-value="
                                updateNextFollowUpDate(invoice.id, $event)
                            "
                        />
                    </div>

                    <div class="bg-default/40 p-3">
                        <USelect
                            :model-value="invoice.status"
                            :items="statusOptions"
                            size="sm"
                            class="rounded-2xl"
                            :aria-label="`Status for ${invoice.clientName || 'invoice'}`"
                            @update:model-value="
                                updateStatus(
                                    invoice.id,
                                    $event as
                                        | WorkspaceReceivableStatus
                                        | undefined,
                                )
                            "
                        />
                    </div>

                    <div class="bg-default/40 p-3">
                        <UBadge
                            :color="
                                getRiskTone(getReceivableRiskLevel(invoice))
                            "
                            variant="soft"
                            size="sm"
                            class="rounded-2xl px-3"
                        >
                            {{
                                workspaceReceivableRiskLevelLabels[
                                    getReceivableRiskLevel(invoice)
                                ]
                            }}
                        </UBadge>

                        <UInput
                            v-if="invoice.status === 'paid'"
                            :model-value="invoice.paidAt ?? ''"
                            type="date"
                            size="sm"
                            class="mt-2 rounded-2xl"
                            :aria-label="`Paid date for ${invoice.clientName || 'invoice'}`"
                            @update:model-value="
                                updatePaidAt(invoice.id, $event)
                            "
                        />
                    </div>

                    <div class="bg-default/40 p-3">
                        <UTextarea
                            :model-value="invoice.notes"
                            autoresize
                            :rows="1"
                            :ui="{ base: 'rounded-2xl bg-elevated/10 text-sm' }"
                            placeholder="Follow-up notes"
                            :aria-label="`Follow-up notes for ${invoice.clientName || 'invoice'}`"
                            @update:model-value="
                                updateNotes(invoice.id, $event)
                            "
                        />
                    </div>

                    <div class="bg-default/40 p-3">
                        <UButton
                            color="neutral"
                            variant="ghost"
                            icon="i-lucide-trash-2"
                            class="rounded-xl transition-colors hover:text-error"
                            :aria-label="`Remove ${invoice.clientName || 'invoice'}`"
                            @click="removeInvoice(invoice.id)"
                        />
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>
