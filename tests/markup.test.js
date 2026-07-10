import { describe, expect, it } from "vitest";
import { translateMarkup } from "../scripts/core/markup.js";

describe("translateMarkup", () => {
	it("returns empty string for null/empty", () => {
		expect(translateMarkup("")).toBe("");
		expect(translateMarkup(null)).toBe("");
		expect(translateMarkup(undefined)).toBe("");
	});

	it("passes plain text through untouched", () => {
		expect(translateMarkup("Just prose.")).toBe("Just prose.");
	});

	it("translates status with tier: [/s wounded-3] -> [wounded-3]", () => {
		expect(translateMarkup("gain [/s wounded-3]")).toBe("gain [wounded-3]");
	});

	it("keeps bare numeric status: [prone-2] -> [prone-2]", () => {
		expect(translateMarkup("[prone-2]")).toBe("[prone-2]");
	});

	it("translates tier-less status: [/s time-passes] -> [time-passes-]", () => {
		expect(translateMarkup("[/s time-passes]")).toBe("[time-passes-]");
	});

	it("translates weakness: [/w cursed] -> [-cursed]", () => {
		expect(translateMarkup("[/w cursed]")).toBe("[-cursed]");
	});

	it("translates limits: [/l harm-5] -> [harm:5], [/l flee] -> [flee:]", () => {
		expect(translateMarkup("[/l harm-5]")).toBe("[harm:5]");
		expect(translateMarkup("[/l flee]")).toBe("[flee:]");
	});

	it("translates might: [/ma huge] -> @might[adventure] huge", () => {
		expect(translateMarkup("[/ma huge]")).toBe("@might[adventure] huge");
		expect(translateMarkup("[/mg vast]")).toBe("@might[greatness] vast");
		expect(translateMarkup("[/mo old]")).toBe("@might[origin] old");
		expect(translateMarkup("[/m plain]")).toBe("@might[adventure] plain");
	});

	it("translates bold: [/b Challenge] -> **Challenge**", () => {
		expect(translateMarkup("[/b Challenge]")).toBe("**Challenge**");
	});

	it("translates /sg (status-give) as a status: [/sg status] -> [status-]", () => {
		expect(translateMarkup("Give or remove a [/sg status]")).toBe(
			"Give or remove a [status-]",
		);
	});

	it("translates /sg with a tier: [/sg consuming-drive-2] -> [consuming-drive-2]", () => {
		expect(translateMarkup("[/sg consuming-drive-2]")).toBe("[consuming-drive-2]");
	});

	it("translates /sr (status-remove) as a status: [/sr wounded-3] -> [wounded-3]", () => {
		expect(translateMarkup("[/sr wounded-3]")).toBe("[wounded-3]");
	});

	it("keeps a plain tag unchanged: [resource] -> [resource]", () => {
		expect(translateMarkup("grab a [resource]")).toBe("grab a [resource]");
	});

	it("tolerates a stray trailing paren: [/s bruised-2)] -> [bruised-2]", () => {
		expect(translateMarkup("([/s bruised-2)]")).toBe("([bruised-2]");
	});

	it("leaves Foundry @-links untouched", () => {
		const link = "See @UUID[Actor.abc]{Bob} now.";
		expect(translateMarkup(link)).toBe(link);
	});

	it("translates multiple tokens in one string", () => {
		expect(translateMarkup("[/s prone-2] and also [/s bruised-2]")).toBe(
			"[prone-2] and also [bruised-2]",
		);
	});
});

describe("emphasized statuses (PDF-extracted journal prose)", () => {
	it("converts an emphasized tiered status to a status token: <em>beguiled-4</em>", () => {
		expect(translateMarkup("<em>beguiled-4</em>")).toBe("[beguiled-4]");
	});

	it("handles <strong>, <i>, <b> the same way", () => {
		expect(translateMarkup("<strong>upset-3</strong>")).toBe("[upset-3]");
		expect(translateMarkup("<i>wounded-2</i>")).toBe("[wounded-2]");
		expect(translateMarkup("<b>slowed-1</b>")).toBe("[slowed-1]");
	});

	it("converts hyphenated multi-word statuses: <em>warded-against-2</em>", () => {
		expect(translateMarkup("<em>warded-against-2</em>")).toBe("[warded-against-2]");
	});

	it("preserves surrounding text and spacing", () => {
		expect(translateMarkup("<p>The victim gains <em>beguiled-4</em> here.</p>")).toBe(
			"<p>The victim gains [beguiled-4] here.</p>",
		);
	});

	it("leaves emphasized prose and titles alone (no tier)", () => {
		expect(translateMarkup("<em>Legend in the Mist</em>")).toBe("<em>Legend in the Mist</em>");
		expect(translateMarkup("<em>pitchforks</em>")).toBe("<em>pitchforks</em>");
		expect(translateMarkup("<em>Vol. I</em>")).toBe("<em>Vol. I</em>");
	});

	it("does not convert emphasis wrapping a whole sentence that contains a status", () => {
		const s = "<em>He was left beguiled-4 by the fey.</em>";
		expect(translateMarkup(s)).toBe(s);
	});

	it("ignores non-status trailing numbers (only tiers 1-6)", () => {
		expect(translateMarkup("<em>chapter-9</em>")).toBe("<em>chapter-9</em>");
	});
});

