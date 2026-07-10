// tests/assemble-handoff.test.js
import { describe, expect, it } from "vitest";
import { assembleHandoff, payloadCounts } from "../scripts/assemble-handoff.js";
import { STORY_THEMES_FOLDER_ID } from "../scripts/core/converters/story-theme-actor.js";
import { normalizeKitName } from "../scripts/core/data/themekit-index.js";

const npc = (id, name) => ({
	_id: id, name, type: "litm-npc", folder: "af1af1af1af1af1a",
	system: { shortDescription: "A beast.", difficulty: 3, roles: ["Aggressor"], floatingTagsAndStatuses: [], mightyAspects: [], threatsAndConsequences: [], limits: [], secrets: [], specialFeatures: [], appliedAddons: [] },
	items: [], effects: [],
});

const themekit = { _id: "k1k1k1k1k1k1k1k1", name: "A Light Against  the Dark", type: "themekit", folder: "if2if2if2if2if2i",
	system: { powertags: [{ name: "A Light Against  the Dark" }], weaknesstags: [], specialImprovements: [], themekit_type: "DUTY", quest: "" } };

const storyTheme = { _id: "st1st1st1st1st1s", name: "Friendly Badger", type: "themebook", folder: "if1if1if1if1if1i", sort: 7,
	system: { options: { isStoryTheme: true }, description: "A badger.", powertags: [{ name: "claws" }], weaknesstags: [] } };

const addon = { _id: "ad1ad1ad1ad1ad1a", name: "Adapted", type: "challenge-addon", folder: "if1if1if1if1if1i",
	system: { description: "", ratingIncrease: 1, roles: [], floatingTagsAndStatuses: [], limits: [], secrets: [], specialFeatures: [], threatsAndConsequences: [] } };

const journal = (content) => ({ _id: "j1j1j1j1j1j1j1j1", name: "Guide", folder: null, ownership: { default: 0 }, pages: [
	{ _id: "p1p1p1p1p1p1p1p1", name: "Intro", type: "text", sort: 0, title: { show: false, level: 1 }, image: {},
	  text: { format: 1, content }, video: {}, src: null, system: {}, ownership: { default: -1 }, flags: {} },
] });

// Mimics the "Themebooks" page structure (see themebook-fields.test.js): uppercase
// theme-description with "+" separators and a Quest Ideas list.
const THEMEBOOKS_HTML = `
<div><h2 data-anchor="circumstance">Circumstance</h2></div>
<p class="theme-description origin">BACKGROUND + SOCIAL STANDING + WALK OF LIFE</p>
<h3 class="with-line">Quest Ideas</h3>
<ul><li><p>Prove your worth.</p></li></ul>`;

// Mimics the "Fellowship Creation" Fellowship block (see themebook-fields.test.js).
const FELLOWSHIP_HTML = `
<div class="themebook-title-wrapper neutral"><div class="main-title"><h2 data-anchor="fellowship">Fellowship</h2></div></div>
<p class="theme-description neutral">TRAVELING COMPANIONS * FOUND FAMILY OR LOCAL COMMUNITY</p>
<p><strong>Fellowship Might:</strong> a band of commoners / royalty and divinity</p>
<ul><li><p>What brought you together?</p></li></ul>
<h3 class="with-line">Power Tag Questions</h3>
<p><span class="letter-box">A</span><strong>Who are you?</strong></p>
<h3 class="with-line">Weakness Tag Questions</h3>
<p><span class="letter-box">A</span>What is flawed?</p>
<h3 class="with-line">Quest Ideas</h3>
<ul><li><p>Your shared purpose.</p></li></ul>
<h3 class="with-line">Special Improvements</h3>
<p><strong>Campfire Stories:</strong> Remove one tier of a harmful status.</p>
<h3 class="with-line">Themekits</h3>
<div class="themekit-big-box">…ignored here…</div>`;

