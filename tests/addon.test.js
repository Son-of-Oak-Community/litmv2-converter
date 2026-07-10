import { describe, expect, it } from "vitest";
import { convertAddon } from "../scripts/core/converters/addon.js";

const source = {
	_id: "ad1ad1ad1ad1ad1a",
	name: "Adapted",
	type: "challenge-addon",
	folder: "fldrfldrfldrfldr",
	system: {
		description: "Choose two tags such as [gills], [wings].\n\nChoose an attitude such as [/s territorial-2].",
		ratingIncrease: 1,
		roles: ["Pursuer", "Watcher"],
		floatingTagsAndStatuses: [
			{ name: "gills", value: 0, isStatus: false, burned: false, markings: [false, false, false, false, false, false] },
			{ name: "territorial", value: 2, isStatus: true, burned: false, markings: [false, true, false, false, false, false] },
		],
		limits: [{ name: "ESCAPE", value: "3", consequence: "It gets away" }],
		secrets: [{ name: "WEAK SPOT", description: "The [/t seam] splits." }],
		specialFeatures: [{ name: "Slippery", description: "Hard to grapple ([/s slowed-2])." }],
		threatsAndConsequences: [{ name: "AMBUSH", description: "Strike from hiding", list: ["Pounce ([/s surprised-2])"] }],
	},
};

// Core Book challenge-addons store the threat SENTENCE in `name` with an empty
// `description` (unlike NPCs/HoR addons, which split verb/name from sentence).
// The converter must detect this shape, recover the short verb from the baked
// rulebook table, and promote the sentence to `threat`.
const mountedSource = {
	_id: "mounted000000000",
	name: "Mounted",
	type: "challenge-addon",
	folder: null,
	system: {
		ratingIncrease: 1,
		threatsAndConsequences: [
			{ name: "Ride swiftly into the fray", description: "", list: ["Charge at a foe (gain [/s charging-3])"] },
			{ name: "Rear their mount in pursuit", description: "", list: ["Ride after a fleeing foe ([/b Blocked])"] },
		],
	},
};

describe("convertAddon threat-name recovery (Core Book name-only shape)", () => {
	it("recovers the short verb from the rulebook table and promotes the sentence to threat", () => {
		const out = convertAddon(mountedSource);
		expect(out.system.threats).toEqual([
			{ name: "Storm", threat: "Ride swiftly into the fray", consequences: ["Charge at a foe (gain [charging-3])"], isConsequenceOnly: false },
			{ name: "Pursue", threat: "Rear their mount in pursuit", consequences: ["Ride after a fleeing foe (**Blocked**)"], isConsequenceOnly: false },
		]);
	});

	it("falls back to a blank name when the entry is absent from the table", () => {
		const src = {
			_id: "unknownaddon0000",
			name: "Unknown Addon",
			type: "challenge-addon",
			folder: null,
			system: { threatsAndConsequences: [{ name: "Do something inexplicable", description: "", list: ["A consequence"] }] },
		};
		const out = convertAddon(src);
		expect(out.system.threats).toEqual([
			{ name: "", threat: "Do something inexplicable", consequences: ["A consequence"], isConsequenceOnly: false },
		]);
	});
});

describe("convertAddon", () => {
	it("converts to a litmv2 addon", () => {
		const out = convertAddon(source);
		expect(out).toEqual({
			_id: "ad1ad1ad1ad1ad1a",
			name: "Adapted",
			type: "addon",
			img: "systems/litmv2/assets/media/icons/rating.svg",
			folder: "fldrfldrfldrfldr",
			system: {
				ratingBonus: 1,
				categories: ["Pursuer", "Watcher"],
				description:
					'<p>Choose two tags such as [gills], [wings].</p><p>Choose an attitude such as [territorial-2].</p><section class="secret" id="secret-ad1ad1ad1ad1ad1a0"><h4>Weak Spot</h4><p>The [seam] splits.</p></section>',
				specialFeatures: "<h4>Slippery</h4><p>Hard to grapple ([slowed-2]).</p>",
				tags: "[gills], [territorial-2]",
				limits: [{ label: "Escape", outcome: "It gets away", max: 3, value: 0 }],
				might: [],
				threats: [
					{ name: "Ambush", threat: "Strike from hiding", consequences: ["Pounce ([surprised-2])"], isConsequenceOnly: false },
				],
			},
		});
	});
});
