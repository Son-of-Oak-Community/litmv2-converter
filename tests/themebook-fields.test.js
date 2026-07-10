import { describe, expect, it } from "vitest";
import { parseFellowshipThemebook, parseThemebookIndex } from "../scripts/core/converters/themebook-fields.js";

// Mimics the "Themebooks" page structure: uppercase theme-description with "+" separators,
// small words to prove titleCase lowercases them, and a Quest Ideas list per type.
const THEMEBOOKS = `
<div><h2 data-anchor="circumstance">Circumstance</h2></div>
<p class="theme-description origin">BACKGROUND + SOCIAL STANDING + WALK OF LIFE</p>
<p>Prose we do not extract.</p>
<h3 class="with-line">Power Tag Questions</h3>
<p><span class="letter-box">A</span><strong>Q?</strong></p>
<h3 class="with-line">Quest Ideas</h3>
<ul><li><p>Prove your worth.</p></li><li><p>Uphold a code.</p></li></ul>
<div><h2 data-anchor="companion">Companion</h2></div>
<p class="theme-description">ALLY + FELLOW TRAVELER</p>
<h3 class="with-line">Quest Ideas</h3>
<ul><li><p>Keep them safe.</p></li></ul>`;

// Mimics the "Fellowship Creation" Fellowship block: "*" separators, letter-box questions,
// a Fellowship Might line + concept bullets, quest ideas, Name: desc improvements, then Themekits.
const FELLOWSHIP = `
<div class="themebook-title-wrapper neutral"><div class="main-title"><h2 data-anchor="fellowship">Fellowship</h2></div></div>
<p class="theme-description neutral">TRAVELING COMPANIONS * FOUND FAMILY OR LOCAL COMMUNITY</p>
<p><strong>Fellowship Might:</strong> a band of commoners / royalty and divinity</p>
<ul><li><p>What brought you together?</p></li><li><p>Emotion or transaction?</p></li></ul>
<h3 class="with-line">Power Tag Questions</h3>
<p><span class="letter-box">A</span><strong>Who are you?</strong></p>
<p><span class="letter-box">B</span>Where do you meet?</p>
<h3 class="with-line">Weakness Tag Questions</h3>
<p><span class="letter-box">A</span>What is flawed?</p>
<h3 class="with-line">Quest Ideas</h3>
<ul><li><p>Your shared purpose.</p></li></ul>
<h3 class="with-line">Special Improvements</h3>
<p><strong>Campfire Stories:</strong> Remove one tier of a harmful status.</p>
<p><strong>Teamwork:</strong> Get 1 more Power.</p>
<h3 class="with-line">Themekits</h3>
<div class="themekit-big-box">…ignored here…</div>`;

describe("parseThemebookIndex", () => {
	const idx = parseThemebookIndex(THEMEBOOKS);
	it("keys by normalized name and title-cases envisioning tags (small words stay lowercase)", () => {
		expect(idx.circumstance.envisioningTags).toEqual(["Background", "Social Standing", "Walk of Life"]);
	});
	it("extracts per-type quest ideas", () => {
		expect(idx.circumstance.questIdeas).toEqual(["Prove your worth.", "Uphold a code."]);
		expect(idx.companion.questIdeas).toEqual(["Keep them safe."]);
	});
});

describe("parseFellowshipThemebook", () => {
	const fb = parseFellowshipThemebook(FELLOWSHIP);
	it("builds a variable-level, isFellowship themebook doc", () => {
		expect(fb.type).toBe("themebook");
		expect(fb.system.theme_level).toBe("variable");
		expect(fb.system.isFellowship).toBe(true);
		expect(fb.img).toContain("variable.svg");
		expect(fb._id).toMatch(/^[A-Za-z0-9]{16}$/);
	});
	it("extracts envisioning tags (split on '*'), tag questions, quests, improvements", () => {
		expect(fb.system.envisioningTags).toEqual(["Traveling Companions", "Found Family or Local Community"]);
		expect(fb.system.powerTagQuestions).toEqual(["Who are you?", "Where do you meet?"]);
		expect(fb.system.weaknessTagQuestions).toEqual(["What is flawed?"]);
		expect(fb.system.questIdeas).toEqual(["Your shared purpose."]);
		expect(fb.system.specialImprovements).toEqual([
			{ name: "Campfire Stories", description: "Remove one tier of a harmful status." },
			{ name: "Teamwork", description: "Get 1 more Power." },
		]);
	});
	it("assembles the description from owned content (Might line + concept bullets)", () => {
		expect(fb.system.description).toContain("Fellowship Might");
		expect(fb.system.description).toContain("What brought you together?");
		expect(fb.system.description).not.toContain("Special Improvements");
	});
	it("returns null when the Fellowship block is absent", () => {
		expect(parseFellowshipThemebook("<p>nothing</p>")).toBeNull();
	});
});
