// tests/fellowship-themekits.test.js
import { describe, expect, it } from "vitest";
import { parseFellowshipThemekits } from "../scripts/core/converters/fellowship-themekits.js";
import { normalizeKitName, THEMEKIT_INDEX } from "../scripts/core/data/themekit-index.js";

const PAGE = `
<h3 class="with-line">Themekits</h3>
<div class="flexrow">
<div class="themekit-big-box"><div class="heading"><p>FELLOWSHIP</p></div>
<div class="themekit-title"><p>Fellowship of the Amulet</p></div>
<div class="powertags"><p><mark class="tag positive">hidden campsites</mark>, <mark class="tag positive">the Amulet</mark></p></div>
<div class="weaknesstags"><p><mark class="tag weakness"><i class="fa-light fa-angles-down"></i>growing mistrust</mark></p></div>
<div class="quest"><p>Destroy the Amulet.</p></div></div>
<div class="themekit-big-box"><div class="heading"><p>FELLOWSHIP</p></div>
<div class="themekit-title"><p>Tavern Buddies</p></div>
<div class="powertags"><p><mark class="tag positive">the town commons</mark></p></div>
<div class="weaknesstags"><p><mark class="tag weakness"><i class="fa-light fa-angles-down"></i>gossip hounds</mark></p></div>
<div class="quest"><p>Back to how it was.</p></div></div>
</div>`;

describe("parseFellowshipThemekits", () => {
	const kits = parseFellowshipThemekits(PAGE);
	it("parses one theme item per themekit-big-box", () => {
		expect(kits.map((k) => k.name)).toEqual(["Fellowship of the Amulet", "Tavern Buddies"]);
		expect(kits.every((k) => k.type === "theme")).toBe(true);
	});
	it("sets themebook to The Fellowship and carries the quest", () => {
		expect(kits[0].system.themebook).toBe("The Fellowship");
		expect(kits[0].system.quest.description).toBe("Destroy the Amulet.");
	});
	it("emits an enabled title tag plus disabled power/weakness template tags (icon stripped)", () => {
		const k = kits[0];
		const title = k.effects.find((e) => e.system.isTitleTag);
		expect(title).toMatchObject({ name: "Fellowship of the Amulet", disabled: false });
		// Title tag shares type "power_tag" (same shape as convertThemekit — see
		// themekit.test.js); exclude it by isTitleTag, not by type, to isolate the body tags.
		const power = k.effects.filter((e) => e.type === "power_tag" && !e.system.isTitleTag);
		expect(power.map((e) => e.name)).toEqual(["hidden campsites", "the Amulet"]);
		const weak = k.effects.filter((e) => e.type === "weakness_tag");
		expect(weak.map((e) => e.name)).toEqual(["growing mistrust"]); // <i> icon removed
		expect(power.every((e) => e.disabled)).toBe(true);
	});
	it("returns [] when there is no Themekits section", () => {
		expect(parseFellowshipThemekits("<p>nope</p>")).toEqual([]);
	});
	it("resolves each kit's tier from the themekit index, not a hardcoded default", () => {
		// Both fixture names are real Fellowship kits in THEMEKIT_INDEX (see
		// scripts/core/data/themekit-index.js) that happen to sit at different tiers —
		// asserting against the index (rather than a literal "origin"/"adventure" string)
		// keeps this test honest if the index is regenerated.
		for (const k of kits) expect(k.system.level).toBe(THEMEKIT_INDEX[normalizeKitName(k.name)].level);
		expect(kits[0].system.level).toBe("adventure"); // Fellowship of the Amulet
		expect(kits[1].system.level).toBe("origin"); // Tavern Buddies
	});
	it("falls back to origin tier for a kit name absent from the index", () => {
		const madeUpPage = PAGE.replace("Fellowship of the Amulet", "Not A Real Themekit Name");
		const [kit] = parseFellowshipThemekits(madeUpPage);
		expect(normalizeKitName(kit.name) in THEMEKIT_INDEX).toBe(false);
		expect(kit.system.level).toBe("origin");
	});
});