// A "Themebooks" journal entry owning both source pages the synthesis reads.
const themebooksJournal = {
	_id: "tj1tj1tj1tj1tj1t", name: "Themebooks", folder: null, ownership: { default: 0 },
	pages: [
		{ _id: "tbp1tbp1tbp1tbp1", name: "Themebooks", type: "text", sort: 0, title: { show: false, level: 1 }, image: {},
		  text: { format: 1, content: THEMEBOOKS_HTML }, video: {}, src: null, system: {}, ownership: { default: -1 }, flags: {} },
		{ _id: "fcp1fcp1fcp1fcp1", name: "Fellowship Creation", type: "text", sort: 1, title: { show: false, level: 1 }, image: {},
		  text: { format: 1, content: FELLOWSHIP_HTML }, video: {}, src: null, system: {}, ownership: { default: -1 }, flags: {} },
	],
};

const folders = [
	{ _id: "af1af1af1af1af1a", type: "Actor", name: "Challenges", folder: null, color: null, sorting: "a", sort: 0, description: "", flags: {} },
	{ _id: "if0if0if0if0if0i", type: "Item", name: "All Items", folder: null, color: null, sorting: "a", sort: 0, description: "", flags: {} },
	{ _id: "if1if1if1if1if1i", type: "Item", name: "Misc", folder: "if0if0if0if0if0i", color: null, sorting: "a", sort: 1, description: "", flags: {} },
	{ _id: "if2if2if2if2if2i", type: "Item", name: "Themekits", folder: "if0if0if0if0if0i", color: null, sorting: "a", sort: 2, description: "", flags: {} },
];

describe("assembleHandoff — pack-routed source (core book)", () => {
	const adventure = {
		_id: "LITMCoreBookAdv0", name: "Core", img: "modules/x/banner.jpg", caption: "", description: "", sort: 0,
		actors: [npc("n1n1n1n1n1n1n1n1", "BEAST")],
		items: [themekit, storyTheme, addon],
		journal: [journal("See @UUID[Actor.n1n1n1n1n1n1n1n1]{The Beast} for [/s doom-2].")],
		scenes: [],
		folders,
	};
	const out = assembleHandoff("legend-in-the-mist-core-book", adventure);

	it("routes actors, journals, and items to their per-type packs; no adventure block", () => {
		expect(out.adventure).toBeUndefined();
		expect(out.packs["litm-core-book-actors"].docs.map((a) => [a.type, a.name])).toEqual([
			["challenge", "Beast"],
			["story_theme", "Friendly Badger"],
		]);
		expect(out.packs["litm-core-book-journals"].docs).toHaveLength(1);
		expect(out.packs["litm-core-book-themekits"].docs.map((i) => i.type)).toEqual(["theme"]);
		expect(out.packs["litm-core-book-items"].docs.map((i) => i.type)).toEqual(["addon"]);
		expect(out.packs["litm-core-book-themebooks"]).toBeUndefined();
	});

	it("wraps story themes into vessel actors under the synthesized folder", () => {
		const vessel = out.packs["litm-core-book-actors"].docs[1];
		expect(vessel._id).toBe("st1st1st1st1st1s");
		expect(vessel.items[0].type).toBe("story_theme");
		expect(vessel.folder).toBe(STORY_THEMES_FOLDER_ID);
		const folderIds = out.packs["litm-core-book-actors"].folders.map((f) => f._id);
		expect(folderIds).toContain("af1af1af1af1af1a");
		expect(folderIds).toContain(STORY_THEMES_FOLDER_ID);
	});

	it("rewrites links to the new per-source pack names", () => {
		expect(out.packs["litm-core-book-journals"].docs[0].pages[0].text.content).toBe(
			"See @UUID[Compendium.litmv2-converter.litm-core-book-actors.Actor.n1n1n1n1n1n1n1n1]{The Beast} for [doom-2].",
		);
	});

	it("replicates shared item folders per pack, minus flattened lone wrappers", () => {
		expect(out.packs["litm-core-book-themekits"].folders.map((f) => [f._id, f.folder])).toEqual([["if2if2if2if2if2i", null]]);
		expect(out.packs["litm-core-book-items"].folders.map((f) => [f._id, f.folder])).toEqual([["if1if1if1if1if1i", null]]);
	});

	it("counts per document class", () => {
		expect(payloadCounts(out)).toEqual({ Actor: 2, Item: 2, JournalEntry: 1 });
	});

	it("throws on unconvertible source types (parity gate)", () => {
		const withUnknown = { ...adventure, items: [...adventure.items, { _id: "x1x1x1x1x1x1x1x1", name: "X", type: "mystery-item", system: {} }] };
		expect(() => assembleHandoff("legend-in-the-mist-core-book", withUnknown)).toThrow(/mystery-item \(1\)/);
	});

	it("throws when a converted type has no destination in this source's route", () => {
		const withVignette = { ...adventure, items: [...adventure.items, { _id: "v1v1v1v1v1v1v1v1", name: "V", type: "shortchallenge", system: { shortDescription: "x", list: [] } }] };
		expect(() => assembleHandoff("legend-in-the-mist-hearts-of-ravendale", withVignette)).toThrow(/shortchallenge→vignette \(1\)/);
	});

	it("throws on an unrouted source module", () => {
		expect(() => assembleHandoff("some-third-party-module", adventure)).toThrow(/No destination routing/);
	});

	it("leaves links to story-theme items untouched (they'd otherwise dangle at an Actor-typed pack)", () => {
		const withStoryThemeLink = { ...adventure, journal: [journal("See @UUID[Item.st1st1st1st1st1s]{Badger} for details.")] };
		const out2 = assembleHandoff("legend-in-the-mist-core-book", withStoryThemeLink);
		expect(out2.packs["litm-core-book-journals"].docs[0].pages[0].text.content).toContain(
			"@UUID[Item.st1st1st1st1st1s]{Badger}",
		);
	});
});

