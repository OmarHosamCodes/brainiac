# OpenRouter Agent Implementation Guide (Option 1)

A comprehensive guide for implementing a dedicated agent package with OpenRouter integration for the Brainiac monorepo.

## Overview

This guide implements **Option 1: Backend Agent Service** - a dedicated, reusable agent package that integrates with your oRPC API layer. This is the most scalable and maintainable approach for your Bun + Hono + oRPC + TypeScript monorepo.

## Why Option 1?

✅ **Type-safe**: Full TypeScript support with Zod validation  
✅ **Protected**: Uses your existing authentication middleware  
✅ **Scalable**: Agentic loop handles tool calling automatically  
✅ **Testable**: Easy to mock and test tools  
✅ **Real-time**: Can add streaming support easily  
✅ **Monorepo-friendly**: Leverages your bun workspaces  
✅ **Reusable**: Share across server and potentially frontend  
✅ **Maintainable**: Separate concern from main server logic

## Project Structure

```
brainiac/packages/agent/
├── src/
│   ├── index.ts           # Main exports
│   ├── client.ts          # OpenRouter client setup
│   ├── tools.ts           # Tool definitions (function calling)
│   ├── executor.ts        # Tool execution logic
│   ├── stream.ts          # Streaming utilities (optional)
│   └── types.ts           # Shared types
├── package.json
└── tsconfig.json
```

## Step-by-Step Implementation

### Step 1: Create Agent Package Directory

```bash
mkdir -p brainiac/packages/agent/src
```

### Step 2: Create `brainiac/packages/agent/package.json`

```json
{
  "name": "@brainiac/agent",
  "type": "module",
  "exports": {
    ".": {
      "default": "./src/index.ts"
    },
    "./*": {
      "default": "./src/*.ts"
    }
  },
  "scripts": {
    "check-types": "tsc -b"
  },
  "dependencies": {
    "@brainiac/env": "workspace:*",
    "openai": "^4.72.0",
    "zod": "catalog:"
  },
  "devDependencies": {
    "@brainiac/config": "workspace:*",
    "typescript": "catalog:"
  }
}
```

### Step 3: Create `brainiac/packages/agent/tsconfig.json`

```json
{
  "extends": "@brainiac/config/tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"],
  "references": [
    { "path": "../env" }
  ]
}
```

### Step 4: Create `brainiac/packages/agent/src/types.ts`

```typescript
import type { Message as OpenAIMessage } from "openai/resources/chat/completions.mjs";

export type MessageRole = "user" | "assistant" | "system";

export interface Message {
  role: MessageRole;
  content: string;
}

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required: string[];
    };
  };
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface AgentResponse {
  response: string;
  messagesCount: number;
  toolsCalled?: string[];
}

export interface AgentConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export type AgentError = {
  code: string;
  message: string;
};
```

### Step 5: Create `brainiac/packages/agent/src/client.ts`

```typescript
import { env } from "@brainiac/env/server";
import OpenAI from "openai";

export function createOpenRouterClient() {
  const apiKey = env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY environment variable is not set"
    );
  }

  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    defaultHeaders: {
      "HTTP-Referer": env.APP_URL || "http://localhost:3000",
      "X-Title": "Brainiac",
    },
  });
}

export type OpenRouterClient = ReturnType<typeof createOpenRouterClient>;
```

### Step 6: Create `brainiac/packages/agent/src/tools.ts`

