import type { Context } from "@brainiac/api/context";
import { appRouter } from "@brainiac/api/routers/index";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";

const apiHandler = new OpenAPIHandler(appRouter, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
    }),
  ],
});

const rpcHandler = new RPCHandler(appRouter);

export async function handleAppRouterRequest(request: Request, context: Context) {
  try {
    const rpcResult = await rpcHandler.handle(request, {
      prefix: "/rpc",
      context,
    });

    if (rpcResult.matched) {
      return rpcResult.response;
    }

    const apiResult = await apiHandler.handle(request, {
      prefix: "/api-reference",
      context,
    });

    if (apiResult.matched) {
      return apiResult.response;
    }

    return null;
  } catch (error) {
    console.error(error);
    throw error;
  }
}