describe("assembleHandoff — Fellowship themebook injection", () => {
	const themebook = { _id: "tb1tb1tb1tb1tb1t", name: "Circumstance", type: "themebook", folder: "if1if1if1if1if1i",
		system: { options: {}, type: "litm-origin", description: "<p>x</p>", specialImprovements: [] } };
	const adventure = {
		_id: "LITMCoreBookAdv0", name: "Core", img: "", caption: "", description: "", sort: 0,
		actors: [], items: [themebook], journal: [themebooksJournal], scenes: [], folders,
	};

	it("adds the synthesized Fellowship to the themebooks pack, in the same folder as its peers, and feeds envisioning tags from the owned page", () => {
		const out = assembleHandoff("legend-in-the-mist-core-book", adventure);
		const docs = out.packs["litm-core-book-themebooks"].docs;
		expect(docs.map((d) => d.name)).toEqual(["Circumstance", "The Fellowship"]);
		const circumstance = docs.find((d) => d.name === "Circumstance");
		expect(circumstance.system.envisioningTags).toEqual(["Background", "Social Standing", "Walk of Life"]);
		const fellowship = docs.find((d) => d.name === "The Fellowship");
		expect(fellowship.system.isFellowship).toBe(true);
		expect(fellowship.system.theme_level).toBe("variable");
		expect(fellowship.system.envisioningTags).toEqual(["Traveling Companions", "Found Family or Local Community"]);
		expect(fellowship.folder).toBe("if1if1if1if1if1i");
	});

	it("does not inject a Fellowship when the source produced no themebooks", () => {
		const out = assembleHandoff("legend-in-the-mist-core-book", { ...adventure, items: [] });
		expect(out.packs["litm-core-book-themebooks"]).toBeUndefined();
	});

	it("does not inject a Fellowship when the source has no Fellowship Creation page (Themebooks page alone still feeds envisioningTags)", () => {
		const themebooksOnlyJournal = { ...themebooksJournal, pages: [themebooksJournal.pages[0]] };
		const out = assembleHandoff("legend-in-the-mist-core-book", { ...adventure, journal: [themebooksOnlyJournal] });
		const docs = out.packs["litm-core-book-themebooks"].docs;
		expect(docs.map((d) => d.name)).toEqual(["Circumstance"]);
		expect(docs[0].system.envisioningTags).toEqual(["Background", "Social Standing", "Walk of Life"]);
	});

	it("does not leak folder state between synthesized Fellowship docs across exports", () => {
		const a = assembleHandoff("legend-in-the-mist-core-book", adventure);
		const b = assembleHandoff("legend-in-the-mist-core-book", { ...adventure, items: [{ ...themebook, folder: "if2if2if2if2if2i" }] });
		const fa = a.packs["litm-core-book-themebooks"].docs.find((d) => d.name === "The Fellowship");
		const fb = b.packs["litm-core-book-themebooks"].docs.find((d) => d.name === "The Fellowship");
		expect(fa.folder).toBe("if1if1if1if1if1i");
		expect(fb.folder).toBe("if2if2if2if2if2i");
	});
});

