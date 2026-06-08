import * as ToastPrimitive from "@radix-ui/react-toast";
import { X } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

type ToastInput = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

type ToastRecord = ToastInput & {
  id: string;
};

type ToastListener = (toasts: ToastRecord[]) => void;

let memoryToasts: ToastRecord[] = [];
const listeners = new Set<ToastListener>();

function emit() {
  for (const listener of listeners) {
    listener(memoryToasts);
  }
}

export function toast(input: ToastInput) {
  const item = { id: crypto.randomUUID(), ...input };
  memoryToasts = [item, ...memoryToasts].slice(0, 4);
  emit();
}

function dismissToast(id: string) {
  memoryToasts = memoryToasts.filter((item) => item.id !== id);
  emit();
}

function useToastStore() {
  const [items, setItems] = React.useState(memoryToasts);

  React.useEffect(() => {
    listeners.add(setItems);
    return () => {
      listeners.delete(setItems);
    };
  }, []);

  return items;
}

export function Toaster() {
  const items = useToastStore();

  return (
    <ToastPrimitive.Provider swipeDirection="right">
      {items.map((item) => (
        <ToastPrimitive.Root
          key={item.id}
          className={cn(
            "grid w-full max-w-sm grid-cols-[1fr_auto] items-start gap-3 rounded-2xl border bg-background p-4 text-foreground shadow-[0_4px_16px_oklch(0.18_0.005_285/0.08)]",
            item.variant === "destructive" && "border-destructive/40 bg-destructive/10 text-destructive",
          )}
          duration={5000}
          onOpenChange={(open) => {
            if (!open) {
              dismissToast(item.id);
            }
          }}
        >
          <div className="grid gap-1">
            {item.title ? <ToastPrimitive.Title className="text-sm font-bold">{item.title}</ToastPrimitive.Title> : null}
            {item.description ? (
              <ToastPrimitive.Description className="text-sm text-muted-foreground">
                {item.description}
              </ToastPrimitive.Description>
            ) : null}
          </div>
          <ToastPrimitive.Close className="rounded-full p-1 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring">
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </ToastPrimitive.Close>
        </ToastPrimitive.Root>
      ))}
      <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-[100] flex max-h-screen w-[calc(100%-2rem)] flex-col gap-2 sm:w-full sm:max-w-sm" />
    </ToastPrimitive.Provider>
  );
}
