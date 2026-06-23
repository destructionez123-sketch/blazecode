import { describe, it, expect } from "vitest";
import { TodoStore, createTodoTool, type TodoItem } from "./todo.js";

describe("todo tool", () => {
  it("applies todos to the store and renders them", async () => {
    const store = new TodoStore();
    const tool = createTodoTool(store);
    const todos: TodoItem[] = [
      { content: "first task", status: "completed" },
      { content: "second task", status: "in_progress" },
      { content: "third task", status: "pending" },
    ];

    const out = await tool.execute({ todos }, { cwd: process.cwd() });

    expect(store.items).toEqual(todos);
    expect(out).toContain("first task");
    expect(out).toContain("second task");
    expect(out).toContain("third task");
    expect(out).toContain("completed");
    expect(out).toContain("in_progress");
    expect(out).toContain("pending");
  });

  it("overwrites previous items on subsequent calls", async () => {
    const store = new TodoStore();
    const tool = createTodoTool(store);
    await tool.execute({ todos: [{ content: "old", status: "pending" }] }, { cwd: process.cwd() });
    await tool.execute({ todos: [{ content: "new", status: "completed" }] }, { cwd: process.cwd() });
    expect(store.items).toEqual([{ content: "new", status: "completed" }]);
  });
});