describe("assembleHandoff — Fellowship themekits injection", () => {
	// Same "Fellowship Creation" fixture as above, but with two real themekit-big-box
	// entries (mirroring fellowship-themekits.test.js) in place of the ignored placeholder.
	const FELLOWSHIP_WITH_KITS_HTML = FELLOWSHIP_HTML.replace(
		'<div class="themekit-big-box">…ignored here…</div>',
		`<div class="themekit-big-box"><div class="heading"><p>FELLOWSHIP</p></div>
<div class="themekit-title"><p>Fellowship of the Amulet</p></div>
<div class="powertags"><p><mark class="tag positive">hidden campsites</mark></p></div>
<div class="weaknesstags"><p><mark class="tag weakness"><i class="fa-light fa-angles-down"></i>growing mistrust</mark></p></div>
<div class="quest"><p>Destroy the Amulet.</p></div></div>
<div class="themekit-big-box"><div class="heading"><p>FELLOWSHIP</p></div>
<div class="themekit-title"><p>Tavern Buddies</p></div>
<div class="powertags"><p><mark class="tag positive">the town commons</mark></p></div>
<div class="weaknesstags"><p><mark class="tag weakness"><i class="fa-light fa-angles-down"></i>gossip hounds</mark></p></div>
<div class="quest"><p>Back to how it was.</p></div></div>`,
	);

	const journalWithKits = {
		_id: "tj2tj2tj2tj2tj2t", name: "Themebooks", folder: null, ownership: { default: 0 },
		pages: [
			{ _id: "tbp2tbp2tbp2tbp2", name: "Themebooks", type: "text", sort: 0, title: { show: false, level: 1 }, image: {},
			  text: { format: 1, content: THEMEBOOKS_HTML }, video: {}, src: null, system: {}, ownership: { default: -1 }, flags: {} },
			{ _id: "fcp2fcp2fcp2fcp2", name: "Fellowship Creation", type: "text", sort: 1, title: { show: false, level: 1 }, image: {},
			  text: { format: 1, content: FELLOWSHIP_WITH_KITS_HTML }, video: {}, src: null, system: {}, ownership: { default: -1 }, flags: {} },
		],
	};

	// items include the one source themekit, so litm-core-book-themekits already has a doc
	// (the injection guard requires the pack to be non-empty before synthesizing into it).
	const adventure = {
		_id: "LITMCoreBookAdv0", name: "Core", img: "", caption: "", description: "", sort: 0,
		actors: [], items: [themekit], journal: [journalWithKits], scenes: [], folders,
	};

	it("appends the parsed Fellowship kits to the themekits pack, at the pack root", () => {
		const out = assembleHandoff("legend-in-the-mist-core-book", adventure);
		const docs = out.packs["litm-core-book-themekits"].docs;
		expect(docs.map((d) => d.name)).toEqual([
			"A Light Against  the Dark",
			"Fellowship of the Amulet",
			"Tavern Buddies",
		]);
		const kits = docs.slice(1);
		expect(kits.every((d) => d.type === "theme")).toBe(true);
		expect(kits.every((d) => d.system.themebook === "The Fellowship")).toBe(true);
		// Unlike the source themekit doc, which sits in a real folder (if2if2if2if2if2i, per
		// `folders`), the synthesized Fellowship kits are unfoldered — the themekits pack is
		// deeply nested by Themekits/<Level>/<Themebook> so there is no single shared folder
		// to inherit (see assemble-handoff.js).
		expect(docs[0].folder).toBe("if2if2if2if2if2i");
		expect(kits.every((d) => d.folder === null)).toBe(true);
	});

	it("carries the quest and disabled template tags for each synthesized kit", () => {
		const out = assembleHandoff("legend-in-the-mist-core-book", adventure);
		const amulet = out.packs["litm-core-book-themekits"].docs.find((d) => d.name === "Fellowship of the Amulet");
		expect(amulet.system.quest.description).toBe("Destroy the Amulet.");
		const power = amulet.effects.filter((e) => e.type === "power_tag" && !e.system.isTitleTag);
		expect(power.map((e) => e.name)).toEqual(["hidden campsites"]);
		expect(power.every((e) => e.disabled)).toBe(true);
		const weak = amulet.effects.filter((e) => e.type === "weakness_tag");
		expect(weak.map((e) => e.name)).toEqual(["growing mistrust"]);
	});

	it("does not inject kits when the source produced no themekit pack docs", () => {
		const out = assembleHandoff("legend-in-the-mist-core-book", { ...adventure, items: [] });
		expect(out.packs["litm-core-book-themekits"]).toBeUndefined();
	});

	it("does not inject kits when there is no Fellowship Creation page", () => {
		const themebooksOnlyJournal = { ...journalWithKits, pages: [journalWithKits.pages[0]] };
		const out = assembleHandoff("legend-in-the-mist-core-book", { ...adventure, journal: [themebooksOnlyJournal] });
		expect(out.packs["litm-core-book-themekits"].docs.map((d) => d.name)).toEqual(["A Light Against  the Dark"]);
	});
});