describe("tokens glued to a preceding word char", () => {
	it("translates a status token immediately preceded by a word char: or[/s  prone-1]", () => {
		expect(translateMarkup("or[/s  prone-1]")).toBe("or[prone-1]");
	});
});

describe("nested brackets inside slash-coded tokens", () => {
	it("collapses a nested bracket in a status name: [/s warded-against-[choose]-2]", () => {
		expect(translateMarkup("gain [/s warded-against-[choose]-2] now")).toBe(
			"gain [warded-against-choose-2] now",
		);
	});

	it("still leaves an unrelated @UUID link untouched", () => {
		const link = "@UUID[Actor.aaaaaaaaaaaaaaaa]{X}";
		expect(translateMarkup(link)).toBe(link);
	});
});

describe("mist-engine <mark> tag markup (PDF-extracted journal prose)", () => {
	it("converts a plain tag mark to a story-tag token", () => {
		expect(translateMarkup('such as <mark class="tag">sharp senses</mark>.')).toBe(
			"such as [sharp senses].",
		);
	});

	it("treats the positive colour variant as a plain tag", () => {
		expect(translateMarkup('<mark class="tag positive">reassure an employer</mark>')).toBe(
			"[reassure an employer]",
		);
	});

	it("treats the green colour variant as a status (green is the status colour)", () => {
		expect(translateMarkup('<mark class="tag green">hopeful</mark>')).toBe("[hopeful-]");
		expect(translateMarkup('<mark class="tag green">wounded-3</mark>')).toBe("[wounded-3]");
	});

	it("converts a weakness mark to a weakness token", () => {
		expect(translateMarkup('<mark class="tag weakness">brittle</mark>')).toBe("[-brittle]");
	});

	it("strips the fa-angles-down chevron icon from a weakness mark's name", () => {
		expect(
			translateMarkup(
				'<mark class="tag weakness"><i class="fa-light fa-angles-down"></i>draws attention</mark>',
			),
		).toBe("[-draws attention]");
	});

	it("treats a down-chevron icon as a weakness even on a plain `tag` mark", () => {
		// mist-engine flags some weaknesses only with the chevron icon, leaving the
		// class as plain `tag`; the icon is the source's weakness marker.
		expect(
			translateMarkup(
				'<mark class="tag"><i class="fa-light fa-angles-down"></i> requires time</mark>',
			),
		).toBe("[-requires time]");
		expect(
			translateMarkup(
				'<mark class="tag"><i class="fa-light fa-angles-down"></i> weaker by daylight</mark>',
			),
		).toBe("[-weaker by daylight]");
	});

	it("uses data-name when a draggable weakness body is icon-only", () => {
		expect(
			translateMarkup(
				'<mark draggable="true" data-type="weakness" data-name="known in Soddenmore" class="draggable weakness"><i class="fa-light fa-angles-down"></i></mark>',
			),
		).toBe("[-known in Soddenmore]");
	});

	it("strips mist-engine decorative icon glyphs baked into mark content", () => {
		// `⚑` (flag) prefixes tags, `🟠` (colour circle) suffixes statuses in the
		// PDF-extracted corpus; litmv2 renders its own chip, so these are junk.
		expect(translateMarkup('<mark class="tag">⚑ slow</mark>')).toBe("[slow]");
		expect(translateMarkup('<mark class="tag green">break-down 🟠</mark>')).toBe("[break-down-]");
		expect(translateMarkup('<mark class="tag green">impact 🟠</mark>')).toBe("[impact-]");
	});

	it("converts a tier-less status mark to a variable-tier status token", () => {
		expect(translateMarkup('<mark class="status">angry</mark>')).toBe("[angry-]");
	});

	it("keeps the tier on a status mark that already has one", () => {
		expect(translateMarkup('<mark class="status">confident-2</mark>')).toBe("[confident-2]");
	});

	it("converts a limit mark to a limit token", () => {
		expect(translateMarkup('<mark class="limit">calcify </mark>')).toBe("[calcify:]");
	});

	it("reads a parenthesised limit value: harm(4) -> [harm:4]", () => {
		expect(translateMarkup('<mark class="limit">harm(4)</mark>')).toBe("[harm:4]");
	});

	it("converts a might-name mark to a might icon token", () => {
		expect(translateMarkup('<mark class="might">Adventure</mark>')).toBe("@might[adventure]");
	});

	it("converts empty might-icon marks to might icon tokens", () => {
		expect(translateMarkup('gain a <mark class="icon-origin"></mark>')).toBe(
			"gain a @might[origin]",
		);
		expect(translateMarkup('<mark class="icon-adventure"></mark>')).toBe("@might[adventure]");
		expect(translateMarkup('<mark class="icon-greatness"></mark>')).toBe("@might[greatness]");
	});

	it("uses data-name for a draggable weakness mark", () => {
		expect(
			translateMarkup(
				'<mark class="draggable weakness" draggable="true" data-type="weakness" data-name="requires time"></mark>',
			),
		).toBe("[-requires time]");
	});

	it("uses the display content for a draggable limit mark", () => {
		expect(
			translateMarkup(
				'<mark class="draggable limit" draggable="true" data-type="limit" data-name="desolate 6" data-value="0">desolate-6</mark>',
			),
		).toBe("[desolate:6]");
	});

	it("converts a bare (classless) mark by its content", () => {
		expect(translateMarkup("<mark>claws</mark>")).toBe("[claws]");
		expect(translateMarkup("<mark>composed-3</mark>")).toBe("[composed-3]");
	});

	it("strips surrounding quotes and trailing punctuation from tag content", () => {
		expect(translateMarkup('<mark class="tag positive">"Coming through!"</mark>')).toBe(
			"[Coming through]",
		);
	});

	it("preserves whitespace inside the mark so the token is not glued to a word", () => {
		expect(translateMarkup('or<mark class="tag"> rehearsed joke</mark>')).toBe(
			"or [rehearsed joke]",
		);
	});

	it("unwraps an empty mark to plain text (no bogus chip)", () => {
		expect(translateMarkup('a scene such as<mark class="status"> </mark>')).toBe(
			"a scene such as ",
		);
	});

	it("unwraps content that cannot be a litmv2 tag to plain text", () => {
		expect(translateMarkup('<mark class="tag power">POWER 2</mark>')).toBe("POWER 2");
		expect(translateMarkup('<mark class="tag">20ft of unbreakable rope</mark>')).toBe(
			"20ft of unbreakable rope",
		);
		expect(translateMarkup('<mark class="tag">CONSEQUENCES (p.160)</mark>')).toBe(
			"CONSEQUENCES (p.160)",
		);
	});

	it("strips the chevron icon even when unwrapping an unrepresentable weakness", () => {
		// A `[choose]` placeholder makes the weakness un-tokenizable, so it unwraps
		// to prose — but the decorative chevron must not survive into that prose.
		expect(
			translateMarkup(
				'<mark class="tag weakness"><i class="fa-light fa-angles-down"></i>cursed [choose]</mark>',
			),
		).toBe("cursed [choose]");
	});

	it("converts every tag in a Bestow-style sentence (the reported bug)", () => {
		const src =
			'<p><strong>Bestow</strong>, by giving yourself or an ally new abilities using tags, such as <mark class="tag">sharp senses</mark>, <mark class="tag">basic spear training</mark>, or <mark class="tag">spell of lightning bolt</mark></p>';
		expect(translateMarkup(src)).toBe(
			"<p><strong>Bestow</strong>, by giving yourself or an ally new abilities using tags, such as [sharp senses], [basic spear training], or [spell of lightning bolt]</p>",
		);
	});
});

