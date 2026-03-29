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

const { mutateBlock } = useWorkspaceNodeEditorContext();

const summary = computed(() => getTableSummary(props.block));

function addColumn() {
  mutateBlock(props.tabId, props.block.id, (entry) => {
    if (entry.type !== "table") {
      return;
    }

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
  mutateBlock(props.tabId, props.block.id, (entry) => {
    if (entry.type !== "table" || entry.columns.length <= 1) {
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

function addRow() {
  mutateBlock(props.tabId, props.block.id, (entry) => {
    if (entry.type !== "table") {
      return;
    }

    entry.rows.push(createWorkspaceTableRow({}, entry.columns));
  });
}

function removeRow(rowId: string) {
  mutateBlock(props.tabId, props.block.id, (entry) => {
    if (entry.type !== "table") {
      return;
    }

    entry.rows = entry.rows.filter((row) => row.id !== rowId);
  });
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-elevated/20 p-5">
      <div class="grid gap-4 sm:grid-cols-3">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-widest text-muted/60">Columns</p>
          <p class="mt-1 text-2xl font-black text-highlighted">{{ summary.columnCount }}</p>
        </div>
        <div>
          <p class="text-[10px] font-bold uppercase tracking-widest text-muted/60">Rows</p>
          <p class="mt-1 text-2xl font-black text-highlighted">{{ summary.rowCount }}</p>
        </div>
        <div>
          <p class="text-[10px] font-bold uppercase tracking-widest text-muted/60">Filled Cells</p>
          <p class="mt-1 text-2xl font-black text-primary">{{ summary.filledCellCount }}</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          color="neutral"
          variant="soft"
          icon="i-lucide-plus"
          class="rounded-full"
          @click="addColumn"
        >
          Add Column
        </UButton>
        <UButton
          color="primary"
          variant="soft"
          icon="i-lucide-plus"
          class="rounded-full"
          @click="addRow"
        >
          Add Row
        </UButton>
      </div>
    </div>

    <div class="overflow-x-auto rounded-[32px] border border-muted/20 bg-default/30 p-4">
      <table class="min-w-full border-separate border-spacing-y-3">
        <thead>
          <tr>
            <th class="w-12 px-2 text-left text-[10px] font-bold uppercase tracking-widest text-muted/50">
              #
            </th>
            <th
              v-for="column in block.columns"
              :key="column.id"
              class="min-w-[180px] px-2 text-left"
            >
              <div class="flex items-center gap-2">
                <UInput
                  :model-value="column.label"
                  variant="soft"
                  class="flex-1 rounded-2xl"
                  @update:model-value="
                    mutateBlock(tabId, block.id, (entry) => {
                      if (entry.type !== 'table') {
                        return;
                      }

                      const target = entry.columns.find((item) => item.id === column.id);

                      if (target) {
                        target.label = ($event ?? '').slice(0, 80);
                      }
                    })
                  "
                />
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  icon="i-lucide-trash-2"
                  :disabled="block.columns.length <= 1"
                  class="rounded-xl hover:text-error"
                  @click="removeColumn(column.id)"
                />
              </div>
            </th>
            <th class="w-12" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, rowIndex) in block.rows" :key="row.id">
            <td class="px-2 align-middle text-sm font-bold text-muted/60">{{ rowIndex + 1 }}</td>
            <td
              v-for="column in block.columns"
              :key="`${row.id}-${column.id}`"
              class="px-2 align-middle"
            >
              <UInput
                :model-value="row.cells[column.id] ?? ''"
                variant="soft"
                class="rounded-2xl"
                @update:model-value="
                  mutateBlock(tabId, block.id, (entry) => {
                    if (entry.type !== 'table') {
                      return;
                    }

                    const targetRow = entry.rows.find((item) => item.id === row.id);

                    if (targetRow) {
                      targetRow.cells[column.id] = ($event ?? '').slice(0, 4000);
                    }
                  })
                "
              />
            </td>
            <td class="px-2 align-middle">
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                icon="i-lucide-trash-2"
                class="rounded-xl hover:text-error"
                @click="removeRow(row.id)"
              />
            </td>
          </tr>
        </tbody>
      </table>

      <div
        v-if="block.rows.length === 0"
        class="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-muted/30 bg-default/20 py-12 text-center"
      >
        <p class="text-sm font-bold uppercase tracking-widest text-muted/60">No rows added yet</p>
      </div>
    </div>
  </div>
</template>