describe("assembleHandoff — fail-loud guards (source structure changed)", () => {
    it("throws when the Themebooks page is present but no themebook types parse", () => {
        const degenerateJournal = {
            _id: "tj9tj9tj9tj9tj9t", name: "Themebooks", folder: null, ownership: { default: 0 },
            pages: [
                { _id: "tbp9tbp9tbp9tbp9", name: "Themebooks", type: "text", sort: 0, title: { show: false, level: 1 }, image: {},
                  text: { format: 1, content: "<p>No anchored themebook blocks here.</p>" }, video: {}, src: null, system: {}, ownership: { default: -1 }, flags: {} },
            ],
        };
        const adventure = {
            _id: "LITMCoreBookAdv0", name: "Core", img: "", caption: "", description: "", sort: 0,
            actors: [], items: [], journal: [degenerateJournal], scenes: [], folders: [],
        };
        expect(() => assembleHandoff("legend-in-the-mist-core-book", adventure)).toThrow(/no themebook types parsed/);
    });

    it("throws when the Fellowship Creation page is present but the Fellowship block does not parse", () => {
        const themebook = { _id: "tb9tb9tb9tb9tb9t", name: "Circumstance", type: "themebook", folder: "if1if1if1if1if1i",
            system: { options: {}, type: "litm-origin", description: "<p>x</p>", specialImprovements: [] } };
        // Valid Themebooks page (so guard 1 doesn't fire) + a degenerate Fellowship
        // Creation page: no `data-anchor="fellowship"` block for parseFellowshipThemebook to find.
        const degenerateJournal = {
            _id: "tj8tj8tj8tj8tj8t", name: "Themebooks", folder: null, ownership: { default: 0 },
            pages: [
                { _id: "tbp8tbp8tbp8tbp8", name: "Themebooks", type: "text", sort: 0, title: { show: false, level: 1 }, image: {},
                  text: { format: 1, content: THEMEBOOKS_HTML }, video: {}, src: null, system: {}, ownership: { default: -1 }, flags: {} },
                { _id: "fcp8fcp8fcp8fcp8", name: "Fellowship Creation", type: "text", sort: 1, title: { show: false, level: 1 }, image: {},
                  text: { format: 1, content: "<p>No fellowship anchor here.</p>" }, video: {}, src: null, system: {}, ownership: { default: -1 }, flags: {} },
            ],
        };
        const adventure = {
            _id: "LITMCoreBookAdv0", name: "Core", img: "", caption: "", description: "", sort: 0,
            // The themebook item must route into litm-core-book-themebooks so the pack
            // has docs — the Fellowship guard is gated on that (see assemble-handoff.js).
            actors: [], items: [themebook], journal: [degenerateJournal], scenes: [], folders,
        };
        expect(() => assembleHandoff("legend-in-the-mist-core-book", adventure)).toThrow(/did not parse/);
    });
});

