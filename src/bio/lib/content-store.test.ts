import { describe, expect, it } from "vitest";
import { createContentDriver, newId } from "./content-store";
import { createZip, textToBytes } from "./zip";

function blobOf(value: string, type = "image/jpeg") {
  return new Blob([value], { type });
}

function readAsText(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

describe("createZip", () => {
  it("writes a store-only zip with the local headers and central directory", async () => {
    const zip = createZip(
      [
        { name: "content.json", data: textToBytes('{"photos":[]}') },
        { name: "photos/a.jpg", data: textToBytes("JPEGDATA") },
      ],
      new Date(2026, 0, 14, 10, 30, 0),
    );

    const bytes = new Uint8Array(await zip.arrayBuffer());
    const view = new DataView(bytes.buffer);

    // Firma local + entrada central + EOCD
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    expect(Array.from(bytes.subarray(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
    expect(Array.from(bytes.subarray(bytes.length - 22, bytes.length - 18))).toEqual([
      0x50, 0x4b, 0x05, 0x06,
    ]);

    const entries = view.getUint16(bytes.length - 12, true);
    expect(entries).toBe(2);

    const names = new TextDecoder().decode(bytes);
    expect(names).toContain("content.json");
    expect(names).toContain("photos/a.jpg");
    expect(names).toContain("JPEGDATA");
  });
});

describe("content driver", () => {
  it("falls back to memory when IndexedDB is missing and still round-trips", async () => {
    const driver = await createContentDriver();
    expect(driver.kind).toBe("memory");

    const id = newId("photo");
    await driver.savePhoto({
      id,
      name: "costa.jpg",
      filename: "costa.jpg",
      width: 1200,
      height: 800,
      bytes: 10,
      full: blobOf("full"),
      thumb: blobOf("thumb"),
      location: "Mar del Plata",
      alt: "Costa",
      createdAt: 1,
    });
    await driver.savePost({
      id: "post-1",
      title: "Un post",
      summary: "resumen",
      date: "2026-02-01",
      body: "# hola",
      tags: ["uno"],
      createdAt: 1,
      updatedAt: 1,
    });

    const photos = await driver.photos();
    expect(photos).toHaveLength(1);
    expect(photos[0].location).toBe("Mar del Plata");
    expect(await readAsText(photos[0].full)).toBe("full");

    const posts = await driver.posts();
    expect(posts).toHaveLength(1);
    expect(posts[0].tags).toEqual(["uno"]);

    await driver.removePhoto(id);
    expect(await driver.photos()).toHaveLength(0);

    await driver.clear();
    expect(await driver.posts()).toHaveLength(0);
  });

  it("orders photos by upload order and posts by date, newest first", async () => {
    const driver = await createContentDriver();
    await driver.clear();

    const photo = (createdAt: number) => ({
      id: `p${createdAt}`,
      name: "a.jpg",
      filename: "a.jpg",
      width: 1,
      height: 1,
      bytes: 1,
      full: blobOf("a"),
      thumb: blobOf("a"),
      location: "",
      alt: "a",
      createdAt,
    });
    await driver.savePhoto(photo(2));
    await driver.savePhoto(photo(1));

    const post = (id: string, date: string) => ({
      id,
      title: id,
      summary: "",
      date,
      body: "",
      tags: [],
      createdAt: 1,
      updatedAt: 1,
    });
    await driver.savePost(post("viejo", "2024-01-01"));
    await driver.savePost(post("nuevo", "2026-01-01"));

    expect((await driver.photos()).map((p) => p.createdAt)).toEqual([1, 2]);
    expect((await driver.posts()).map((p) => p.id)).toEqual(["nuevo", "viejo"]);
    await driver.clear();
  });
});
