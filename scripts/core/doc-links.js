/**
 * Rewrite world-relative @UUID[<DocClass>.<id>] links to compendium links.
 * The source adventures were authored with world-scope links; since document
 * _ids survive conversion, pointing the same id at the destination pack keeps
 * every cross-reference working. Links whose target the resolver doesn't know
 * (or that are already compendium-scoped) are left untouched. Links may also
 * carry an embedded tail (e.g. `.JournalEntryPage.<id>` on a journal page
 * link) and an optional heading anchor (e.g. `#circumstance`); resolution keys
 * on the top-level (docClass, id) and the tail are copied into the rewritten
 * link verbatim.
 * @param {string} text
 * @param {(docClass: string, id: string) => string|null} resolvePack
 *   Returns the destination pack collection (e.g. "litmv2-converter.bridge-actors") or null.
 * @returns {string}
 */
export function rewriteDocLinks(text, resolvePack) {
	if (!text) return "";
	return text.replace(
		/@UUID\[([A-Za-z]+)\.([A-Za-z0-9]{16})((?:\.[A-Za-z]+\.[A-Za-z0-9]{16})*(?:#[^\]]+)?)\]/g,
		(match, docClass, id, tail) => {
			const pack = resolvePack(docClass, id);
			return pack ? `@UUID[Compendium.${pack}.${docClass}.${id}${tail}]` : match;
		},
	);
}

/**
 * Repair labeled world-relative links by name: for each `@UUID[<DocClass>.<id>]{Label}`
 * the resolver is asked for a replacement UUID; when it returns one, the whole
 * reference is rewritten to it (label kept verbatim). Used for links whose ids
 * are broken in the source data itself but whose labels identify a converted
 * document unambiguously. Unlabeled links carry no name to match on and are
 * never touched; nor are links the resolver declines (returns null).
 * @param {string} text
 * @param {(docClass: string, id: string, label: string) => string|null} resolveLink
 *   Returns a full replacement UUID (e.g. "Compendium.<scope>.<pack>.Item.<id>") or null.
 * @returns {string}
 */
export function repairDocLinksByName(text, resolveLink) {
	if (!text) return "";
	return text.replace(
		/@UUID\[([A-Za-z]+)\.([A-Za-z0-9]{16})\]\{([^}]+)\}/g,
		(match, docClass, id, label) => {
			const uuid = resolveLink(docClass, id, label);
			return uuid ? `@UUID[${uuid}]{${label}}` : match;
		},
	);
}