describe("assembleHandoff — adventure-routed source (HoR)", () => {
	const scene = { _id: "s1s1s1s1s1s1s1s1", name: "Map", folder: "sf1sf1sf1sf1sf1s", active: true, ownership: { default: 0 },
		tokens: [{ _id: "tok1tok1tok1tok1", actorId: "n1n1n1n1n1n1n1n1" }], levels: [] };
	const advSource = {
		_id: "HoRDaleAdventur0", name: "Hearts of Ravendale I: The Dale",
		img: "modules/legend-in-the-mist-hearts-of-ravendale/assets/cover.jpg", caption: "",
		description: "<p>The Dales. See @UUID[Actor.n1n1n1n1n1n1n1n1]{The Beast}.</p>", sort: 0,
		actors: [npc("n1n1n1n1n1n1n1n1", "BEAST")],
		items: [themekit, storyTheme, addon],
		journal: [journal("See @UUID[Actor.n1n1n1n1n1n1n1n1]{The Beast} for [/s doom-2].")],
		scenes: [scene],
		folders: [...folders, { _id: "sf1sf1sf1sf1sf1s", type: "Scene", name: "Maps", folder: null, color: null, sorting: "a", sort: 0, description: "", flags: {} }],
	};
	const out = assembleHandoff("legend-in-the-mist-hearts-of-ravendale", advSource);

	it("builds the adventure block from the source adventure metadata", () => {
		expect(out.adventure.pack).toBe("litm-hor-the-dales");
		expect(out.adventure._id).toBe("HoRDaleAdventur0");
		expect(out.adventure.name).toBe("Hearts of Ravendale I: The Dale");
		expect(out.adventure.img).toBe("modules/legend-in-the-mist-hearts-of-ravendale/assets/cover.jpg");
	});

	it("puts actors, story-theme vessels, journal, and scenes inside the adventure", () => {
		expect(out.adventure.actors.map((a) => a.type).sort()).toEqual(["challenge", "story_theme"]);
		expect(out.adventure.journal).toHaveLength(1);
		expect(out.adventure.scenes).toHaveLength(1);
		expect(out.adventure.scenes[0].tokens[0].actorId).toBe("n1n1n1n1n1n1n1n1");
	});

	it("routes items to the HoR item packs", () => {
		expect(out.packs["litm-hor-themekits"].docs.map((i) => i.type)).toEqual(["theme"]);
		expect(out.packs["litm-hor-items"].docs.map((i) => i.type)).toEqual(["addon"]);
	});

	it("keeps links between adventure members world-relative (they resolve on adventure import)", () => {
		const content = out.adventure.journal[0].pages[0].text.content;
		expect(content).toContain("@UUID[Actor.n1n1n1n1n1n1n1n1]{The Beast}");
		expect(content).toContain("[doom-2]");
		expect(out.adventure.description).toContain("@UUID[Actor.n1n1n1n1n1n1n1n1]");
	});

	it("carries Actor/Scene folders (and the Story Themes folder) in the adventure, Item folders in the packs", () => {
		const advFolderIds = out.adventure.folders.map((f) => f._id);
		expect(advFolderIds).toContain("af1af1af1af1af1a");
		expect(advFolderIds).toContain("sf1sf1sf1sf1sf1s");
		expect(advFolderIds).toContain(STORY_THEMES_FOLDER_ID);
		expect(advFolderIds).not.toContain("if0if0if0if0if0i");
		expect(out.packs["litm-hor-themekits"].folders.map((f) => [f._id, f.folder])).toEqual([["if2if2if2if2if2i", null]]);
	});

	it("counts the adventure and its members", () => {
		expect(payloadCounts(out)).toEqual({ Adventure: 1, Actor: 2, Item: 2, JournalEntry: 1, Scene: 1 });
	});

	it("repairs dead Actor links whose label names an addon (known source-data defect)", () => {
		const repaired = assembleHandoff("legend-in-the-mist-hearts-of-ravendale", {
			...advSource,
			journal: [journal(
				"Try @UUID[Actor.deaddeaddeaddead]{Adapted (Add-on)} or @UUID[Actor.feedfeedfeedfeed]{ADAPTED}, but not @UUID[Actor.beefbeefbeefbeef]{Unknown Thing} or @UUID[Actor.n1n1n1n1n1n1n1n1]{The Beast}.",
			)],
		});
		const content = repaired.adventure.journal[0].pages[0].text.content;
		// Dead id + addon-name label (with or without the "(Add-on)" suffix, any case) → compendium item link.
		expect(content).toContain("@UUID[Compendium.litmv2-converter.litm-hor-items.Item.ad1ad1ad1ad1ad1a]{Adapted (Add-on)}");
		expect(content).toContain("@UUID[Compendium.litmv2-converter.litm-hor-items.Item.ad1ad1ad1ad1ad1a]{ADAPTED}");
		// Dead id with an unmatched label stays untouched; adventure-member links stay world-relative.
		expect(content).toContain("@UUID[Actor.beefbeefbeefbeef]{Unknown Thing}");
		expect(content).toContain("@UUID[Actor.n1n1n1n1n1n1n1n1]{The Beast}");
	});
});

