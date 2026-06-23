import { z } from "zod";
import type { Tool } from "../tool.js";

export interface TodoItem {
  content: string;
  status: "pending" | "in_progress" | "completed";
}

export class TodoStore {
  items: TodoItem[] = [];

  set(items: TodoItem[]): void {
    this.items = items;
  }
}

const schema = z.object({
  todos: z.array(
    z.object({
      content: z.string(),
      status: z.enum(["pending", "in_progress", "completed"]),
    }),
  ),
});

function render(items: TodoItem[]): string {
  if (items.length === 0) return "(no todos)";
  return items.map((t) => `[${t.status}] ${t.content}`).join("\n");
}

export function createTodoTool(store: TodoStore): Tool<z.infer<typeof schema>> {
  return {
    name: "todowrite",
    description: "Set the current todo list. Replaces the existing list.",
    schema,
    permission: "none",
    async execute({ todos }) {
      store.set(todos);
      return render(store.items);
    },
  };
}