describe("corpus code variants", () => {
	it("treats /sp /sn /so as statuses like /s", () => {
		expect(translateMarkup("[/sp driven-mad]")).toBe("[driven-mad-]");
		expect(translateMarkup("[/sn slowed-2]")).toBe("[slowed-2]");
		expect(translateMarkup("[/so out-cold]")).toBe("[out-cold-]");
	});
	it("renders /t as a plain tag", () => {
		expect(translateMarkup("[/t sharp blade]")).toBe("[sharp blade]");
	});
	it("renders /n as a limit reference", () => {
		expect(translateMarkup("[/n bind-or-banish]")).toBe("[bind-or-banish:]");
	});
});

// The decorative-glyph / icon stripping is scoped to <mark> content only. These
// guards fail loudly if that scrub is ever moved to the global text path, where
// it would eat legitimate prose symbols (lore-chain arrows, journey-table icons).
describe("bare prose symbols survive (strip is mark-scoped)", () => {
	it("leaves a lore-chain arrow untouched", () => {
		expect(translateMarkup("Lore: A → B → C")).toBe("Lore: A → B → C");
	});
	it("leaves a bare colour circle untouched", () => {
		expect(translateMarkup("a 🟠 dot outside a mark")).toBe("a 🟠 dot outside a mark");
	});
	it("leaves a bare chevron icon element untouched", () => {
		expect(translateMarkup('an <i class="fa-angles-down"></i> outside a mark')).toBe(
			'an <i class="fa-angles-down"></i> outside a mark',
		);
	});
});