describe("assembleHandoff — character pack", () => {
	const out = assembleHandoff("legend-in-the-mist-character-pack", {
		_id: "E7xkMpSra9ihl7JR", name: "CP", img: "", caption: "", description: "", sort: 0,
		actors: [{ _id: "h1h1h1h1h1h1h1h1", name: "Bogomil", type: "litm-character", folder: null, sort: 100,
			system: { biography: "<p>A magician.</p>", notes: "", promises: 2 }, items: [] }],
		items: [], journal: [], scenes: [], folders: [],
	});
	it("routes heroes to litm-character-pack and nothing else", () => {
		expect(Object.keys(out.packs)).toEqual(["litm-character-pack"]);
		expect(out.packs["litm-character-pack"].docs[0]).toMatchObject({ type: "hero", sort: 100 });
		expect(out.adventure).toBeUndefined();
	});

	it("marks the payload with the current handoff format", () => {
		expect(out.format).toBe(2);
	});
});

describe("assembleHandoff — folder flattening", () => {
	it("removes module wrapper folders and lone type wrappers from pack groups", () => {
		const hero = {
			_id: "h1h1h1h1h1h1h1h1", name: "Bogomil", type: "litm-character", folder: "cw1cw1cw1cw1cw1c",
			system: { biography: "", notes: "", promises: 0 }, items: [], effects: [],
		};
		const adventure = {
			_id: "CharPackAdv00000", name: "Character Pack", img: "", caption: "", description: "", sort: 0,
			actors: [hero], items: [], journal: [], scenes: [],
			folders: [
				{ _id: "cw1cw1cw1cw1cw1c", type: "Actor", name: "Character Pack", folder: null, color: null, sorting: "a", sort: 0, description: "", flags: {} },
			],
		};
		const out = assembleHandoff("legend-in-the-mist-character-pack", adventure);
		const pack = out.packs["litm-character-pack"];
		expect(pack.folders).toEqual([]);
		expect(pack.docs[0].folder).toBeNull();
	});
});

