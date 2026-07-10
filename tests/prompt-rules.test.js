import { describe, expect, it } from "vitest";
import { pendingSources } from "../scripts/prompt-rules.js";

const cp = { id: "legend-in-the-mist-character-pack", label: "Character Pack" };
const core = { id: "legend-in-the-mist-core-book", label: "Core Book" };

describe("pendingSources", () => {
	it("returns all installed sources when there is no manifest", () => {
		expect(pendingSources([cp], null)).toEqual([cp]);
	});

	it("returns nothing when the manifest covers every installed source", () => {
		const manifest = { version: 1, sources: [{ id: cp.id }] };
		expect(pendingSources([cp], manifest)).toEqual([]);
	});

	it("returns only sources missing from the manifest", () => {
		const manifest = { version: 1, sources: [{ id: cp.id }] };
		expect(pendingSources([cp, core], manifest)).toEqual([core]);
	});

	it("handles an empty install list", () => {
		expect(pendingSources([], { version: 1, sources: [{ id: cp.id }] })).toEqual([]);
	});
});
