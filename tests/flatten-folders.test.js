import { describe, expect, it } from "vitest";
import { flattenPackFolders } from "../scripts/core/converters/folders.js";

const f = (_id, name, folder = null) => ({ _id, name, folder });
const d = (_id, folder = null) => ({ _id, folder });

describe("flattenPackFolders", () => {
	it("character pack: drops the module wrapper, heroes land at pack root", () => {
		const group = { folders: [f("F1", "Character Pack")], docs: [d("h1", "F1"), d("h2", "F1")] };
		flattenPackFolders(group, ["Character Pack"]);
		expect(group.folders).toEqual([]);
		expect(group.docs.map((x) => x.folder)).toEqual([null, null]);
	});

	it("core-book actors: wrapper removed, multiple roots remain untouched", () => {
		const group = {
			folders: [
				f("F1", "Core Book"),
				f("F2", "Challenges", "F1"),
				f("F3", "Blighted Badlands", "F2"),
				f("F4", "Journeys", "F1"),
				f("F5", "Story Themes"),
			],
			docs: [d("a1", "F3"), d("a2", "F4"), d("a3", "F5")],
		};
		flattenPackFolders(group, ["Core Book"]);
		expect(group.folders.map((x) => [x._id, x.folder])).toEqual([
			["F2", null], ["F3", "F2"], ["F4", null], ["F5", null],
		]);
		expect(group.docs.map((x) => x.folder)).toEqual(["F3", "F4", "F5"]);
	});

	it("hor items: wrapper chain then lone type wrapper both collapse", () => {
		const group = {
			folders: [
				f("F1", "Hearts Of Ravendale"),
				f("F2", "Add-ons", "F1"),
				f("F3", "General Add-ons", "F2"),
				f("F4", "The Craggen Highlands", "F2"),
			],
			docs: [d("i1", "F3"), d("i2", "F4")],
		};
		flattenPackFolders(group, ["Hearts of Ravendale"]); // case-insensitive vs "Hearts Of Ravendale"
		expect(group.folders.map((x) => [x._id, x.folder])).toEqual([["F3", null], ["F4", null]]);
	});

	it("themekits: rule 2 stops once multiple category roots are exposed", () => {
		const group = {
			folders: [
				f("F1", "Core Book"),
				f("F2", "Themekits", "F1"),
				f("F3", "Origin", "F2"),
				f("F4", "Adventure", "F2"),
				f("F5", "Circumstance", "F3"),
			],
			docs: [d("k1", "F5")],
		};
		flattenPackFolders(group, ["Core Book"]);
		expect(group.folders.map((x) => [x._id, x.folder])).toEqual([
			["F3", null], ["F4", null], ["F5", "F3"],
		]);
	});

	it("rule 2 keeps a lone root folder that holds docs directly", () => {
		const group = { folders: [f("F1", "Themekits")], docs: [d("k1", "F1")] };
		flattenPackFolders(group, ["Core Book"]);
		expect(group.folders).toEqual([f("F1", "Themekits")]);
		expect(group.docs[0].folder).toBe("F1");
	});

	it("no-ops on already-flat packs and docs without a folder key", () => {
		const group = { folders: [], docs: [{ _id: "j1" }] };
		flattenPackFolders(group, ["Core Book"]);
		expect(group.docs[0].folder ?? null).toBeNull();
	});
});
