import { describe, expect, it } from "vitest";
import { getContentDriver } from "@/lib/content-store";

describe("debug", () => {
  it("keeps posts in the shared memory driver", async () => {
    const a = await getContentDriver();
    await a.clear();
    await a.savePost({
      id: "p",
      title: "t",
      summary: "",
      date: "2026-01-01",
      body: "b",
      tags: [],
      createdAt: 1,
      updatedAt: 1,
    });
    const b = await getContentDriver();
    expect(a).toBe(b);
    expect(await b.posts()).toHaveLength(1);
  });
});
