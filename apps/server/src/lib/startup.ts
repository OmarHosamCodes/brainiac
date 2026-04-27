/**
 * Server startup utility
 * 
 * Provides helpful logging and information when the development server starts
 */

export function logStartup(config: { port: number; baseUrl: string; corsOrigin: string }) {
  console.log("");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("🧠 Brainiac Backend Server");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("");
  console.log(`✅ Server running on: ${config.baseUrl}`);
  console.log("");
  console.log("📍 Endpoints:");
  console.log(`  • API:  ${config.baseUrl}/rpc`);
  console.log(`  • Auth: ${config.baseUrl}/api/auth`);
  console.log(`  • Docs: ${config.baseUrl}/openapi`);
  console.log("");
  console.log("🔗 CORS:");
  console.log(`  • Allowed origin: ${config.corsOrigin}`);
  console.log("");
  console.log("💡 Tips:");
  console.log("  • Frontend should connect to: " + config.baseUrl);
  console.log("  • Check logs if frontend shows connection errors");
  console.log("  • Run 'bun run db:start' if database isn't running");
  console.log("");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("");
}
