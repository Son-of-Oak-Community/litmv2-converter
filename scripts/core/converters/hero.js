import { translateMarkup } from "../markup.js";
import { clamp } from "../util.js";
import { convertBackpack } from "./backpack.js";
import { convertEmbeddedTheme } from "./theme.js";
import { extractExampleActions } from "./hero-actions.js";

export const ITEM_CONVERTERS = {
	themebook: convertEmbeddedTheme,
	backpack: convertBackpack,
};

const HOW_TO_PLAY_RE = /<h\d[^>]*>\s*Taking Actions\s*<\/h\d>/i;

/**
 * The source heroes' notes end with a generic how-to-play rules recap
 * (Taking Actions / Reactions / Hero Development — boilerplate shared by all
 * 20 heroes) that reads badly on a litmv2 hero sheet. Cut it; keep the
 * hero-specific Example Actions. Deliberate no-silent-loss exception:
 * the dropped text is rulebook boilerplate, not character content.
 */
function trimHowToPlay(notes) {
	const s = notes ?? "";
	const at = s.search(HOW_TO_PLAY_RE);
	return at < 0 ? s : s.slice(0, at);
}

// Raw (untranslated) description. Example-action extraction parses the
// mist-engine `<mark>` table grammar, so it must run BEFORE translateMarkup
// rewrites those marks to litmv2 bracket tokens; the leftover blurb is
// translated afterwards (see convertHero).
function buildDescription(sys) {
	const parts = [sys.biography, trimHowToPlay(sys.notes)]
		.map((s) => (s ?? "").trim())
		.filter(Boolean);
	return parts.join("\n");
}

/**
 * Convert a source `litm-character` to a litmv2 `hero`.
 * Unknown embedded item types are skipped.
 * @param {object} source - mist-engine character actor data
 * @returns {object} litmv2 hero creation data
 */
export function convertHero(source) {
	const sys = source.system ?? {};
	const items = (source.items ?? [])
		.map((it) => ITEM_CONVERTERS[it.type]?.(it))
		.filter(Boolean);
	const { description: rest, actions } = extractExampleActions(buildDescription(sys), {
		heroId: source._id,
		items,
	});
	return {
		_id: source._id,
		name: source.name,
		type: "hero",
		img: source.img,
		prototypeToken: source.prototypeToken ?? {},
		system: {
			description: translateMarkup(rest),
			promise: clamp(sys.promises, 0, 5),
		},
		items: [...items, ...actions],
		effects: [],
	};
}
