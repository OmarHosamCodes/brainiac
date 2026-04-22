<script setup lang="ts">
import {
  createWorkspaceTableColumn,
  createWorkspaceTableRow,
  getTableSummary,
  type WorkspaceTableBlock,
} from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";

const props = defineProps<{
  block: WorkspaceTableBlock;
  tabId: string;
}>();

const { mutateTypedBlock } = useWorkspaceNodeEditorContext();

const summary = computed(() => getTableSummary(props.block));
const completionPercent = computed(() =>
  Math.round(
    (summary.value.filledCellCount /
      Math.max(summary.value.rowCount * summary.value.columnCount, 1)) *
      100,
  ),
);

function addColumn() {
  mutateTypedBlock(props.tabId, props.block.id, "table", (entry) => {
    const column = createWorkspaceTableColumn({
      label: `Column ${entry.columns.length + 1}`,
    });

    entry.columns.push(column);
    entry.rows = entry.rows.map((row) => ({
      ...row,
      cells: {
        ...row.cells,
        [column.id]: "",
      },
    }));
  });
}

function removeColumn(columnId: string) {
  mutateTypedBlock(props.tabId, props.block.id, "table", (entry) => {
    if (entry.columns.length <= 1) {
      return;
    }

    entry.columns = entry.columns.filter((column) => column.id !== columnId);
    entry.rows = entry.rows.map((row) => {
      const nextCells = { ...row.cells };
      delete nextCells[columnId];
      return {
        ...row,
        cells: nextCells,
      };
    });
  });
}

function updateColumnLabel(columnId: string, value: string | number | undefined) {
  mutateTypedBlock(props.tabId, props.block.id, "table", (entry) => {
    const target = entry.columns.find((item) => item.id === columnId);

    if (!target) {
      return;
    }

    target.label = String(value ?? "").slice(0, 80);
  });
}

function addRow() {
  mutateTypedBlock(props.tabId, props.block.id, "table", (entry) => {
    entry.rows.push(createWorkspaceTableRow({}, entry.columns));
  });
}

function removeRow(rowId: string) {
  mutateTypedBlock(props.tabId, props.block.id, "table", (entry) => {
    entry.rows = entry.rows.filter((row) => row.id !== rowId);
  });
}

function updateCellValue(rowId: string, columnId: string, value: string | number | undefined) {
  mutateTypedBlock(props.tabId, props.block.id, "table", (entry) => {
    const targetRow = entry.rows.find((item) => item.id === rowId);

    if (!targetRow) {
      return;
    }

    targetRow.cells[columnId] = String(value ?? "").slice(0, 4000);
  });
}

function getRowFilledCellCount(row: WorkspaceTableBlock["rows"][number]) {
  return props.block.columns.filter((column) => Boolean(row.cells[column.id]?.trim())).length;
}
</script>

