// API/server tests require a valid origin, but the value is not relevant to unit behavior.
if (!Bun.env.CORS_ORIGIN) {
  Bun.env.CORS_ORIGIN = "http://localhost:7001";
}

if (!Bun.env.DATABASE_URL) {
  Bun.env.DATABASE_URL = "postgresql://postgres:password@localhost:5440/brainiac";
}

if (!("__BRAINIAC_SERVER_URL__" in globalThis)) {
  Object.defineProperty(globalThis, "__BRAINIAC_SERVER_URL__", {
    configurable: true,
    value: "http://localhost:7000",
  });
}
