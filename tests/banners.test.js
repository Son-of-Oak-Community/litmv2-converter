import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { BANNER_SOURCES } from "../scripts/handoff-io.js";
import { PACKS } from "../scripts/registry.js";

describe("pack banners", () => {
	it("maps every destination pack to an official banner slice", () => {
		expect(Object.keys(BANNER_SOURCES).sort()).toEqual(PACKS.map((p) => p.name).sort());
		for (const { module, file } of Object.values(BANNER_SOURCES)) {
			expect(module).toMatch(/^legend-in-the-mist-/);
			expect(file).toMatch(/^banner_(0[1-9]|10)\.webp$/);
		}
	});

	it("assigns sequential slices in each folder's alphabetical display order (the slices stitch into one continuous image)", async () => {
		const manifest = JSON.parse(await readFile(new URL("../module.json", import.meta.url), "utf8"));
		const labelOf = Object.fromEntries(manifest.packs.map((p) => [p.name, p.label]));
		for (const folder of manifest.packFolders[0].folders) {
			const displayOrder = [...folder.packs].sort((a, b) => labelOf[a].localeCompare(labelOf[b]));
			displayOrder.forEach((pack, i) => {
				expect(BANNER_SOURCES[pack].file).toBe(`banner_${String(i + 1).padStart(2, "0")}.webp`);
			});
		}
	});

	it("sources each folder's slices from ONE module (slices from different paintings don't stitch)", async () => {
		const manifest = JSON.parse(await readFile(new URL("../module.json", import.meta.url), "utf8"));
		for (const folder of manifest.packFolders[0].folders) {
			const modules = new Set(folder.packs.map((p) => BANNER_SOURCES[p].module));
			expect(modules.size).toBe(1);
		}
	});
});
