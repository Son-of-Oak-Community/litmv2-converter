import { normalizeKitName, THEMEKIT_INDEX } from "../data/themekit-index.js";
import { buildThemeTagEffects } from "../effect-builders.js";
import { translateMarkup } from "../markup.js";
import { levelIcon, named, titleCase } from "../util.js";

/**
 * Convert a source `themekit` to a litmv2 `theme` item (a theme kit: a theme
 * with prewritten tags to choose from — tags ship disabled, title tag enabled).
 * Tier/themebook resolution: generated index → folder hints → themekit_type → origin.
 * @param {object} source
 * @param {{convertText?: (s: string) => string, kitHints?: (source: object) => {level?: string, themebook?: string}}} [ctx]
 * @returns {object}
 */
export function convertThemekit(source, ctx = {}) {
	const t = ctx.convertText ?? translateMarkup;
	const sys = source.system ?? {};
	const hints = ctx.kitHints?.(source) ?? {};
	const indexed = THEMEKIT_INDEX[normalizeKitName(source.name)];
	const level = indexed?.level ?? hints.level ?? "origin";
	const themebook = indexed?.themebook ?? hints.themebook ?? (sys.themekit_type ? titleCase(sys.themekit_type) : "");

	const powertags = named(sys.powertags);
	const titleIsFirst = powertags[0] && powertags[0].name.trim() === (source.name ?? "").trim();
	const bodyTags = titleIsFirst ? powertags.slice(1) : powertags;
	const asTemplate = (tag) => ({ name: tag.name, isActive: false, isScratched: false });
	const effects = buildThemeTagEffects(
		{
			powerTags: bodyTags.map(asTemplate),
			weaknessTags: named(sys.weaknesstags).map(asTemplate),
			isFellowship: false,
		},
		{ name: source.name, isScratched: false },
	);

	return {
		_id: source._id,
		name: source.name,
		type: "theme",
		img: levelIcon(level),
		folder: source.folder ?? null,
		system: {
			description: t(sys.description ?? ""),
			themebook,
			level,
			improve: { value: 0 },
			quest: {
				description: t(sys.quest ?? ""),
				tracks: { abandon: { value: 0 }, milestone: { value: 0 } },
			},
			specialImprovements: (sys.specialImprovements ?? [])
				.filter((s) => (s?.name ?? "").trim())
				.map((s) => ({ name: s.name, description: t(s.description ?? ""), isActive: !!s.active })),
		},
		effects,
	};
}