```typescript
import { z } from "zod";
import type { ToolDefinition } from "./types";

// Define your tools with Zod validation
export const toolSchemas = {
  search_knowledge_base: z.object({
    query: z.string().describe("Search query for the knowledge base"),
    limit: z.number().optional().describe("Maximum results to return"),
  }),

  calculate: z.object({
    expression: z.string().describe("Mathematical expression to evaluate"),
  }),

  get_current_time: z.object({}),

  // Add more tools as needed
} as const;

// Convert Zod schemas to OpenAI tool format
export function buildTools(): ToolDefinition[] {
  return [
    {
      type: "function",
      function: {
        name: "search_knowledge_base",
        description: "Search the knowledge base for relevant information",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query for the knowledge base",
            },
            limit: {
              type: "number",
              description: "Maximum results to return",
            },
          },
          required: ["query"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "calculate",
        description: "Perform mathematical calculations",
        parameters: {
          type: "object",
          properties: {
            expression: {
              type: "string",
              description: "Mathematical expression to evaluate",
            },
          },
          required: ["expression"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "get_current_time",
        description: "Get the current date and time",
        parameters: {
          type: "object",
          properties: {},
          required: [],
        },
      },
    },
  ];
}

// Validate tool inputs
export function validateToolInput(
  toolName: string,
  toolInput: Record<string, unknown>
): boolean {
  const schema = toolSchemas[toolName as keyof typeof toolSchemas];
  if (!schema) {
    return false;
  }

  try {
    schema.parse(toolInput);
    return true;
  } catch {
    return false;
  }
}
```

### Step 7: Create `brainiac/packages/agent/src/executor.ts`

```typescript
import type { ToolCall } from "./types";

// Tool execution functions
const toolExecutors = {
  async search_knowledge_base(input: { query: string; limit?: number }) {
    const { query, limit = 5 } = input;
    
    // TODO: Implement actual knowledge base search
    // This could query your database, vector DB, or external API
    return `Search results for "${query}" (limit: ${limit}): [Mock results]`;
  },

  async calculate(input: { expression: string }) {
    const { expression } = input;
    
    try {
      // Using Function constructor for safe evaluation
      // In production, use a library like expr-eval for security
      const result = Function('"use strict"; return (' + expression + ")")();
      return `Result: ${result}`;
    } catch (error) {
      return `Error calculating expression: ${(error as Error).message}`;
    }
  },

  async get_current_time() {
    return `Current time: ${new Date().toISOString()}`;
  },
} as const;

export async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<string> {
  const executor = toolExecutors[toolName as keyof typeof toolExecutors];

  if (!executor) {
    throw new Error(`Unknown tool: ${toolName}`);
  }

  try {
    // Type-safe execution with proper input
    const result = await executor(toolInput as any);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Error executing tool ${toolName}: ${errorMessage}`);
  }
}
```

### Step 8: Create `brainiac/packages/agent/src/index.ts`

```typescript
import { createOpenRouterClient } from "./client";
import { executeTool } from "./executor";
import { buildTools, validateToolInput } from "./tools";
import type { AgentConfig, AgentResponse, Message } from "./types";

export async function runAgent(
  messages: Message[],
  config: AgentConfig = { model: "openai/gpt-3.5-turbo" }
): Promise<AgentResponse> {
  const client = createOpenRouterClient();
  const tools = buildTools();
  let currentMessages: Message[] = [...messages];
  const toolsCalled: string[] = [];

  let response = await client.chat.completions.create({
    model: config.model,
    messages: currentMessages,
    tools: tools as any,
    tool_choice: "auto",
    temperature: config.temperature ?? 0.7,
    max_tokens: config.maxTokens,
  });

  // Agentic loop - handle tool calls until we get a final response
  let iterations = 0;
  const maxIterations = 10; // Prevent infinite loops

  while (
    response.choices[0]?.finish_reason === "tool_calls" &&
    iterations < maxIterations
  ) {
    iterations++;
    const toolCalls = response.choices[0].message.tool_calls || [];

    // Add assistant's response to messages
    if (response.choices[0].message.content) {
      currentMessages.push({
        role: "assistant",
        content: response.choices[0].message.content,
      });
    }

    // Execute each tool call
    for (const toolCall of toolCalls) {
      toolsCalled.push(toolCall.function.name);

      const toolName = toolCall.function.name;
      const toolInput = JSON.parse(toolCall.function.arguments);

      // Validate tool input
      if (!validateToolInput(toolName, toolInput)) {
        console.warn(`Invalid input for tool ${toolName}:`, toolInput);
      }

      // Execute the tool
      let toolResult: string;
      try {
        toolResult = await executeTool(toolName, toolInput);
      } catch (error) {
        toolResult = `Error: ${(error as Error).message}`;
      }

      // Add tool result to messages
      currentMessages.push({
        role: "user",
        content: `Tool "${toolName}" returned: ${toolResult}`,
      });
    }

    // Get next response from the model
    response = await client.chat.completions.create({
      model: config.model,
      messages: currentMessages,
      tools: tools as any,
      tool_choice: "auto",
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens,
    });
  }

  const finalResponse =
    response.choices[0]?.message.content || "No response generated";

  return {
    response: finalResponse,
    messagesCount: currentMessages.length,
    toolsCalled: toolsCalled.length > 0 ? toolsCalled : undefined,
  };
}

