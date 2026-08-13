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
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";

export function WorkspaceTableBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceTableBlock>) {
  const { mutateTypedBlock } = useWorkspaceNodeEditorContext();

  const summary = useMemo(() => getTableSummary(block), [block]);

  function addColumn() {
    mutateTypedBlock(tabId, block.id, "table", (entry) => {
      const column = createWorkspaceTableColumn({
        label: `Column ${entry.columns.length + 1}`,
      });
      entry.columns.push(column);
      entry.rows = entry.rows.map((row) => ({
        ...row,
        cells: { ...row.cells, [column.id]: "" },
      }));
    });
  }

  function addRow() {
    mutateTypedBlock(tabId, block.id, "table", (entry) => {
      entry.rows.push(createWorkspaceTableRow({}, entry.columns));
    });
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-muted">
        <table className="min-w-full border-separate border-spacing-y-2 p-3">
          <caption className="sr-only">
            Editable workspace table with {summary.rowCount} rows and {summary.columnCount} columns
          </caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="w-16 px-2 text-left text-xs font-semibold text-muted-foreground"
              >
                Row
              </th>
              {block.columns.map((column) => (
                <th key={column.id} scope="col" className="min-w-[200px] px-2 text-left">
                  <div className="flex items-center gap-2">
                    <Input
                      value={column.label}
                      className="flex-1 rounded-xl"
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
              <th className="w-12" />
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={row.id}>
                <th
                  scope="row"
                  className="px-2 align-middle text-sm font-semibold text-muted-foreground"
                >
                  {rowIndex + 1}
                </th>
                {block.columns.map((column) => (
                  <td key={`${row.id}-${column.id}`} className="px-2 align-middle">
                    <Input
                      value={row.cells[column.id] ?? ""}
                      className="rounded-xl"
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
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">No rows yet.</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-3 rounded-full"
              aria-label="Add table row"
              onClick={addRow}
            >
              <Plus />
              Add row
            </Button>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 border-t border-muted p-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-full"
            aria-label="Add table column"
            onClick={addColumn}
          >
            <Plus />
            Add column
          </Button>
          {block.rows.length > 0 ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="rounded-full"
              aria-label="Add table row"
              onClick={addRow}
            >
              <Plus />
              Add row
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
