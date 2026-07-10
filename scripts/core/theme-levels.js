// litmv2's theme_levels map (mirrored from litmv2 modules/system/config.js).
// Embedded — not imported — so this module is self-contained in a mist-engine
// world where the litmv2 system is not loaded. Keep in sync with litmv2 if its
// theme tiers ever change.
export const THEME_LEVELS = {
	origin: [
		"circumstance",
		"past",
		"devotion",
		"mystery",
		"people",
		"possessions",
		"personality",
		"trade-or-skill",
		"trait",
		"hedge-magic",
	],
	adventure: ["prodigious-skill", "duty", "relic", "uncanny-being", "thaumaturgy"],
	greatness: ["rulership", "destiny", "mastery", "monstrosity", "grand-thaumaturgy"],
};

/** The default (first) theme level key. */
export function getDefaultThemeLevel() {
	return Object.keys(THEME_LEVELS)[0];
}

/**
 * Resolve a litmv2 theme level from a source category hint.
 * @param {string} hint - e.g. "DUTY", "litm-adventure", a themebook name
 * @returns {string} a theme level key
 */
export function resolveThemeLevel(hint) {
	const slug = String(hint ?? "")
		.toLowerCase()
		.replace(/^litm-/, "")
		.trim();
	if (slug in THEME_LEVELS) return slug;
	for (const [level, categories] of Object.entries(THEME_LEVELS)) {
		if (categories.some((c) => c.toLowerCase() === slug)) return level;
	}
	return getDefaultThemeLevel();
}
