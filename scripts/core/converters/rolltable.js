import { translateMarkup } from "../markup.js";
import { remapSystemAsset } from "../util.js";

/**
 * Convert a source RollTable (Core Book oracle tables) to destination
 * creation data. RollTables are core documents, so this is mostly a
 * passthrough: text runs through the text pipeline, document-type results
 * get their target UUID re-homed to the converted pack, and source-world
 * bookkeeping (flags/_stats/ownership, drawn state) is dropped.
 * @param {object} source
 * @param {{convertText?: (s: string) => string, convertUuid?: (u: string) => string}} [ctx]
 * @returns {object}
 */
export function convertRollTable(source, ctx = {}) {
	const t = ctx.convertText ?? translateMarkup;
	const cu = ctx.convertUuid ?? ((u) => u);
	return {
		_id: source._id,
		name: source.name,
		img: remapSystemAsset(source.img, "icons/svg/d20-grey.svg"),
		description: t(source.description ?? ""),
		formula: source.formula ?? "",
		replacement: source.replacement ?? true,
		displayRoll: source.displayRoll ?? true,
		folder: source.folder ?? null,
		sort: source.sort ?? 0,
		results: (source.results ?? []).map((r) => {
			const result = {
				_id: r._id,
				type: r.type,
				name: r.name ?? "",
				description: t(r.description ?? ""),
				weight: r.weight ?? 1,
				range: r.range ?? [],
				drawn: false,
			};
			if (r.documentUuid) result.documentUuid = cu(r.documentUuid);
			return result;
		}),
	};
}
