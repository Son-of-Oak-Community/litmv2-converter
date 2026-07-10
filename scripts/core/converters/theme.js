import { translateMarkup } from "../markup.js";
import { themeTagEffectData } from "../tags.js";
import { resolveThemeLevel } from "../theme-levels.js";
import { clamp, levelIcon, named } from "../util.js";

/** Collect tags from either the array shape or the indexed shape. */
function collectTags(sys, base, count) {
	if (Array.isArray(sys[`${base}s`]) && sys[`${base}s`].length)
		return sys[`${base}s`];
	const out = [];
	for (let i = 1; i <= count; i++) if (sys[`${base}${i}`]) out.push(sys[`${base}${i}`]);
	return out;
}

/**
 * Convert a source embedded `themebook` (a character's theme) to a litmv2 `theme`.
 * @param {object} source - mist-engine themebook item data
 * @returns {object} litmv2 theme creation data
 */
export function convertEmbeddedTheme(source) {
	const sys = source.system ?? {};
	const powerTags = named(collectTags(sys, "powertag", 10));
	const weaknessTags = collectTags(sys, "weaknesstag", 4);
	// Embedded hero themes store the theme TITLE as the first power tag and the
	// themebook/category as the item name (standalone kits are the other way
	// around — see convertThemekit's titleIsFirst). Promote the first named tag
	// to the litmv2 title tag. Corpus-verified: no hero title tag is burned, so
	// the title's burned flag needs no representation here.
	const [titleTag, ...bodyTags] = powerTags;
	const titleTagName = titleTag?.name ?? source.name;
	const effects = themeTagEffectData({
		powerTags: bodyTags,
		weaknessTags,
		titleTagName,
		idSeed: source._id,
	});
	const specialImprovements = (sys.specialImprovements ?? [])
		.filter((s) => (s?.name ?? "").trim())
		.map((s) => ({
			name: s.name,
			description: translateMarkup(s.description ?? ""),
			isActive: !!s.active,
		}));
	const level = resolveThemeLevel(sys.type ?? sys.themekit_type ?? source.name);
	return {
		_id: source._id,
		name: titleTagName,
		type: "theme",
		// The theme icon reflects its might level (litmv2's own convention —
		// see levelIcon in the system). The mist-engine source.img is a generic
		// themebook glyph and would carry over as the wrong icon.
		img: levelIcon(level),
		system: {
			themebook: source.name,
			// mist puts the theme prose in `story`; `description` is a fallback
			// (empty in the corpus, but kept for source docs that use it instead).
			description: translateMarkup(sys.story || sys.description || ""),
			level,
			improve: { value: clamp(sys.improve, 0, 3) },
			quest: {
				description: translateMarkup(sys.quest ?? ""),
				tracks: {
					abandon: { value: clamp(sys.abandon, 0, 3) },
					milestone: { value: clamp(sys.milestone, 0, 3) },
				},
			},
			specialImprovements,
		},
		effects,
	};
}
