import { FALLBACK_VERB, STRONG_VERBS } from "../data/outcome-verbs.js";
import { translateMarkup } from "../markup.js";
import { deterministicId, named, remapSystemAsset } from "../util.js";

const P_RE = /<p[^>]*>([\s\S]*?)<\/p>/g;
const LI_RE = /<li[^>]*>([\s\S]*?)<\/li>/g;
const EXTRA_FEATS_RE = /<p[^>]*>\s*<strong>\s*EXTRA\s+FEATS\s*<\/strong>\s*<\/p>/i;

/** Token-convert marks, strip remaining HTML, collapse whitespace. */
const clean = (html, t) => t(html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

/** Plain text content of an HTML fragment (for structural-drift checks). */
const plainText = (html) => (html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

/**
 * Parse a rote's `success` HTML: verb-headed paragraphs → successes, the
 * trailing EXTRA FEATS list → extraFeats. Rote successes name their verb in a
 * leading `<strong>` (corpus-verified across all five rotes), so the verb is
 * read directly rather than inferred from prose. A non-empty block that parses
 * to nothing aborts the export — silent content loss would otherwise hide a
 * source-structure change (same policy as the trope/themebook page parsers).
 * @param {string} html
 * @param {string} seedBase
 * @param {(s: string) => string} t
 * @param {(msg: string) => void} log
 * @param {string} label - rote name for error messages
 */
function parseSuccesses(html, seedBase, t, log, label) {
	const src = html ?? "";
	const split = src.search(EXTRA_FEATS_RE);
	const head = split === -1 ? src : src.slice(0, split);
	const tail = split === -1 ? "" : src.slice(split);
	const successes = [];
	for (const [, inner] of head.matchAll(P_RE)) {
		const m = inner.match(/^\s*<strong>([^<]+)<\/strong>\s*([\s\S]*)$/);
		if (!m) continue;
		const verb = STRONG_VERBS[m[1].trim().toLowerCase()];
		if (!verb) log(`litmv2-converter | rote success verb "${m[1].trim()}" has no mapping — defaulting to ${FALLBACK_VERB}`);
		successes.push({
			id: deterministicId(`${seedBase}:success:${successes.length}`),
			verb: verb ?? FALLBACK_VERB,
			text: clean(m[2], t),
		});
	}
	if (plainText(head) && !successes.length)
		throw new Error(`Rote "${label}": success block present but no verb-headed paragraphs parsed — source structure changed.`);
	const extraFeats = [...tail.matchAll(LI_RE)].map(([, li]) => clean(li, t));
	if (split !== -1 && !extraFeats.length)
		throw new Error(`Rote "${label}": EXTRA FEATS header present but no list items parsed — source structure changed.`);
	return { successes, extraFeats };
}

/**
 * Convert a source `rote` item to a litmv2 `action` item (category "rote" —
 * litmv2's action model was designed with rotes as a first-class category).
 * Power/weakness tags become label-only suggestions: pack actions have no
 * owning hero whose tag effects a tagId could reference.
 * @param {object} source - mist-engine rote item data
 * @param {{convertText?: (s: string) => string, log?: (msg: string) => void}} [ctx]
 * @returns {object}
 */
export function convertRote(source, ctx = {}) {
	const t = ctx.convertText ?? translateMarkup;
	const log = ctx.log ?? console.warn;
	const sys = source.system ?? {};
	const suggestion = (tag) => ({ label: tag.name, tagId: null });
	const { successes, extraFeats } = parseSuccesses(sys.success ?? "", `rote:${source._id}`, t, log, source.name);
	const consequences = [...(sys.consequences ?? "").matchAll(LI_RE)].map(([, li]) => clean(li, t));
	if (plainText(sys.consequences) && !consequences.length)
		throw new Error(`Rote "${source.name}": consequences present but no list items parsed — source structure changed.`);
	return {
		_id: source._id,
		name: source.name,
		type: "action",
		img: remapSystemAsset(source.img, "icons/svg/book.svg"),
		folder: source.folder ?? null,
		system: {
			description: t(sys.description ?? ""),
			practitioners: sys.practitioners ?? "",
			category: "rote",
			power: {
				positiveTags: named(sys.powertags).map(suggestion),
				negativeTags: named(sys.weaknesstags).map(suggestion),
			},
			successes,
			extraFeats,
			consequences,
		},
		effects: [],
	};
}