// Re-export types and utilities
export * from "./types";
export { buildTools, validateToolInput } from "./tools";
export { executeTool } from "./executor";
export { createOpenRouterClient } from "./client";
```

### Step 9: Update Server Dependencies

Add the agent package to `brainiac/apps/server/package.json`:

```json
{
  "dependencies": {
    "@brainiac/agent": "workspace:*",
    "@brainiac/api": "workspace:*",
    "@brainiac/auth": "workspace:*",
    "@brainiac/db": "workspace:*",
    "@brainiac/env": "workspace:*"
  }
}
```

And add it to `brainiac/packages/api/package.json`:

```json
{
  "dependencies": {
    "@brainiac/agent": "workspace:*",
    "@brainiac/auth": "workspace:*",
    "@brainiac/db": "workspace:*",
    "@brainiac/env": "workspace:*",
    "@brainiac/workspace": "workspace:*"
  }
}
```

### Step 10: Create oRPC Endpoints

Create `brainiac/packages/api/src/routers/agent.ts`:

```typescript
import { protectedProcedure } from "@brainiac/api/procedures";
import { runAgent } from "@brainiac/agent";
import { z } from "zod";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

export const agentRouter = {
  chat: protectedProcedure
    .inputs(
      z.object({
        messages: z.array(MessageSchema),
        model: z.string().optional().default("openai/gpt-3.5-turbo"),
        temperature: z.number().optional().min(0).max(2),
        maxTokens: z.number().optional(),
      })
    )
    .outputs(
      z.object({
        response: z.string(),
        messagesCount: z.number(),
        toolsCalled: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ inputs }) => {
      const result = await runAgent(inputs.messages, {
        model: inputs.model,
        temperature: inputs.temperature,
        maxTokens: inputs.maxTokens,
      });

      return result;
    }),

  // Optional: Streaming endpoint for real-time responses
  chatStream: protectedProcedure
    .inputs(
      z.object({
        messages: z.array(MessageSchema),
        model: z.string().optional().default("openai/gpt-3.5-turbo"),
      })
    )
    .outputs(z.object({ streamToken: z.string() }))
    .mutation(async ({ inputs }) => {
      // TODO: Implement streaming response
      return { streamToken: "not-implemented" };
    }),
};
```

Update `brainiac/packages/api/src/routers/index.ts` to include the agent router:

```typescript
import { agentRouter } from "./agent";

export const router = {
  agent: agentRouter,
  // ... other routers
};
```

### Step 11: Update Environment Variables

Add to `apps/server/.env`:

```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
APP_URL=http://localhost:3000
```

Update `brainiac/packages/env/src/server.ts` to include:

```typescript
import { z } from "zod";

const serverSchema = z.object({
  OPENROUTER_API_KEY: z.string(),
  APP_URL: z.string().url().optional().default("http://localhost:3000"),
  // ... other env vars
});

export const env = serverSchema.parse(process.env);
```

### Step 12: Install Dependencies

```bash
cd brainiac
bun install
```

### Step 13: Frontend Integration (Optional)

Create a composable in `brainiac/apps/web/app/composables/useAgent.ts`:

```typescript
import type { Message } from "@brainiac/agent";
import { useClient } from "./useClient"; // Your oRPC client hook
import { ref } from "vue";

