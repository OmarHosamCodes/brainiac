/** Price tracked time for Money income (billable rates; waste tracked separately). */

export function amountFromDurationAndRate(durationSeconds: number, rateAmount: number): number {
  if (!Number.isFinite(durationSeconds) || durationSeconds < 0) {
    throw new Error("durationSeconds must be a non-negative number.");
  }
  if (!Number.isFinite(rateAmount) || rateAmount < 0) {
    throw new Error("rateAmount must be a non-negative number.");
  }
  if (durationSeconds === 0 || rateAmount === 0) return 0;
  return Math.round((durationSeconds / 3600) * rateAmount);
}

/** Project override when set; otherwise inherit the client catalog rate. */
export function resolveEffectiveBillableRate(
  projectRateAmount: number | null | undefined,
  clientRateAmount: number | null | undefined,
): number | null {
  if (projectRateAmount != null) return projectRateAmount;
  if (clientRateAmount != null) return clientRateAmount;
  return null;
}

export type ClientBillableIncomeRow = {
  clientId: string;
  clientName: string;
  category: "internal" | "external";
  projectId: string;
  durationSeconds: number;
  isWaste: boolean;
  projectRateAmount: number | null;
  clientRateAmount: number | null;
};

export type ClientMoneyActivity = {
  clientId: string;
  clientName: string;
  category: "internal" | "external";
  /** Non-waste seconds. */
  durationSeconds: number;
  billableAmount: number;
  wasteAmount: number;
};

export type ExternalBillablePool = {
  billablePoolAmount: number;
  clients: ClientMoneyActivity[];
};

export type ClientInvoiceTimeEntry = {
  projectId: string;
  projectName: string;
  durationSeconds: number;
  isWaste: boolean;
  projectRateAmount?: number | null;
};

export type PricedClientInvoiceProject = {
  projectId: string;
  projectName: string;
  durationSeconds: number;
  rateAmount: number;
  amount: number;
};

export function priceClientInvoiceProjects(
  entries: ReadonlyArray<ClientInvoiceTimeEntry>,
  clientRateAmount: number | null,
):
  | { ok: true; projects: PricedClientInvoiceProject[] }
  | { ok: false; reason: "missing_client_rate" } {
  const billableEntries = entries.filter((entry) => !entry.isWaste);
  const byProject = new Map<
    string,
    Pick<PricedClientInvoiceProject, "projectId" | "projectName" | "durationSeconds"> & {
      projectRateAmount: number | null;
    }
  >();

  for (const entry of billableEntries) {
    const existing = byProject.get(entry.projectId) ?? {
      projectId: entry.projectId,
      projectName: entry.projectName,
      durationSeconds: 0,
      projectRateAmount: entry.projectRateAmount ?? null,
    };
    existing.durationSeconds += entry.durationSeconds;
    if (entry.projectRateAmount != null) {
      existing.projectRateAmount = entry.projectRateAmount;
    }
    byProject.set(entry.projectId, existing);
  }

  const projects: PricedClientInvoiceProject[] = [];
  for (const project of byProject.values()) {
    const rateAmount = resolveEffectiveBillableRate(
      project.projectRateAmount,
      clientRateAmount,
    );
    if (rateAmount === null) {
      return { ok: false, reason: "missing_client_rate" };
    }
    projects.push({
      projectId: project.projectId,
      projectName: project.projectName,
      durationSeconds: project.durationSeconds,
      rateAmount,
      amount: amountFromDurationAndRate(project.durationSeconds, rateAmount),
    });
  }

  return { ok: true, projects };
}

/** Aggregate per-client billable/waste amounts; pool sums external non-waste only. */
export function aggregateExternalBillableIncome(
  rows: ReadonlyArray<ClientBillableIncomeRow>,
): ExternalBillablePool {
  type ClientBucket = Omit<ClientMoneyActivity, "billableAmount" | "wasteAmount"> & {
    billableSecondsByProject: Map<string, number>;
    wasteSecondsByProject: Map<string, number>;
    effectiveRateByProject: Map<string, number | null>;
  };
  const byClient = new Map<string, ClientBucket>();

  for (const row of rows) {
    const effectiveRate = resolveEffectiveBillableRate(
      row.projectRateAmount,
      row.clientRateAmount,
    );
    const existing = byClient.get(row.clientId) ?? {
      clientId: row.clientId,
      clientName: row.clientName,
      category: row.category,
      durationSeconds: 0,
      billableSecondsByProject: new Map<string, number>(),
      wasteSecondsByProject: new Map<string, number>(),
      effectiveRateByProject: new Map<string, number | null>(),
    };
    const secondsByProject = row.isWaste
      ? existing.wasteSecondsByProject
      : existing.billableSecondsByProject;
    secondsByProject.set(
      row.projectId,
      (secondsByProject.get(row.projectId) ?? 0) + row.durationSeconds,
    );
    existing.effectiveRateByProject.set(row.projectId, effectiveRate);

    if (!row.isWaste) {
      existing.durationSeconds += row.durationSeconds;
    }
    byClient.set(row.clientId, existing);
  }

  const clients = [...byClient.values()]
    .map(
      ({
        billableSecondsByProject,
        wasteSecondsByProject,
        effectiveRateByProject,
        ...client
      }): ClientMoneyActivity => ({
        ...client,
        billableAmount: [...billableSecondsByProject.entries()].reduce(
          (total, [projectId, seconds]) => {
            const rate = effectiveRateByProject.get(projectId) ?? 0;
            return total + amountFromDurationAndRate(seconds, rate ?? 0);
          },
          0,
        ),
        wasteAmount: [...wasteSecondsByProject.entries()].reduce(
          (total, [projectId, seconds]) => {
            const rate = effectiveRateByProject.get(projectId) ?? 0;
            return total + amountFromDurationAndRate(seconds, rate ?? 0);
          },
          0,
        ),
      }),
    )
    .sort((a, b) => a.clientName.localeCompare(b.clientName));
  let billablePoolAmount = 0;
  for (const client of clients) {
    if (client.category === "external") {
      billablePoolAmount += client.billableAmount;
    }
  }

  return { billablePoolAmount, clients };
}
