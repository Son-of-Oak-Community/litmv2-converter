import { afterEach, describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { detectInstalledSources, PACKS, ROUTES, SOURCE_MODULES } from "../scripts/registry.js";

afterEach(() => { delete globalThis.game; });

describe("registry", () => {
	it("includes all three official source modules with their adventure pack ids", () => {
		expect(SOURCE_MODULES.map((m) => m.id)).toEqual([
			"legend-in-the-mist-character-pack",
			"legend-in-the-mist-core-book",
			"legend-in-the-mist-hearts-of-ravendale",
		]);
		expect(SOURCE_MODULES.find((m) => m.id === "legend-in-the-mist-character-pack").packId)
			.toBe("legend-in-the-mist-character-pack.character-pack-adventure");
		expect(SOURCE_MODULES.find((m) => m.id === "legend-in-the-mist-core-book").packId)
			.toBe("legend-in-the-mist-core-book.litm-core-adventure");
		expect(SOURCE_MODULES.find((m) => m.id === "legend-in-the-mist-hearts-of-ravendale").packId)
			.toBe("legend-in-the-mist-hearts-of-ravendale.hor-dale-adventure");
	});

	it("detectInstalledSources filters by active module", () => {
		globalThis.game = { modules: { get: vi.fn(id => id === "legend-in-the-mist-character-pack" ? { active: true } : null) } };
		expect(detectInstalledSources().map(m => m.id)).toEqual(["legend-in-the-mist-character-pack"]);
		globalThis.game = { modules: { get: vi.fn(() => null) } };
		expect(detectInstalledSources()).toEqual([]);
	});

	it("declares the eleven-pack layout", () => {
		expect(PACKS.map((p) => p.name)).toEqual([
			"litm-character-pack",
			"litm-core-book-actors",
			"litm-core-book-journals",
			"litm-core-book-themebooks",
			"litm-core-book-themekits",
			"litm-core-book-items",
			"litm-core-book-tropes",
			"litm-hor-the-dales",
			"litm-hor-themekits",
			"litm-hor-items",
			"litm-hor-tropes",
		]);
		expect(PACKS.find((p) => p.name === "litm-hor-the-dales").docClass).toBe("Adventure");
	});

	it("routes every source module, and every route targets a declared pack", () => {
		expect(Object.keys(ROUTES).sort()).toEqual(SOURCE_MODULES.map((m) => m.id).sort());
		const names = new Set(PACKS.map((p) => p.name));
		for (const route of Object.values(ROUTES)) {
			for (const pack of Object.values(route.packs ?? {})) expect(names.has(pack)).toBe(true);
			for (const pack of Object.values(route.itemPacks ?? {})) expect(names.has(pack)).toBe(true);
			if (route.adventure) expect(names.has(route.adventure)).toBe(true);
		}
		expect(ROUTES["legend-in-the-mist-hearts-of-ravendale"].adventure).toBe("litm-hor-the-dales");
		expect(ROUTES["legend-in-the-mist-core-book"].itemPacks.vignette).toBe("litm-core-book-items");
		expect(ROUTES["legend-in-the-mist-hearts-of-ravendale"].itemPacks.vignette).toBeUndefined();
	});

	it("module.json declares exactly the PACKS set, litmv2-tagged", async () => {
		const manifest = JSON.parse(await readFile(new URL("../module.json", import.meta.url), "utf8"));
		expect(manifest.packs.map((p) => [p.name, p.type]).sort()).toEqual(
			PACKS.map((p) => [p.name, p.docClass]).sort(),
		);
		for (const p of manifest.packs) expect(p.system).toBe("litmv2");
	});
});
