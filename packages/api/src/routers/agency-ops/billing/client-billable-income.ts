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

/** Task override when set; else project; else inherit the client catalog rate. */
export function resolveEffectiveBillableRate(
  taskRateAmount: number | null | undefined,
  projectRateAmount?: number | null | undefined,
  clientRateAmount?: number | null | undefined,
): number | null {
  if (taskRateAmount != null) return taskRateAmount;
  if (projectRateAmount != null) return projectRateAmount;
  if (clientRateAmount != null) return clientRateAmount;
  return null;
}

function rateBucketKey(projectId: string, effectiveRate: number | null): string {
  return `${projectId}\0${effectiveRate ?? "null"}`;
}

export type ClientBillableIncomeRow = {
  clientId: string;
  clientName: string;
  category: "internal" | "external";
  projectId: string;
  durationSeconds: number;
  isWaste: boolean;
  taskRateAmount?: number | null;
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
  taskRateAmount?: number | null;
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
  const byBucket = new Map<
    string,
    Pick<PricedClientInvoiceProject, "projectId" | "projectName" | "durationSeconds" | "rateAmount">
  >();

  for (const entry of billableEntries) {
    const rateAmount = resolveEffectiveBillableRate(
      entry.taskRateAmount,
      entry.projectRateAmount,
      clientRateAmount,
    );
    if (rateAmount === null) {
      return { ok: false, reason: "missing_client_rate" };
    }
    const key = rateBucketKey(entry.projectId, rateAmount);
    const existing = byBucket.get(key) ?? {
      projectId: entry.projectId,
      projectName: entry.projectName,
      durationSeconds: 0,
      rateAmount,
    };
    existing.durationSeconds += entry.durationSeconds;
    byBucket.set(key, existing);
  }

  const projects: PricedClientInvoiceProject[] = [...byBucket.values()].map((bucket) => ({
    projectId: bucket.projectId,
    projectName: bucket.projectName,
    durationSeconds: bucket.durationSeconds,
    rateAmount: bucket.rateAmount,
    amount: amountFromDurationAndRate(bucket.durationSeconds, bucket.rateAmount),
  }));

  return { ok: true, projects };
}

/** Aggregate per-client billable/waste amounts; pool sums external non-waste only. */
export function aggregateExternalBillableIncome(
  rows: ReadonlyArray<ClientBillableIncomeRow>,
): ExternalBillablePool {
  type ClientBucket = Omit<ClientMoneyActivity, "billableAmount" | "wasteAmount"> & {
    billableSecondsByBucket: Map<string, number>;
    wasteSecondsByBucket: Map<string, number>;
    effectiveRateByBucket: Map<string, number | null>;
  };
  const byClient = new Map<string, ClientBucket>();

  for (const row of rows) {
    const effectiveRate = resolveEffectiveBillableRate(
      row.taskRateAmount,
      row.projectRateAmount,
      row.clientRateAmount,
    );
    const bucketKey = rateBucketKey(row.projectId, effectiveRate);
    const existing = byClient.get(row.clientId) ?? {
      clientId: row.clientId,
      clientName: row.clientName,
      category: row.category,
      durationSeconds: 0,
      billableSecondsByBucket: new Map<string, number>(),
      wasteSecondsByBucket: new Map<string, number>(),
      effectiveRateByBucket: new Map<string, number | null>(),
    };
    const secondsByBucket = row.isWaste
      ? existing.wasteSecondsByBucket
      : existing.billableSecondsByBucket;
    secondsByBucket.set(bucketKey, (secondsByBucket.get(bucketKey) ?? 0) + row.durationSeconds);
    existing.effectiveRateByBucket.set(bucketKey, effectiveRate);

    if (!row.isWaste) {
      existing.durationSeconds += row.durationSeconds;
    }
    byClient.set(row.clientId, existing);
  }

  const clients = [...byClient.values()]
    .map(
      ({
        billableSecondsByBucket,
        wasteSecondsByBucket,
        effectiveRateByBucket,
        ...client
      }): ClientMoneyActivity => ({
        ...client,
        billableAmount: [...billableSecondsByBucket.entries()].reduce(
          (total, [bucketKey, seconds]) => {
            const rate = effectiveRateByBucket.get(bucketKey) ?? 0;
            return total + amountFromDurationAndRate(seconds, rate ?? 0);
          },
          0,
        ),
        wasteAmount: [...wasteSecondsByBucket.entries()].reduce((total, [bucketKey, seconds]) => {
          const rate = effectiveRateByBucket.get(bucketKey) ?? 0;
          return total + amountFromDurationAndRate(seconds, rate ?? 0);
        }, 0),
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
