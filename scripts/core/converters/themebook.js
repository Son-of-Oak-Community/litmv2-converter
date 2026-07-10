import { buildThemeTagEffects } from "../effect-builders.js";
import { translateMarkup } from "../markup.js";
import { levelIcon, named, normalizeThemebookName } from "../util.js";

/**
 * Collect the guiding questions for a themebook's tag slots from either the
 * array shape (`powertags[]`) or the indexed shape (`powertag1`..`powertagN`),
 * as a fixed-length array padded with "" (litmv2's themebook schema keeps a
 * fixed slot count).
 */
function collectQuestions(sys, base, count) {
	const arr =
		Array.isArray(sys[`${base}s`]) && sys[`${base}s`].length
			? sys[`${base}s`]
			: Array.from({ length: count }, (_, i) => sys[`${base}${i + 1}`]);
	return Array.from({ length: count }, (_, i) => (arr[i]?.question ?? "").trim());
}

/**
 * Convert a standalone source `themebook` item. Two very different animals
 * share that source type: story themes (options.isStoryTheme — concrete
 * equipment-style tags) and actual themebooks (litm-<level> tier, prose
 * description carrying the envisioning questions).
 * @param {object} source
 * @param {{convertText?: (s: string) => string, themebookFields?: Record<string, {envisioningTags?: string[], questIdeas?: string[]}>}} [ctx]
 * @returns {object}
 */
export function convertThemebookItem(source, ctx = {}) {
	return source.system?.options?.isStoryTheme
		? convertStoryTheme(source, ctx)
		: convertThemebook(source, ctx);
}

function convertStoryTheme(source, ctx) {
	const t = ctx.convertText ?? translateMarkup;
	const sys = source.system ?? {};
	const concrete = (tag) => ({ name: tag.name, isActive: true, isScratched: !!tag.burned });
	return {
		_id: source._id,
		name: source.name,
		type: "story_theme",
		img: levelIcon("origin"),
		folder: source.folder ?? null,
		system: {
			description: t(sys.description ?? ""),
			level: "origin",
			isScratched: false,
		},
		effects: buildThemeTagEffects(
			{
				powerTags: named(sys.powertags).map(concrete),
				weaknessTags: named(sys.weaknesstags).map(concrete),
				isFellowship: false,
			},
			{ name: source.name, isScratched: false },
		),
	};
}

function convertThemebook(source, ctx) {
	const t = ctx.convertText ?? translateMarkup;
	const sys = source.system ?? {};
	const level = (sys.type ?? "").replace(/^litm-/, "") || "origin";
	// Envisioning tags and quest ideas are printed in the rulebook but absent from the
	// mist-engine source data — synthesized from the owned "Themebooks" journal page and
	// supplied via ctx (see themebook-fields.js / assemble-handoff.js).
	const extra = ctx.themebookFields?.[normalizeThemebookName(source.name)] ?? {};
	return {
		_id: source._id,
		name: source.name,
		type: "themebook",
		img: levelIcon(level),
		folder: source.folder ?? null,
		system: {
			theme_level: level,
			isFellowship: false,
			description: t(sys.description ?? ""),
			envisioningTags: extra.envisioningTags ?? [],
			// Tag questions live in the source per-tag slots (powertagN.question).
			powerTagQuestions: collectQuestions(sys, "powertag", 10),
			weaknessTagQuestions: collectQuestions(sys, "weaknesstag", 4),
			questIdeas: extra.questIdeas ?? [],
			specialImprovements: (sys.specialImprovements ?? [])
				.filter((s) => (s?.name ?? "").trim())
				.map((s) => ({ name: s.name, description: t(s.description ?? "") })),
		},
		effects: [],
	};
}