export function useAgent() {
  const client = useClient();
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function chat(messages: Message[]) {
    loading.value = true;
    error.value = null;

    try {
      const result = await client.agent.chat.mutate({
        messages,
        model: "openai/gpt-3.5-turbo",
      });

      return result;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Unknown error";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return { chat, loading, error };
}
```

## Configuration & Customization

### Adding Custom Tools

To add new tools:

1. **Define the tool schema** in `src/tools.ts`:
```typescript
export const toolSchemas = {
  my_new_tool: z.object({
    param1: z.string(),
    param2: z.number(),
  }),
};
```

2. **Add to buildTools()** in `src/tools.ts`:
```typescript
{
  type: "function",
  function: {
    name: "my_new_tool",
    description: "Description of what this tool does",
    parameters: {
      type: "object",
      properties: {
        param1: { type: "string", description: "..." },
        param2: { type: "number", description: "..." },
      },
      required: ["param1"],
    },
  },
}
```

3. **Implement the executor** in `src/executor.ts`:
```typescript
async my_new_tool(input: { param1: string; param2: number }) {
  // Implementation
  return "Result";
}
```

### Using Different Models

OpenRouter supports many models. Update your agent calls:

```typescript
await runAgent(messages, {
  model: "anthropic/claude-3-sonnet",
  temperature: 0.7,
});
```

Popular models:
- `openai/gpt-4`
- `openai/gpt-3.5-turbo`
- `anthropic/claude-3-opus`
- `anthropic/claude-3-sonnet`
- `google/gemini-pro`
- `meta-llama/llama-2-70b-chat`

### Streaming Responses

For real-time streaming, use OpenAI's streaming support:

```typescript
const stream = await client.chat.completions.create({
  model: "openai/gpt-3.5-turbo",
  messages,
  tools: buildTools(),
  stream: true,
});

for await (const chunk of stream) {
  console.log(chunk.choices[0]?.delta);
}
```

## Testing

Create `brainiac/packages/agent/__tests__/agent.test.ts`:

```typescript
import { describe, it, expect } from "bun:test";
import { executeTool, validateToolInput } from "../src";

describe("Agent", () => {
  it("should validate tool inputs", () => {
    const valid = validateToolInput("search_knowledge_base", {
      query: "test",
    });
    expect(valid).toBe(true);

    const invalid = validateToolInput("search_knowledge_base", {
      // Missing required query
    });
    expect(invalid).toBe(false);
  });

  it("should execute tools", async () => {
    const result = await executeTool("get_current_time", {});
    expect(result).toContain("Current time");
  });
});
```

Run tests:
```bash
bun test
```

## Best Practices

1. **Error Handling**: Always wrap tool execution in try-catch blocks
2. **Tool Validation**: Validate inputs before execution
3. **Rate Limiting**: Implement rate limiting for API calls
4. **Logging**: Log all agent interactions for debugging
5. **Security**: Never expose sensitive data in tool responses
6. **Context Limits**: Monitor token usage to avoid exceeding limits
7. **Fallbacks**: Have fallback responses when tools fail
8. **Timeouts**: Set timeouts for tool execution

## Troubleshooting

### "OPENROUTER_API_KEY is not set"
- Ensure `OPENROUTER_API_KEY` is set in your `.env` file
- Restart the dev server after adding env vars

### Tool calls not happening
- Check that tools are properly formatted in `buildTools()`
- Verify the model supports function calling
- Check the finish_reason in the response

### Infinite loops
- The agent has a max iterations limit (default: 10)
- Check for tools that always return error states

## Resources

- [OpenRouter API Docs](https://openrouter.ai/docs)
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)
- [Bun Documentation](https://bun.sh)
- [Hono Documentation](https://hono.dev)
- [oRPC Documentation](https://orpc.io)
- [Zod Documentation](https://zod.dev)