<template>
  <div class="space-y-6">
    <div class="rounded-3xl border border-muted/20 bg-elevated/10 p-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="space-y-1">
            <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Columns</p>
            <p class="text-2xl sm:text-3xl font-black tracking-tight text-highlighted">
              {{ summary.columnCount }}
            </p>
          </div>
          <div class="space-y-1">
            <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Rows</p>
            <p class="text-2xl sm:text-3xl font-black tracking-tight text-highlighted">
              {{ summary.rowCount }}
            </p>
          </div>
          <div class="space-y-1">
            <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
              Filled Cells
            </p>
            <p class="text-2xl sm:text-3xl font-black tracking-tight text-primary">
              {{ summary.filledCellCount }}
            </p>
          </div>
          <div class="space-y-1">
            <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Coverage</p>
            <p class="text-2xl sm:text-3xl font-black tracking-tight text-highlighted">
              {{ completionPercent }}%
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <UBadge variant="subtle" class="rounded-2xl"> {{ summary.columnCount }} columns </UBadge>
          <UBadge color="neutral" variant="soft" class="rounded-2xl">
            {{ summary.rowCount }} rows
          </UBadge>
          <UBadge color="primary" variant="soft" class="rounded-2xl">
            {{ summary.filledCellCount }} filled
          </UBadge>
        </div>
      </div>

      <div class="mt-6 flex flex-wrap items-center gap-2 border-t border-muted/10 pt-6">
        <UButton
          color="neutral"
          variant="soft"
          icon="i-lucide-plus"
          class="rounded-full"
          aria-label="Add table column"
          @click="addColumn"
        >
          Add Column
        </UButton>
        <UButton
          color="primary"
          variant="soft"
          icon="i-lucide-plus"
          class="rounded-full"
          aria-label="Add table row"
          @click="addRow"
        >
          Add Row
        </UButton>
      </div>
    </div>

    <div class="overflow-x-auto rounded-3xl border border-muted/20 bg-default/40 p-4">
      <table class="min-w-full border-separate border-spacing-y-3">
        <caption class="sr-only">
          Editable workspace table with
          {{
            summary.rowCount
          }}
          rows and
          {{
            summary.columnCount
          }}
          columns
        </caption>
        <thead>
          <tr>
            <th
              scope="col"
              class="w-20 px-2 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
            >
              Row
            </th>
            <th
              v-for="column in block.columns"
              :key="column.id"
              scope="col"
              class="min-w-[200px] px-2 text-left"
            >
              <div class="flex items-center gap-2">
                <UInput
                  :model-value="column.label"
                  variant="soft"
                  class="flex-1 rounded-2xl"
                  :aria-label="`Column label for ${column.label || 'table column'}`"
                  @update:model-value="updateColumnLabel(column.id, $event)"
                />
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  icon="i-lucide-trash-2"
                  :disabled="block.columns.length <= 1"
                  class="rounded-xl hover:text-error"
                  :aria-label="`Remove ${column.label || 'table'} column`"
                  @click="removeColumn(column.id)"
                />
              </div>
            </th>
            <th
              scope="col"
              class="w-28 px-2 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
            >
              Status
            </th>
            <th class="w-12" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, rowIndex) in block.rows" :key="row.id">
            <th scope="row" class="px-2 align-middle text-sm font-bold text-muted/60">
              <div class="space-y-1">
                <p>Row {{ rowIndex + 1 }}</p>
                <p class="text-[9px] font-bold uppercase tracking-widest text-muted/40">
                  {{ getRowFilledCellCount(row) }}/{{ block.columns.length }}
                  filled
                </p>
              </div>
            </th>
            <td
              v-for="column in block.columns"
              :key="`${row.id}-${column.id}`"
              class="px-2 align-middle"
            >
              <UInput
                :model-value="row.cells[column.id] ?? ''"
                variant="soft"
                class="rounded-2xl"
                :aria-label="`Value for row ${rowIndex + 1}, ${column.label || 'column'}`"
                @update:model-value="updateCellValue(row.id, column.id, $event)"
              />
            </td>
            <td class="px-2 align-middle">
              <UBadge color="neutral" variant="soft" class="rounded-2xl">
                {{
                  getRowFilledCellCount(row) === block.columns.length ? "Complete" : "In progress"
                }}
              </UBadge>
            </td>
            <td class="px-2 align-middle">
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                icon="i-lucide-trash-2"
                class="rounded-xl hover:text-error"
                :aria-label="`Remove row ${rowIndex + 1}`"
                @click="removeRow(row.id)"
              />
            </td>
          </tr>
        </tbody>
      </table>

      <div
        v-if="block.rows.length === 0"
        class="rounded-3xl border border-dashed border-muted/20 bg-elevated/5 py-12 text-center"
      >
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
          No rows added yet
        </p>
        <p class="mt-2 text-sm text-muted">Start by adding a row or column to build this table.</p>
      </div>
    </div>
  </div>
</template>
