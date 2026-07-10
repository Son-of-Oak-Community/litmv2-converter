import {
	buildBackpackTagEffects,
	buildThemeTagEffects,
	statusTier,
} from "./effect-builders.js";
import { deterministicId, named } from "./util.js";

/** Attach deterministic _ids so actions can reference these effects by id. */
const withEffectIds = (effects, idSeed) =>
	idSeed == null
		? effects
		: effects.map((e, i) => ({ _id: deterministicId(`${idSeed}:${e.type}:${e.name}:${i}`), ...e }));

/** Named entries of a source doc's `floatingTagsAndStatuses` (challenge/journey/addon). */
export const namedFloating = (sys) => named(sys?.floatingTagsAndStatuses);

const toLegacyTag = (t) => ({
	name: t.name,
	question: t.question ?? null,
	// `planned: true` = a tag the player drafted for a future Improve unlock —
	// named but not yet active. mist-engine's tagFilledAndNotPlanned treats these
	// as inactive; litmv2 models the same via disabled power tags.
	isActive: !t.planned,
	isScratched: !!t.burned,
});

/**
 * Build litmv2 theme effects (power/weakness + title tag) from mist-engine tags.
 * @param {{powerTags: object[], weaknessTags: object[], isFellowship?: boolean, titleTagName: string, idSeed?: string}} args
 * @returns {object[]}
 */
export function themeTagEffectData({
	powerTags,
	weaknessTags,
	isFellowship = false,
	titleTagName,
	idSeed,
}) {
	return withEffectIds(
		buildThemeTagEffects(
			{
				powerTags: named(powerTags).map(toLegacyTag),
				weaknessTags: named(weaknessTags).map(toLegacyTag),
				isFellowship,
			},
			titleTagName ? { name: titleTagName, isScratched: false } : null,
		),
		idSeed,
	);
}

/**
 * Build story_tag effects from mist-engine backpack items.
 * @param {object[]} items
 * @param {string} [idSeed]
 * @returns {object[]}
 */
export function backpackTagEffectData(items, idSeed) {
	return withEffectIds(
		buildBackpackTagEffects(
			// A litmv2 backpack keeps one tag active at a time (you draw one item
			// out); the source data has no per-item active flag, so activate the
			// first named item and leave the rest disabled.
			named(items).map((t, i) => ({
				name: t.name,
				isActive: i === 0,
				isScratched: !!t.burned,
				isSingleUse: false,
			})),
		),
		idSeed,
	);
}

/**
 * Format floatingTagsAndStatuses entries as a litmv2 tag string
 * (the edit-mode representation on challenge/journey sheets).
 * @param {object[]} entries
 * @returns {string}
 */
export function actorTagString(entries) {
	return named(entries)
		.map((e) => {
			if (!e.isStatus) return `[${e.name}]`;
			const tier = statusTier(e);
			return tier >= 1 ? `[${e.name}-${tier}]` : `[${e.name}-]`;
		})
		.join(", ");
}

// Mirrors litmv2's tag-string regex semantics (modules/item/action/tag-string.js):
// [name] story, [name!] single-use, [name-N]/[name-] status, [name:N] limit,
// [-name] weakness. Names cannot contain digits. Limits/weaknesses produce no effect.
const TAG_STRING_RE = /\[(-)?([^\][\d!:]+?)(!)?(?:([-:])(\d)?)?\]/g;

/**
 * Build story/status effects from a litmv2-format bracket tag string.
 * Used for source docs that already carry litmv2-style tag strings (journeys).
 * @param {string} tagsString
 * @returns {object[]}
 */
export function tagStringEffects(tagsString) {
	const out = [];
	for (const [, weakness, rawName, single, sep, value] of (tagsString ?? "").matchAll(TAG_STRING_RE)) {
		const name = rawName.trim();
		if (!name || weakness || sep === ":") continue;
		if (sep === "-") {
			const tier = Number(value ?? 0);
			out.push({
				name,
				type: "status_tag",
				disabled: false,
				system: {
					tiers: [1, 2, 3, 4, 5, 6].map((t) => t === tier),
					isHidden: false,
					limitId: null,
				},
			});
		} else {
			out.push({
				name,
				type: "story_tag",
				disabled: false,
				system: { isScratched: false, isSingleUse: !!single, isHidden: false, limitId: null },
			});
		}
	}
	return out;
}
