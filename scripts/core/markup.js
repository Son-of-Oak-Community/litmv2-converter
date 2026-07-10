const MIGHT_LEVEL = { ma: "adventure", m: "adventure", mg: "greatness", mo: "origin" };
const MIGHT_NAMES = ["origin", "adventure", "greatness"];

// Full-string mirror of litmv2's CONFIG.litmv2.tagStringRe (system config.js).
// A candidate `[token]` is only emitted if the litmv2 tag enricher would
// actually match it; otherwise the mark is unwrapped to plain text. Tag names
// cannot contain digits, brackets, braces or `!`, which is what rejects the
// unrepresentable corpus junk (`[POWER 2]`, `[20ft of rope]`, nested `[choose]`).
const LITM_TAG_RE = /^\[([^^\d[\]{}!]+?)(!)?(?:([-:])(\d+)?)?\]$/i;

/**
 * Translate mist-engine-fvtt inline markup to litmv2 enricher syntax.
 * Foundry document links (`@Doc[...]{...}`) are left untouched.
 * @param {string} text
 * @returns {string}
 */
export function translateMarkup(text) {
	if (!text) return "";
	// Pre-pass: mist-engine wraps tags/statuses/limits/weaknesses in `<mark>`
	// elements (`<mark class="tag">sharp senses</mark>`). litmv2 has no styling
	// for these, so they render as the browser-default yellow highlight. Rewrite
	// them to litmv2 bracket markup so the tag enricher renders proper chips.
	text = convertMarks(text);
	// Pre-pass: PDF-extracted journal prose italicizes tiered statuses (e.g.
	// `<em>beguiled-4</em>`) instead of using tag brackets, so they render as
	// plain emphasis rather than status chips. Rewrite an emphasis element whose
	// entire content is a tiered status (name + `-<tier 1-6>`) to a status token.
	// Deliberately conservative: only the unambiguous tier suffix is converted —
	// plain-word emphasis (titles, ordinary italics) is left untouched.
	text = text.replace(
		/<(em|i|strong|b)>\s*([A-Za-z][A-Za-z' -]*?-[1-6])\s*<\/\1>/g,
		"[$2]",
	);
	// Pre-pass: collapse one level of brackets nested inside a slash-coded
	// token, e.g. `[/s warded-against-[choose]-2]` -> `[/s warded-against-choose-2]`,
	// so the main pass below can translate it as a single status token.
	text = text.replace(/\[(\/[a-z]+\s[^\][]*)\[([^\][]*)\]([^\][]*)\]/g, "[$1$2$3]");
	// Rewrite single-bracket tokens. The negative lookbehind skips Foundry
	// document links and our own `@might[...]` output (any "@word[" glued
	// together), while still matching tokens glued to an ordinary word char
	// like `or[/s prone-1]` and adjacent tokens like `[a][b]`.
	return text.replace(/(?<!@[A-Za-z]*)\[([^\][]*)\]/g, (_m, inner) =>
		translateToken(inner),
	);
}

function translateToken(raw) {
	// Strip stray trailing punctuation the source data leaves inside brackets.
	const body = raw.replace(/[)\s]+$/, "").trim();

	// Prefix tokens: might (/ma /mg /mo /m), statuses (/s and any /s* variant:
	// sg=give, sr=remove, sp/sn/so appear in the corpus as authored variants —
	// mist-engine's own renderer matches them all by "/s" substring), /w /l /b,
	// /t (plain tag), /n (reference to a named limit).
	const m = body.match(/^\/(ma|mg|mo|m|s[a-z]*|w|l|b|n|t)\s+(.*)$/);
	if (m) {
		const [, kind, restRaw] = m;
		const rest = restRaw.trim();
		if (kind === "b") return `**${rest}**`;
		if (kind in MIGHT_LEVEL) return `@might[${MIGHT_LEVEL[kind]}] ${rest}`;
		if (kind === "w") return `[-${rest}]`;
		if (kind === "l" || kind === "n") return `[${toLimit(rest)}]`;
		if (kind === "t") return `[${rest}]`;
		if (kind.startsWith("s")) return `[${toStatus(rest)}]`;
	}
	// Bare token: numeric suffix -> status, otherwise plain tag (unchanged).
	return `[${body}]`;
}

/** "flee" -> "flee:" ; "harm-5" -> "harm:5" ; "harm(4)" -> "harm:4" */
function toLimit(rest) {
	const m = rest.match(/^(.*?)[\s(-]+(\d+)\)?$/);
	return m ? `${m[1].trim()}:${m[2]}` : `${rest.replace(/[\s()]+$/, "")}:`;
}

/** "time-passes" -> "time-passes-" ; "wounded-3" -> "wounded-3" */
function toStatus(rest) {
	return /-\d+$/.test(rest) ? rest : `${rest}-`;
}

/**
 * Rewrite mist-engine `<mark>` tag markup to litmv2 bracket tokens. Each mark's
 * semantic class picks the token shape; the built token is only emitted if
 * litmv2's tag enricher would render it (see {@link LITM_TAG_RE}). Anything that
 * cannot be represented (digits mid-name, nested `[choose]` placeholders, POWER
 * references) is unwrapped to its plain text so no stray yellow highlight is
 * left behind. Whitespace inside the mark is preserved around the emitted token
 * so a mark glued to a preceding word (`or<mark> loyal thrall</mark>`) does not
 * produce an un-enrichable `or[loyal thrall]`.
 */
function convertMarks(text) {
	return text.replace(/<mark\b([^>]*)>([\s\S]*?)<\/mark>/gi, (_m, attrs, innerRaw) => {
		const token = markToToken(attrs, innerRaw);
		// Unrepresentable content (nested `[choose]` placeholders, POWER refs) is
		// unwrapped to plain text — but still strip mist-engine's decorative icons
		// so a stray chevron or status glyph never renders raw in the prose.
		if (token == null) return innerRaw.replace(/<[^>]+>/g, "").replace(DECORATIVE_ICON_RE, "");
		// Keep leading whitespace so a mark glued to a preceding word does not
		// yield an un-enrichable `or[token]`; the token ends in `]`, so trailing
		// whitespace inside the mark is redundant and dropped.
		const lead = innerRaw.match(/^\s*/)[0];
		return `${lead}${token}`;
	});
}

// mist-engine's visual weakness marker: a Font Awesome double-down-chevron icon
// (`<i class="…fa-angles-down">`) prefixing the name. It carries the weakness
// semantics that the `weakness` class also does — but the corpus has ~15 weaknesses
// that only carry the icon (class stays plain `tag`), so keying off the class alone
// silently downgrades them to story tags. There is no up-chevron counterpart, so
// the down-chevron is an unambiguous weakness signal.
const WEAKNESS_ICON_RE = /fa-angles-down\b/i;

/** @returns {string|null} the litmv2 token, or null to unwrap the mark to text. */
function markToToken(attrs, innerRaw) {
	const classAttr = attrs.match(/class\s*=\s*"([^"]*)"/i)?.[1] ?? "";
	const classes = new Set(classAttr.toLowerCase().split(/\s+/).filter(Boolean));

	// Might icons carry no text content; the level is encoded in the class.
	for (const k of MIGHT_NAMES) if (classes.has(`icon-${k}`)) return `@might[${k}]`;

	// Detect the weakness chevron on the raw content before cleanName strips it.
	const isWeakness = classes.has("weakness") || WEAKNESS_ICON_RE.test(innerRaw);

	// cleanName strips nested icon elements and decorative glyphs to the bare name.
	const inner = cleanName(innerRaw);
	if (classes.has("might") && MIGHT_NAMES.includes(inner.toLowerCase()))
		return `@might[${inner.toLowerCase()}]`;

	// Draggable marks (character-sheet tags) may carry only the icon in the body
	// and the name in data-name; fall back to data-name when the body cleans empty.
	const dataName = attrs.match(/data-name\s*=\s*"([^"]*)"/i)?.[1] ?? "";
	const name = inner || cleanName(dataName);
	if (!name) return null;

	// `green` is mist-engine's status colour (`positive` is a plain tag colour),
	// so a `tag green` mark is a status.
	let candidate;
	if (isWeakness) candidate = `[-${name}]`;
	else if (classes.has("limit")) candidate = `[${toLimit(name)}]`;
	else if (classes.has("status") || classes.has("green")) candidate = `[${toStatus(name)}]`;
	else candidate = `[${name}]`;
	return LITM_TAG_RE.test(candidate) ? candidate : null;
}

// Decorative icons mist-engine bakes into <mark> bodies that are not part of the
// tag name: colour-coded status circles and tag flags (unicode), plus Font Awesome
// chevron elements (`<i class="…fa-angles-down">` on weaknesses). Stripping them
// leaves the litmv2 chip showing only the name. Safe to strip broadly here — cleanName
// only ever sees <mark> content, never the bare prose where these symbols also occur
// (lore-chain arrows, journey-table icons, challenge-tier badges).
const DECORATIVE_ICON_RE = /[⚐⚑⚪⚫\u{1F534}\u{1F535}\u{1F7E0}-\u{1F7E4}]/gu;

/** Strip nested HTML, decorative glyphs, surrounding quotes and trailing punctuation. */
function cleanName(s) {
	return (s ?? "")
		.replace(/<[^>]+>/g, " ")
		.replace(DECORATIVE_ICON_RE, " ")
		.replace(/\s+/g, " ")
		.trim()
		.replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
		.replace(/[!?.,;:]+$/, "")
		.trim();
}
