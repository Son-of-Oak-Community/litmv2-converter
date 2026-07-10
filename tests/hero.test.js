// tests/content-import-hero.test.js
import { describe, expect, it } from "vitest";
import { convertHero } from "../scripts/core/converters/hero.js";
import { deterministicId } from "../scripts/core/util.js";

const source = {
	_id: "heroBogomil",
	name: "Bogomil",
	type: "litm-character",
	img: "modules/legend-in-the-mist-character-pack/assets/bogomil.webp",
	prototypeToken: { name: "Bogomil" },
	system: {
		biography: "<p>A magician.</p>",
		notes: "<p>Example: cast a [/s dazzled-2].</p>",
		promises: 3,
	},
	items: [
		{
			_id: "t1",
			name: "Magic",
			type: "themebook",
			system: { powertag1: { name: "hex" }, weaknesstag1: { name: "hubris" } },
		},
		{
			_id: "bp1",
			name: "Backpack",
			type: "backpack",
			system: { items: [{ name: "Wand" }] },
		},
		{ _id: "x1", name: "Junk", type: "quintessence", system: {} },
	],
};

describe("convertHero", () => {
	it("produces a hero preserving id/name/img/token", () => {
		const hero = convertHero(source);
		expect(hero.type).toBe("hero");
		expect(hero._id).toBe("heroBogomil");
		expect(hero.name).toBe("Bogomil");
		expect(hero.img).toBe(source.img);
		expect(hero.prototypeToken).toEqual({ name: "Bogomil" });
	});

	it("converts embedded themebook->theme and backpack->backpack, skipping unknown types", () => {
		const hero = convertHero(source);
		const types = hero.items.map((i) => i.type).sort();
		expect(types).toEqual(["backpack", "theme"]);
		const theme = hero.items.find((i) => i.type === "theme");
		expect(theme.effects.some((e) => e.system?.isTitleTag)).toBe(true);
	});

	it("maps promises->promise (clamped) and translates description", () => {
		const hero = convertHero(source);
		expect(hero.system.promise).toBe(3);
		expect(hero.system.description).toContain("A magician.");
		expect(hero.system.description).toContain("[dazzled-2]");
	});

	it("gives the hero an empty top-level effects array", () => {
		expect(convertHero(source).effects).toEqual([]);
	});

	it("cuts the how-to-play boilerplate from notes, keeping hero-specific content", () => {
		const src = {
			...source,
			system: {
				...source.system,
				notes: '<h3 class="with-line">Example Actions</h3><p>Cast a [/s dazzled-2].</p><h3 class="with-line">Taking Actions</h3><p>When you get the spotlight…</p><h3 class="with-line">Reactions</h3><p>…</p><h3 class="with-line">Hero Development</h3><p>…</p>',
			},
		};
		const hero = convertHero(src);
		expect(hero.system.description).toContain("Example Actions");
		expect(hero.system.description).toContain("[dazzled-2]");
		expect(hero.system.description).not.toContain("Taking Actions");
		expect(hero.system.description).not.toContain("Hero Development");
	});

	it("passes notes through whole when the boilerplate heading is absent", () => {
		expect(convertHero(source).system.description).toContain("[dazzled-2]");
	});
});

describe("convertHero — example actions", () => {
	const TABLE =
		'<h3 class="with-line">Example Actions</h3><p></p>' +
		'<table class="example-actions-table"><tbody><tr><td>' +
		'<p class="black-strong">Cast a hex</p>' +
		'<p><mark class="tag">hex</mark></p><p>+</p>' +
		'<p><mark class="tag">Wand</mark></p>' +
		'<p><mark class="tag power">POWER 2</mark></p>' +
		'<p>Give <mark class="tag green">wounded</mark></p>' +
		"</td></tr></tbody></table>";
	const src = {
		...source,
		system: { ...source.system, biography: "<p>“I am a magician.”</p>", notes: TABLE },
	};

	it("converts table cells to embedded action items after the other items", () => {
		const hero = convertHero(src);
		expect(hero.items.map((i) => i.type)).toEqual(["theme", "backpack", "action"]);
		const action = hero.items.at(-1);
		expect(action.name).toBe("Cast a hex");
		// After Task 4b, "hex" (first named power tag) is promoted to the theme's
		// TITLE tag: effect order is weakness "hubris" (index 0), title "hex"
		// (index 1) — hence :1 in the seed.
		expect(action.system.power.positiveTags).toEqual([
			{ label: "hex", tagId: deterministicId("t1:power_tag:hex:1") },
			{ label: "Wand", tagId: deterministicId("bp1:story_tag:Wand:0") },
		]);
		expect(action.system.successes.map((s) => [s.verb, s.text])).toEqual([["attack", "Give [wounded-]"]]);
	});

	it("removes the table and wraps the remaining blurb in a blockquote", () => {
		const hero = convertHero(src);
		expect(hero.system.description).toBe("<blockquote><p>“I am a magician.”</p></blockquote>");
	});

	it("leaves heroes without a table exactly as before — no blockquote, no actions", () => {
		const hero = convertHero(source);
		expect(hero.items.map((i) => i.type).sort()).toEqual(["backpack", "theme"]);
		expect(hero.system.description).not.toContain("<blockquote>");
	});
});
