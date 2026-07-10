import { describe, expect, it } from "vitest";
import { parseTropes } from "../scripts/core/converters/trope.js";

const PAGE = `
<div class="tropes-wrapper">
<div class="main-title-block"><div class="tropes-label"><h1><span class="trope-type">Tropes</span>Village Folk</h1></div></div>
<div class="tropes-grid">
<div class="trope"><h2 class="trope-title" data-anchor="sweaty-smith">Sweaty Smith</h2>
<p class="trope-body">You work the bellows.</p>
<div class="theme-kits-header"><p>Theme Kits</p></div>
<ul class="kit-list"><li><p><mark class="tag">Blacksmith</mark> (Skill Or Trade, page 102)</p></li>
<li><p><mark class="tag">Strong as an Ox</mark> (Trait, page 104)</p></li>
<li><p><mark class="tag">Hex &amp; Curse</mark> (Magic, page 120)</p></li></ul>
<ul class="choose-list"><li><p><mark class="tag">Curious</mark> (Personality)</p></li></ul>
<p class="backpack-items"><mark class="tag">sharpening stone</mark>, <mark class="tag">goat bell</mark></p></div>
</div></div>`;

describe("parseTropes", () => {
	const tropes = parseTropes(PAGE);
	it("parses category, name, anchor, description", () => {
		expect(tropes).toHaveLength(1);
		expect(tropes[0]).toMatchObject({ category: "Village Folk", name: "Sweaty Smith", anchor: "sweaty-smith" });
		expect(tropes[0].description).toContain("You work the bellows.");
	});
	it("splits fixed (kit-list) vs optional (choose-list) kit names and decodes entities", () => {
		expect(tropes[0].fixed).toEqual(["Blacksmith", "Strong as an Ox", "Hex & Curse"]);
		expect(tropes[0].optional).toEqual(["Curious"]);
	});
	it("collects backpack choices", () => {
		expect(tropes[0].backpack).toEqual(["sharpening stone", "goat bell"]);
	});
});

const MULTI_WRAPPER_PAGE = `
<div class="tropes-wrapper">
<div class="main-title-block"><div class="tropes-label"><h1><span class="trope-type">Tropes</span>Village Folk</h1></div></div>
<div class="tropes-grid">
<div class="trope"><h2 class="trope-title" data-anchor="sweaty-smith">Sweaty Smith</h2>
<p class="trope-body">You work the bellows.</p>
<ul class="kit-list"><li><p><mark class="tag">Blacksmith</mark></p></li></ul>
<ul class="choose-list"><li><p><mark class="tag">Curious</mark></p></li></ul>
<p class="backpack-items"><mark class="tag">sharpening stone</mark></p></div>
<div class="trope"><h2 class="trope-title">Wandering Bard</h2>
<p class="trope-body">You sing for your supper.</p>
<ul class="kit-list"><li><p><mark class="tag">Lute</mark></p></li></ul>
<ul class="choose-list"><li><p><mark class="tag">Charming</mark></p></li></ul>
<p class="backpack-items"><mark class="tag">spare strings</mark></p></div>
</div></div>
<div class="tropes-wrapper">
<div class="main-title-block"><div class="tropes-label"><h1><span class="trope-type">Tropes</span>Uncanny Folk</h1></div></div>
<div class="tropes-grid">
<div class="trope"><h2 class="trope-title" data-anchor="mist-touched">Mist-Touched</h2>
<p class="trope-body">The mist changed you.</p>
<ul class="kit-list"><li><p><mark class="tag">Uncanny Sense</mark></p></li></ul>
<ul class="choose-list"><li><p><mark class="tag">Eerie</mark></p></li></ul>
<p class="backpack-items"><mark class="tag">strange charm</mark></p></div>
</div></div>`;

describe("parseTropes (multi-wrapper, no-anchor fallback)", () => {
	const tropes = parseTropes(MULTI_WRAPPER_PAGE);
	it("parses all tropes across both wrappers without dropping any", () => {
		expect(tropes).toHaveLength(3);
	});
	it("assigns the correct category per wrapper", () => {
		expect(tropes[0].category).toBe("Village Folk");
		expect(tropes[1].category).toBe("Village Folk");
		expect(tropes[2].category).toBe("Uncanny Folk");
	});
	it("keeps the explicit anchor when data-anchor is present", () => {
		expect(tropes[0]).toMatchObject({ name: "Sweaty Smith", anchor: "sweaty-smith" });
		expect(tropes[2]).toMatchObject({ name: "Mist-Touched", anchor: "mist-touched" });
	});
	it("derives a slugified anchor when data-anchor is missing", () => {
		expect(tropes[1]).toMatchObject({ name: "Wandering Bard", anchor: "wandering-bard" });
	});
});
