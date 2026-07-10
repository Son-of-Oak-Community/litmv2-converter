import { describe, expect, it } from "vitest";
import { actorTagString } from "../scripts/core/tags.js";
import { buildActorTagEffects, statusTier, statusTiers } from "../scripts/core/effect-builders.js";

// litmv2's canonical rule (StatusTagData.tierOf, modules/active-effects/status-tag-data.js):
// the status tier is the highest marked box (1-based), 0 when nothing is marked.
const tierOf = (t) => t.lastIndexOf(true) + 1;

const st = (over) => ({ name: "x", isStatus: true, value: 0, burned: false, markings: [false, false, false, false, false, false], ...over });

const cases = [
	{ label: "single-box marking (corpus shape)", entry: st({ value: 2, markings: [false, true, false, false, false, false] }), tier: 2, tiers: [false, true, false, false, false, false] },
	{ label: "multi-box marking reads as highest box", entry: st({ markings: [true, true, true, false, false, false] }), tier: 3, tiers: [true, true, true, false, false, false] },
	{ label: "non-contiguous marking reads as highest box", entry: st({ markings: [true, false, true, false, false, false] }), tier: 3, tiers: [true, false, true, false, false, false] },
	{ label: "value fallback when markings empty", entry: st({ value: 4 }), tier: 4, tiers: [false, false, false, true, false, false] },
	{ label: "tierless (no markings, no value)", entry: st({}), tier: 0, tiers: [false, false, false, false, false, false] },
	{ label: "value out of range → tierless", entry: st({ value: 9 }), tier: 0, tiers: [false, false, false, false, false, false] },
	{ label: "markings win over value", entry: st({ value: 5, markings: [false, true, false, false, false, false] }), tier: 2, tiers: [false, true, false, false, false, false] },
	{ label: "short markings pad to 6", entry: st({ markings: [true] }), tier: 1, tiers: [true, false, false, false, false, false] },
];

describe("statusTiers / statusTier mirror litmv2's canonical tier rule", () => {
	for (const c of cases) {
		it(c.label, () => {
			expect(statusTiers(c.entry)).toEqual(c.tiers);
			expect(statusTier(c.entry)).toBe(c.tier);
			expect(statusTier(c.entry)).toBe(tierOf(c.tiers));
		});
	}
});

// The regression guard: the edit-mode tag STRING and the status_tag EFFECT are
// two representations of one input (both ship on the same actor). They must
// never disagree on tier — the failure class a naive "normalize to contiguous"
// change would introduce.
describe("tag string and effect array never disagree on tier", () => {
	for (const c of cases) {
		it(c.label, () => {
			const str = actorTagString([c.entry]);
			const effect = buildActorTagEffects([c.entry])[0];
			const labelTier = Number(str.match(/-(\d+)\]$/)?.[1] ?? 0);
			expect(labelTier).toBe(tierOf(effect.system.tiers));
		});
	}
});
