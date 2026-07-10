import {
  createWorkspaceTableColumn,
  createWorkspaceTableRow,
  getTableSummary,
  type WorkspaceTableBlock,
} from "@orch/workspace";
import { Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";

export function WorkspaceTableBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceTableBlock>) {
  const { mutateTypedBlock } = useWorkspaceNodeEditorContext();

  const summary = useMemo(() => getTableSummary(block), [block]);
  const completionPercent = Math.round(
    (summary.filledCellCount / Math.max(summary.rowCount * summary.columnCount, 1)) * 100,
  );

  function getRowFilledCellCount(row: WorkspaceTableBlock["rows"][number]) {
    return block.columns.filter((column) => Boolean(row.cells[column.id]?.trim())).length;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-muted/20 bg-muted/10 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                Columns
              </p>
              <p className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                {summary.columnCount}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                Rows
              </p>
              <p className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                {summary.rowCount}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                Filled Cells
              </p>
              <p className="text-2xl font-black tracking-tight text-primary sm:text-3xl">
                {summary.filledCellCount}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                Coverage
              </p>
              <p className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                {completionPercent}%
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-2xl">
              {summary.columnCount} columns
            </Badge>
            <Badge variant="secondary" className="rounded-2xl">
              {summary.rowCount} rows
            </Badge>
            <Badge variant="secondary" className="rounded-2xl">
              {summary.filledCellCount} filled
            </Badge>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-muted/10 pt-6">
          <Button
            type="button"
            variant="secondary"
            className="rounded-full"
            aria-label="Add table column"
            onClick={() =>
              mutateTypedBlock(tabId, block.id, "table", (entry) => {
                const column = createWorkspaceTableColumn({
                  label: `Column ${entry.columns.length + 1}`,
                });
                entry.columns.push(column);
                entry.rows = entry.rows.map((row) => ({
                  ...row,
                  cells: { ...row.cells, [column.id]: "" },
                }));
              })
            }
          >
            <Plus />
            Add Column
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="rounded-full"
            aria-label="Add table row"
            onClick={() =>
              mutateTypedBlock(tabId, block.id, "table", (entry) => {
                entry.rows.push(createWorkspaceTableRow({}, entry.columns));
              })
            }
          >
            <Plus />
            Add Row
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-muted/20 bg-background/40 p-4">
        <table className="min-w-full border-separate border-spacing-y-3">
          <caption className="sr-only">
            Editable workspace table with {summary.rowCount} rows and {summary.columnCount} columns
          </caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="w-20 px-2 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60"
              >
                Row
              </th>
              {block.columns.map((column) => (
                <th key={column.id} scope="col" className="min-w-[200px] px-2 text-left">
                  <div className="flex items-center gap-2">
                    <Input
                      value={column.label}
                      className="flex-1 rounded-2xl"
                      aria-label={`Column label for ${column.label || "table column"}`}
                      onChange={(event) =>
                        mutateTypedBlock(tabId, block.id, "table", (entry) => {
                          const target = entry.columns.find((item) => item.id === column.id);
                          if (target) {
                            target.label = event.target.value.slice(0, 80);
                          }
                        })
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={block.columns.length <= 1}
                      className="rounded-xl hover:text-destructive"
                      aria-label={`Remove ${column.label || "table"} column`}
                      onClick={() =>
                        mutateTypedBlock(tabId, block.id, "table", (entry) => {
                          if (entry.columns.length <= 1) {
                            return;
                          }
                          entry.columns = entry.columns.filter((item) => item.id !== column.id);
                          entry.rows = entry.rows.map((row) => {
                            const nextCells = { ...row.cells };
                            delete nextCells[column.id];
                            return { ...row, cells: nextCells };
                          });
                        })
                      }
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </th>
              ))}
              <th
                scope="col"
                className="w-28 px-2 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60"
              >
                Status
              </th>
              <th className="w-12" />
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={row.id}>
                <th
                  scope="row"
                  className="px-2 align-middle text-sm font-bold text-muted-foreground/60"
                >
                  <div className="space-y-1">
                    <p>Row {rowIndex + 1}</p>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
                      {getRowFilledCellCount(row)}/{block.columns.length} filled
                    </p>
                  </div>
                </th>
                {block.columns.map((column) => (
                  <td key={`${row.id}-${column.id}`} className="px-2 align-middle">
                    <Input
                      value={row.cells[column.id] ?? ""}
                      className="rounded-2xl"
                      aria-label={`Value for row ${rowIndex + 1}, ${column.label || "column"}`}
                      onChange={(event) =>
                        mutateTypedBlock(tabId, block.id, "table", (entry) => {
                          const targetRow = entry.rows.find((item) => item.id === row.id);
                          if (targetRow) {
                            targetRow.cells[column.id] = event.target.value.slice(0, 4000);
                          }
                        })
                      }
                    />
                  </td>
                ))}
                <td className="px-2 align-middle">
                  <Badge variant="secondary" className="rounded-2xl">
                    {getRowFilledCellCount(row) === block.columns.length
                      ? "Complete"
                      : "In progress"}
                  </Badge>
                </td>
                <td className="px-2 align-middle">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-xl hover:text-destructive"
                    aria-label={`Remove row ${rowIndex + 1}`}
                    onClick={() =>
                      mutateTypedBlock(tabId, block.id, "table", (entry) => {
                        entry.rows = entry.rows.filter((item) => item.id !== row.id);
                      })
                    }
                  >
                    <Trash2 />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {block.rows.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-muted/20 bg-muted/5 py-12 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
              No rows added yet
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Start by adding a row or column to build this table.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
