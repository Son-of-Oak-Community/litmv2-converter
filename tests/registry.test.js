import { afterEach, describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { detectInstalledSources, PACKS, ROUTES, SOURCE_MODULES } from "../scripts/registry.js";

afterEach(() => { delete globalThis.game; });

describe("registry", () => {
	it("includes all three official source modules", () => {
		expect(SOURCE_MODULES.map((m) => m.id)).toEqual([
			"legend-in-the-mist-character-pack",
			"legend-in-the-mist-core-book",
			"legend-in-the-mist-hearts-of-ravendale",
		]);
		// Quintessences have no litmv2 destination (maintainer decision 2026-07-21) —
		// their pack is skipped at read time rather than tripping the parity gate.
		expect(SOURCE_MODULES.find((m) => m.id === "legend-in-the-mist-core-book").skipPacks)
			.toEqual(["litm-core-quintessences"]);
	});

	it("detectInstalledSources filters by active module", () => {
		globalThis.game = { modules: { get: vi.fn(id => id === "legend-in-the-mist-character-pack" ? { active: true } : null) } };
		expect(detectInstalledSources().map(m => m.id)).toEqual(["legend-in-the-mist-character-pack"]);
		globalThis.game = { modules: { get: vi.fn(() => null) } };
		expect(detectInstalledSources()).toEqual([]);
	});

	it("declares the fifteen-pack layout", () => {
		expect(PACKS.map((p) => p.name)).toEqual([
			"litm-character-pack",
			"litm-core-book-actors",
			"litm-core-book-journals",
			"litm-core-book-themebooks",
			"litm-core-book-themekits",
			"litm-core-book-items",
			"litm-core-book-tropes",
			"litm-core-book-tables",
			"litm-core-book-rotes",
			"litm-hor-actors",
			"litm-hor-journals",
			"litm-hor-scenes",
			"litm-hor-themekits",
			"litm-hor-items",
			"litm-hor-tropes",
		]);
		expect(PACKS.find((p) => p.name === "litm-hor-scenes").docClass).toBe("Scene");
		expect(PACKS.find((p) => p.name === "litm-core-book-tables").docClass).toBe("RollTable");
	});

	it("routes every source module, and every route targets a declared pack", () => {
		expect(Object.keys(ROUTES).sort()).toEqual(SOURCE_MODULES.map((m) => m.id).sort());
		const names = new Set(PACKS.map((p) => p.name));
		for (const route of Object.values(ROUTES)) {
			for (const pack of Object.values(route.packs ?? {})) expect(names.has(pack)).toBe(true);
			for (const pack of Object.values(route.itemPacks ?? {})) expect(names.has(pack)).toBe(true);
		}
		expect(ROUTES["legend-in-the-mist-hearts-of-ravendale"].packs).toEqual({
			Actor: "litm-hor-actors",
			JournalEntry: "litm-hor-journals",
			Scene: "litm-hor-scenes",
		});
		expect(ROUTES["legend-in-the-mist-core-book"].packs.RollTable).toBe("litm-core-book-tables");
		expect(ROUTES["legend-in-the-mist-core-book"].itemPacks.action).toBe("litm-core-book-rotes");
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

	it("module.json groups every pack under the Legend in the Mist folder tree with a banner", async () => {
		const manifest = JSON.parse(await readFile(new URL("../module.json", import.meta.url), "utf8"));
		const root = manifest.packFolders[0];
		expect(root.name).toBe("Legend in the Mist");
		const grouped = root.folders.flatMap((f) => f.packs);
		expect(grouped.sort()).toEqual(PACKS.map((p) => p.name).sort());
		for (const p of manifest.packs)
			expect(p.banner).toBe(`modules/litmv2-converter/handoff/banners/${p.name}.webp`);
	});
});
