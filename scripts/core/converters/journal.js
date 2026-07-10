import { translateMarkup } from "../markup.js";

const publicOwnership = (ownership, fallback) => ({ default: ownership?.default ?? fallback });

// litmv2's custom JournalEntry sheet (parchment/serif rulebook styling).
// Namespace.ClassName as registered by the litmv2 system.
const JOURNAL_SHEET_CLASS = "litmv2.LitmJournalSheet";

/**
 * Convert a source JournalEntry: text pages run through the text pipeline
 * (markup + link rewrite); per-user ownership entries (source-world user ids)
 * are stripped down to the default level.
 * @param {object} source
 * @param {{convertText?: (s: string) => string}} [ctx]
 * @returns {object}
 */
export function convertJournal(source, ctx = {}) {
	const t = ctx.convertText ?? translateMarkup;
	return {
		_id: source._id,
		name: source.name,
		folder: source.folder ?? null,
		sort: source.sort ?? 0,
		ownership: publicOwnership(source.ownership, 0),
		// Opt each converted journal into litmv2's rulebook journal sheet rather
		// than flipping it on as the world default (which would restyle every
		// journal in the user's world).
		flags: { core: { sheetClass: JOURNAL_SHEET_CLASS } },
		pages: (source.pages ?? []).map((p) => {
			const page = { ...p, ownership: publicOwnership(p.ownership, -1) };
			if (p.type === "text") page.text = { ...p.text, content: t(p.text?.content ?? "") };
			return page;
		}),
	};
}
