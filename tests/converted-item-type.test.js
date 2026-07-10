import { describe, expect, it } from "vitest";
import { CONVERTED_ITEM_TYPE, ITEM_CONVERTERS } from "../scripts/assemble-handoff.js";

// CONVERTED_ITEM_TYPE predicts each item's converted `.type` WITHOUT running the
// converter, because the link resolver needs every destination before conversion
// starts. If it drifts from what the converters actually produce, links resolve
// to the wrong pack (or nowhere). This guards the two maps against drift.

// Minimal source items exercising every branch the predictor keys on.
const cases = [
	{ type: "themekit", item: { type: "themekit", name: "Kit", system: { powertags: [], weaknesstags: [] } } },
	{ type: "themebook", item: { type: "themebook", name: "Book", system: { type: "litm-origin" } } },
	{ type: "themebook", item: { type: "themebook", name: "Story", system: { options: { isStoryTheme: true }, powertags: [], weaknesstags: [] } } },
	{ type: "shortchallenge", item: { type: "shortchallenge", name: "Vig", system: {} } },
	{ type: "challenge-addon", item: { type: "challenge-addon", name: "Add", system: {} } },
];

describe("CONVERTED_ITEM_TYPE stays in sync with ITEM_CONVERTERS", () => {
	it("covers exactly the same source types as ITEM_CONVERTERS", () => {
		expect(Object.keys(CONVERTED_ITEM_TYPE).sort()).toEqual(Object.keys(ITEM_CONVERTERS).sort());
	});

	for (const { type, item } of cases) {
		it(`predicts the real converted type for ${type} (${item.name})`, () => {
			const predicted = CONVERTED_ITEM_TYPE[type](item);
			const actual = ITEM_CONVERTERS[type](item, {}).type;
			expect(predicted).toBe(actual);
		});
	}
});
