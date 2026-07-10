import { translateMarkup } from "../markup.js";
import { litmIcon, titleCase } from "../util.js";

const VIGNETTE_ICON = litmIcon("consequences.svg");

/**
 * Build litmv2 vignette item data. Text is expected pre-converted.
 * @param {{_id?: string, name: string, threat: string, consequences: string[], isConsequenceOnly?: boolean, folder?: string|null}} args
 * @returns {object}
 */
export function vignetteData({ _id, name, threat, consequences, isConsequenceOnly = false, folder }) {
	const data = {
		name: titleCase(name),
		type: "vignette",
		img: VIGNETTE_ICON,
		system: { threat, consequences, isConsequenceOnly },
	};
	if (_id) data._id = _id;
	if (folder !== undefined) data.folder = folder;
	return data;
}

/**
 * Convert a source `shortchallenge` item to a litmv2 `vignette`.
 * @param {object} source - mist-engine shortchallenge item data
 * @param {{convertText?: (s: string) => string}} [ctx]
 * @param {{isConsequenceOnly?: boolean, name?: string}} [opts]
 * @returns {object}
 */
export function convertShortChallenge(source, ctx = {}, opts = {}) {
	const t = ctx.convertText ?? translateMarkup;
	const sys = source.system ?? {};
	return vignetteData({
		_id: source._id,
		name: opts.name ?? source.name,
		threat: t(sys.shortDescription || sys.description || ""),
		consequences: (sys.list ?? []).map((s) => t(s)),
		isConsequenceOnly: opts.isConsequenceOnly ?? false,
		folder: source.folder ?? null,
	});
}
