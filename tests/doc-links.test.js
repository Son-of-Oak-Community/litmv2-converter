import { describe, expect, it } from "vitest";
import { repairDocLinksByName, rewriteDocLinks, rewriteUuid } from "../scripts/core/doc-links.js";

const resolve = (cls, id) =>
	id === "aaaaaaaaaaaaaaaa" && cls === "Actor" ? "litmv2-converter.bridge-actors" : null;

describe("rewriteDocLinks", () => {
	it("rewrites world-relative links to bridge-pack links", () => {
		expect(rewriteDocLinks("see @UUID[Actor.aaaaaaaaaaaaaaaa]{The Beast}!", resolve)).toBe(
			"see @UUID[Compendium.litmv2-converter.bridge-actors.Actor.aaaaaaaaaaaaaaaa]{The Beast}!",
		);
	});
	it("leaves unresolvable links untouched", () => {
		const text = "@UUID[Actor.bbbbbbbbbbbbbbbb]{Gone} and @UUID[Scene.aaaaaaaaaaaaaaaa]{Map}";
		expect(rewriteDocLinks(text, resolve)).toBe(text);
	});
	it("leaves already-compendium links untouched", () => {
		const text = "@UUID[Compendium.some.pack.Actor.aaaaaaaaaaaaaaaa]{X}";
		expect(rewriteDocLinks(text, resolve)).toBe(text);
	});
	it("handles empty input", () => {
		expect(rewriteDocLinks("", resolve)).toBe("");
		expect(rewriteDocLinks(undefined, resolve)).toBe("");
	});
});

describe("compendium-form links (core book ≥1.2)", () => {
	const resolvePack = (_docClass, id) =>
		id === "AAAAAAAAAAAAAAAA" ? "litmv2-converter.litm-core-book-items" : null;
	const opts = { scopes: ["legend-in-the-mist-core-book"] };

	it("rewrites a source compendium link to the destination pack, preserving tail", () => {
		const s = "@UUID[Compendium.legend-in-the-mist-core-book.litm-core-vignettes.Item.AAAAAAAAAAAAAAAA]{V}";
		expect(rewriteDocLinks(s, resolvePack, opts))
			.toBe("@UUID[Compendium.litmv2-converter.litm-core-book-items.Item.AAAAAAAAAAAAAAAA]{V}");
		const page = "@UUID[Compendium.legend-in-the-mist-core-book.litm-core-vignettes.Item.AAAAAAAAAAAAAAAA.JournalEntryPage.BBBBBBBBBBBBBBBB#anchor]";
		expect(rewriteDocLinks(page, resolvePack, opts))
			.toBe("@UUID[Compendium.litmv2-converter.litm-core-book-items.Item.AAAAAAAAAAAAAAAA.JournalEntryPage.BBBBBBBBBBBBBBBB#anchor]");
	});

	it("leaves other scopes and unknown ids untouched", () => {
		const foreign = "@UUID[Compendium.some-other-module.pack.Item.AAAAAAAAAAAAAAAA]";
		expect(rewriteDocLinks(foreign, resolvePack, opts)).toBe(foreign);
		const unknown = "@UUID[Compendium.legend-in-the-mist-core-book.p.Item.CCCCCCCCCCCCCCCC]";
		expect(rewriteDocLinks(unknown, resolvePack, opts)).toBe(unknown);
	});

	it("rewriteUuid rewrites bare UUID strings and passes everything else through", () => {
		expect(rewriteUuid("Compendium.legend-in-the-mist-core-book.litm-core-vignettes.Item.AAAAAAAAAAAAAAAA", resolvePack, opts))
			.toBe("Compendium.litmv2-converter.litm-core-book-items.Item.AAAAAAAAAAAAAAAA");
		expect(rewriteUuid("Compendium.other.p.Item.AAAAAAAAAAAAAAAA", resolvePack, opts))
			.toBe("Compendium.other.p.Item.AAAAAAAAAAAAAAAA");
		expect(rewriteUuid(null, resolvePack, opts)).toBe(null);
	});
});

describe("rewriteDocLinks with embedded journal pages", () => {
	const resolve2 = (cls, id) =>
		id === "cccccccccccccccc" && cls === "JournalEntry" ? "litmv2-converter.bridge-journals" : null;

	it("rewrites a journal page link, resolving on the top-level doc and keeping the tail verbatim", () => {
		expect(
			rewriteDocLinks(
				"@UUID[JournalEntry.cccccccccccccccc.JournalEntryPage.dddddddddddddddd]{p}",
				resolve2,
			),
		).toBe(
			"@UUID[Compendium.litmv2-converter.bridge-journals.JournalEntry.cccccccccccccccc.JournalEntryPage.dddddddddddddddd]{p}",
		);
	});

	it("leaves an unresolvable journal page link untouched", () => {
		const text = "@UUID[JournalEntry.eeeeeeeeeeeeeeee.JournalEntryPage.ffffffffffffffff]{gone}";
		expect(rewriteDocLinks(text, resolve2)).toBe(text);
	});

	it("rewrites a journal page link with a heading anchor, preserving the anchor", () => {
		expect(
			rewriteDocLinks(
				"@UUID[JournalEntry.cccccccccccccccc.JournalEntryPage.dddddddddddddddd#circumstance]{p}",
				resolve2,
			),
		).toBe(
			"@UUID[Compendium.litmv2-converter.bridge-journals.JournalEntry.cccccccccccccccc.JournalEntryPage.dddddddddddddddd#circumstance]{p}",
		);
	});
});

describe("repairDocLinksByName", () => {
	const repair = (docClass, id, label) =>
		docClass === "Actor" && id === "deaddeaddeaddead" && /^charms/i.test(label)
			? "Compendium.litmv2-converter.litm-hor-items.Item.h7wTV6XT4ztrwOY3"
			: null;

	it("rewrites a labeled dead link to the uuid the resolver supplies, keeping the label", () => {
		expect(repairDocLinksByName("see @UUID[Actor.deaddeaddeaddead]{Charms (Add-on)}!", repair)).toBe(
			"see @UUID[Compendium.litmv2-converter.litm-hor-items.Item.h7wTV6XT4ztrwOY3]{Charms (Add-on)}!",
		);
	});
	it("leaves links the resolver declines untouched", () => {
		const text = "@UUID[Actor.deaddeaddeaddead]{Someone Else} and @UUID[Scene.deaddeaddeaddead]{Charms}";
		expect(repairDocLinksByName(text, repair)).toBe(text);
	});
	it("never touches unlabeled links (no name to match on)", () => {
		const text = "@UUID[Actor.deaddeaddeaddead]";
		expect(repairDocLinksByName(text, repair)).toBe(text);
	});
	it("handles empty input", () => {
		expect(repairDocLinksByName("", repair)).toBe("");
		expect(repairDocLinksByName(undefined, repair)).toBe("");
	});
});
