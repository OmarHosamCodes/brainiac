import { describe, expect, test } from "bun:test";

import { rpcProcedureFromRequest } from "./rpc-span";

describe("rpcProcedureFromRequest", () => {
  test("names slash-delimited oRPC paths with dots", () => {
    const request = new Request("https://orch.example/rpc/agencyOps/timer/getActive", {
      method: "POST",
    });
    expect(rpcProcedureFromRequest(request)).toBe("agencyOps.timer.getActive");
  });

  test("keeps already-dotted procedure paths", () => {
    const request = new Request("http://localhost:7000/rpc/agencyOps.reports.live");
    expect(rpcProcedureFromRequest(request)).toBe("agencyOps.reports.live");
  });

  test("ignores the websocket upgrade path and non-rpc URLs", () => {
    expect(rpcProcedureFromRequest(new Request("https://orch.example/rpc/ws"))).toBeUndefined();
    expect(rpcProcedureFromRequest(new Request("https://orch.example/"))).toBeUndefined();
    expect(rpcProcedureFromRequest(new Request("https://orch.example/rpc"))).toBeUndefined();
  });
});
