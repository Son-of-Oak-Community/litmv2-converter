import { describe, expect, it } from "vitest";
import { convertThemekit } from "../scripts/core/converters/themekit.js";
import { THEMEKIT_INDEX } from "../scripts/core/data/themekit-index.js";

const kit = (name, themekit_type) => ({
	_id: "kit0kit0kit0kit0", name, type: "themekit",
	system: { themekit_type, powertags: [{ name }], weaknesstags: [], description: "", quest: "" },
});

describe("themekit tier resolution after slim", () => {
	it("resolves tier + themebook from the real THEMEKIT_INDEX (index-hit branch, no hints)", () => {
		// Picked dynamically (no hardcoded kit name) so this stays valid as the index is
		// regenerated. Deliberately NOT the first entry / an "origin" entry: "origin" is
		// also convertThemekit's fallback default, so an origin-level pick would pass
		// even with the index-hit branch (`indexed?.level ?? …`) deleted entirely — it
		// wouldn't prove anything. A non-origin level, plus omitting themekit_type (so
		// the themebook fallback would be "" if the index weren't consulted), makes both
		// assertions fail if the real THEMEKIT_INDEX[normalizeKitName(name)] lookup breaks.
		const [name, expected] = Object.entries(THEMEKIT_INDEX).find(([, v]) => v.level !== "origin");
		const out = convertThemekit(kit(name, undefined));
		expect(out.system.level).toBe(expected.level);
		expect(out.system.themebook).toBe(expected.themebook);
	});
	it("folder-derivable kit gets its level from kitHints (index need not carry it)", () => {
		const ctx = { kitHints: () => ({ level: "adventure", themebook: "Duty" }) };
		const out = convertThemekit(kit("A Made-Up Fixed Kit", "duty"), ctx);
		expect(out.system.level).toBe("adventure");
		expect(out.system.themebook).toBe("Duty");
	});
	it("non-derivable kit (no hints) falls back to themekit_type + origin", () => {
		// themekit_type ships all-caps in real source data ("DUTY", "COMPANION", …);
		// titleCase only transforms screaming-case input (see scripts/core/util.js),
		// so the synthetic fixture matches that shape rather than the brief's lowercase typo.
		const out = convertThemekit(kit("A Made-Up Kit", "COMPANION"), { kitHints: () => ({}) });
		expect(out.system.level).toBe("origin");
		expect(out.system.themebook).toBe("Companion");
	});
});
