import { resolveOutcomeVerb } from "../data/outcome-verbs.js";
import { deterministicId } from "../util.js";

// Heading + optional empty <p>s + the table, as one removable block.
const BLOCK_RE =
	/<h\d[^>]*>\s*Example Actions\s*<\/h\d>\s*(?:<p>\s*<\/p>\s*)*<table class="example-actions-table">[\s\S]*?<\/table>/i;
const CELL_RE = /<td>([\s\S]*?)<\/td>/g;
const P_RE = /<p([^>]*)>([\s\S]*?)<\/p>/g;
const TAG_MARK_RE = /<mark class="tag">([\s\S]*?)<\/mark>/g;
const POWER_MARK_RE = /<mark class="tag power">([\s\S]*?)<\/mark>/;
const STATUS_MARK_RE = /<mark class="tag green">([\s\S]*?)<\/mark>/g;

const strip = (s) => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

// Source docs sometimes double-space tag names (e.g. "Art of  Projection");
// collapse whitespace on both sides of a tag-label match so those still hit.
const nameKey = (s) => (s ?? "").replace(/\s+/g, " ").trim().toLowerCase();

/**
 * Parse one example-action <td> into its parts. Cell grammar (corpus-wide):
 * name in p.black-strong; tag labels in mark.tag; a mark.tag.power badge;
 * everything after the badge is outcome lines. Returns null if any of
 * name/tags/badge is missing (caller treats the whole table as unparseable).
 * @param {string} cellHtml
 */
function parseCell(cellHtml) {
	const out = { name: null, tagLabels: [], badge: null, outcomes: [] };
	let afterBadge = false;
	for (const [, attrs, inner] of cellHtml.matchAll(P_RE)) {
		if (/\bblack-strong\b/.test(attrs)) {
			out.name = strip(inner);
			continue;
		}
		if (afterBadge) {
			if (strip(inner)) out.outcomes.push(inner);
			continue;
		}
		const badge = inner.match(POWER_MARK_RE);
		if (badge) {
			out.badge = strip(badge[1]);
			afterBadge = true;
			continue;
		}
		for (const [, label] of inner.matchAll(TAG_MARK_RE)) out.tagLabels.push(strip(label));
	}
	return out.name && out.tagLabels.length && out.badge ? out : null;
}

/** name (lowercase) → effect _id across all converted items' effects. */
function buildTagIndex(items) {
	const index = new Map();
	for (const item of items ?? [])
		for (const e of item.effects ?? [])
			if (e._id && !index.has(nameKey(e.name))) index.set(nameKey(e.name), e._id);
	return index;
}

/**
 * Outcome <p> inner HTML → success {id, verb, text}; statuses become [name-] tokens.
 * @param {string} html
 * @param {string} seed
 * @param {{heroId: string, actionName: string, log: (msg: string) => void}} ctx
 */
function outcomeToSuccess(html, seed, { heroId, actionName, log }) {
	const statuses = [...html.matchAll(STATUS_MARK_RE)].map(([, s]) => strip(s));
	const text = strip(html.replace(STATUS_MARK_RE, (_, s) => ` [${strip(s)}-] `)).replace(/\s+([,.])/g, "$1");
	const { verb, matched } = resolveOutcomeVerb(text, statuses);
	if (!matched)
		log(`litmv2-converter | ${heroId}: "${actionName}" outcome "${text}" has no verb mapping — defaulting to enhance`);
	return { id: deterministicId(seed), verb, text };
}

/**
 * Build a litmv2 action item creation object from a parsed cell. The cell holds
 * no prose — name, tag suggestions, power badge, and outcomes are all captured
 * in the structured fields below — so `description` is left empty rather than
 * restating the cell's markup.
 * @param {{name: string, tagLabels: string[], badge: string, outcomes: string[]}} cell
 * @param {{heroId: string, tagIndex: Map<string, string>, index: number, log: (msg: string) => void}} ctx
 * @returns {object}
 */
function buildAction(cell, { heroId, tagIndex, index, log }) {
	// Badge is informational (power derives from tags in litmv2); warn only on
	// a clean "POWER <n>" badge that disagrees with the suggested tag count.
	const badgePower = /^POWER\s+(\d+)$/i.exec(cell.badge)?.[1];
	if (badgePower && Number(badgePower) !== cell.tagLabels.length)
		log(`litmv2-converter | ${heroId}: "${cell.name}" badge POWER ${badgePower} ≠ ${cell.tagLabels.length} suggested tags`);
	const positiveTags = cell.tagLabels.map((label) => {
		const tagId = tagIndex.get(nameKey(label)) ?? null;
		if (!tagId) log(`litmv2-converter | ${heroId}: "${cell.name}" suggestion "${label}" matches no tag effect — label-only`);
		return { label, tagId };
	});
	return {
		_id: deterministicId(`${heroId}:action:${index}:${cell.name}`),
		name: cell.name,
		type: "action",
		system: {
			description: "",
			power: { positiveTags, negativeTags: [] },
			successes: cell.outcomes.map((o, k) =>
				outcomeToSuccess(o, `${heroId}:action:${index}:success:${k}`, { heroId, actionName: cell.name, log }),
			),
		},
		effects: [],
	};
}

/**
 * Convert a hero's Example Actions table into embedded litmv2 action items.
 * All-or-nothing per hero: if any cell fails to parse, the description is
 * returned untouched (no silent loss). On success the table + heading are
 * removed and the remaining blurb is wrapped in a blockquote.
 * @param {string} description - translated hero description HTML
 * @param {{heroId: string, items: object[], log?: (msg: string) => void}} ctx
 * @returns {{description: string, actions: object[]}}
 */
export function extractExampleActions(description, { heroId, items, log = console.warn }) {
	const block = description.match(BLOCK_RE)?.[0];
	if (!block) {
		if (/example-actions-table/.test(description))
			log(`litmv2-converter | ${heroId}: example-actions table present but block did not match — left in description`);
		return { description, actions: [] };
	}
	const cells = [...block.matchAll(CELL_RE)].map((m) => m[1]);
	if (!cells.length) {
		log(`litmv2-converter | ${heroId}: example-actions table matched but no <td> cells found — left in description`);
		return { description, actions: [] };
	}
	const parsed = cells.map(parseCell);
	const bad = parsed.findIndex((c) => !c);
	if (bad !== -1) {
		log(`litmv2-converter | ${heroId}: example-action cell ${bad} failed to parse — table left in description`);
		return { description, actions: [] };
	}
	const tagIndex = buildTagIndex(items);
	const actions = parsed.map((cell, index) =>
		buildAction(cell, { heroId, tagIndex, index, log }),
	);
	const rest = description.replace(block, "").replace(/<p>\s*<\/p>/g, "").trim();
	return { description: rest ? `<blockquote>${rest}</blockquote>` : "", actions };
}