describe("assembleHandoff — trope injection", () => {
	// A source themekit whose name a trope's kit-list references — the same shape
	// buildKitUuidMap (export-flow.js) would produce for a same-source kit: keyed by
	// normalizeKitName, valued at a Compendium UUID pointing at the (id-preserving)
	// converted theme item.
	const smithKit = { _id: "sk1sk1sk1sk1sk1s", name: "Blacksmith", type: "themekit", folder: null,
		system: { powertags: [{ name: "Blacksmith" }], weaknesstags: [], specialImprovements: [], themekit_type: "SKILL OR TRADE", quest: "" } };

	const TROPE_PAGE_HTML = `
<div class="tropes-wrapper">
<div class="main-title-block"><div class="tropes-label"><h1><span class="trope-type">Tropes</span>Village Folk</h1></div></div>
<div class="tropes-grid">
<div class="trope"><h2 class="trope-title" data-anchor="sweaty-smith">Sweaty Smith</h2>
<p class="trope-body">You work the bellows.</p>
<ul class="kit-list"><li><p><mark class="tag">Blacksmith</mark></p></li></ul>
<ul class="choose-list"><li><p><mark class="tag">Mystery Kit</mark></p></li></ul>
<p class="backpack-items"><mark class="tag">sharpening stone</mark></p></div>
</div></div>`;

	const kitUuidByName = new Map([
		[normalizeKitName("Blacksmith"), `Compendium.litmv2-converter.litm-core-book-themekits.Item.${smithKit._id}`],
	]);

	const adventure = {
		_id: "LITMCoreBookAdv1", name: "Core", img: "", caption: "", description: "", sort: 0,
		actors: [], items: [smithKit], journal: [journal(TROPE_PAGE_HTML)], scenes: [], folders: [],
	};

	it("injects parsed tropes into the source's trope pack, unfoldered", () => {
		const out = assembleHandoff("legend-in-the-mist-core-book", adventure, { kitUuidByName });
		const tropes = out.packs["litm-core-book-tropes"].docs;
		expect(tropes).toHaveLength(1);
		expect(tropes[0]).toMatchObject({ name: "Sweaty Smith", type: "trope", folder: null });
	});

	it("resolves a kit named by the trope to its injected Compendium UUID, and keeps an unresolved kit's raw name", () => {
		const out = assembleHandoff("legend-in-the-mist-core-book", adventure, { kitUuidByName });
		const [smith] = out.packs["litm-core-book-tropes"].docs;
		expect(smith.system.themeKits.fixed[0]).toBe(`Compendium.litmv2-converter.litm-core-book-themekits.Item.${smithKit._id}`);
		expect(smith.system.themeKits.optional[0]).toBe("Mystery Kit");
	});

	it("is backward compatible: an omitted options arg resolves no kits (raw names pass through)", () => {
		const out = assembleHandoff("legend-in-the-mist-core-book", adventure);
		const [smith] = out.packs["litm-core-book-tropes"].docs;
		expect(smith.system.themeKits.fixed[0]).toBe("Blacksmith");
	});

	it("merges trope pages from multiple journal entries into the one destination pack (HoR ships Dalish + Uncanny)", () => {
		const secondPageHtml = TROPE_PAGE_HTML
			.replace("Village Folk", "Uncanny Folk")
			.replace(' data-anchor="sweaty-smith">Sweaty Smith', '>Mist-Touched')
			.replace("You work the bellows.", "The mist changed you.");
		const dalishJournal = { _id: "dj1dj1dj1dj1dj1d", name: "Dalish Tropes", folder: null, ownership: { default: 0 }, pages: [
			{ _id: "dp1dp1dp1dp1dp1d", name: "Dalish Tropes", type: "text", sort: 0, title: { show: false, level: 1 }, image: {},
			  text: { format: 1, content: TROPE_PAGE_HTML }, video: {}, src: null, system: {}, ownership: { default: -1 }, flags: {} },
		] };
		const uncannyJournal = { _id: "uj1uj1uj1uj1uj1u", name: "Uncanny Tropes", folder: null, ownership: { default: 0 }, pages: [
			{ _id: "up1up1up1up1up1u", name: "Uncanny Tropes", type: "text", sort: 0, title: { show: false, level: 1 }, image: {},
			  text: { format: 1, content: secondPageHtml }, video: {}, src: null, system: {}, ownership: { default: -1 }, flags: {} },
		] };
		const horAdventure = {
			_id: "HoRDaleAdventur1", name: "Hearts of Ravendale I: The Dale", img: "", caption: "", description: "", sort: 0,
			actors: [], items: [], journal: [dalishJournal, uncannyJournal], scenes: [], folders: [],
		};
		const out = assembleHandoff("legend-in-the-mist-hearts-of-ravendale", horAdventure);
		expect(out.packs["litm-hor-tropes"].docs.map((d) => d.name)).toEqual(["Sweaty Smith", "Mist-Touched"]);
	});

	it("does not pick up a stray `class=\"trope\"` div with no trope-title entries (HoR 'Woodend & Smaller Dales' quirk)", () => {
		const strayPage = journal(`<div class="trope">Not a real trope block, no trope-title heading here.</div>`);
		const out = assembleHandoff("legend-in-the-mist-hearts-of-ravendale", {
			_id: "HoRDaleAdventur2", name: "The Dale", img: "", caption: "", description: "", sort: 0,
			actors: [], items: [], journal: [strayPage], scenes: [], folders: [],
		});
		expect(out.packs["litm-hor-tropes"]).toBeUndefined();
	});

	it("fails loud when a trope-title-bearing page yields zero parsed tropes (source structure changed)", () => {
		const degeneratePage = journal(`<p>class="trope-title" appears here but not in a real trope block.</p>`);
		const degenerate = {
			_id: "LITMCoreBookAdv2", name: "Core", img: "", caption: "", description: "", sort: 0,
			actors: [], items: [], journal: [degeneratePage], scenes: [], folders: [],
		};
		expect(() => assembleHandoff("legend-in-the-mist-core-book", degenerate)).toThrow(/none parsed/);
	});
});
