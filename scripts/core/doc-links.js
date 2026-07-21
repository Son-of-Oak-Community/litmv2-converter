const COMPENDIUM_LINK_RE =
	/@UUID\[Compendium\.([\w-]+)\.([\w-]+)\.([A-Za-z]+)\.([A-Za-z0-9]{16})((?:\.[A-Za-z]+\.[A-Za-z0-9]{16})*(?:#[^\]]+)?)\]/g;

/**
 * Rewrite source document links to compendium links at their converted
 * destination. Two source link forms exist: world-relative
 * `@UUID[<DocClass>.<id>]` (the original single-Adventure modules) and
 * compendium-scoped `@UUID[Compendium.<module>.<pack>...]` (Core Book ≥1.2's
 * typed packs). Document _ids survive conversion, so pointing the same id at
 * the destination pack keeps every cross-reference working. Compendium-form
 * links are only re-homed when their module scope is listed in
 * `options.scopes` (the source module being converted) — links into anything
 * else, and links whose target the resolver doesn't know, are left untouched.
 * Links may carry an embedded tail (e.g. `.JournalEntryPage.<id>`) and an
 * optional heading anchor (e.g. `#circumstance`); resolution keys on the
 * top-level (docClass, id) and the tail is copied verbatim.
 * @param {string} text
 * @param {(docClass: string, id: string) => string|null} resolvePack
 *   Returns the destination pack collection (e.g. "litmv2-converter.bridge-actors") or null.
 * @param {{scopes?: string[]}} [options] - source module ids whose compendium links rewrite
 * @returns {string}
 */
export function rewriteDocLinks(text, resolvePack, { scopes = [] } = {}) {
	if (!text) return "";
	let out = text.replace(
		/@UUID\[([A-Za-z]+)\.([A-Za-z0-9]{16})((?:\.[A-Za-z]+\.[A-Za-z0-9]{16})*(?:#[^\]]+)?)\]/g,
		(match, docClass, id, tail) => {
			const pack = resolvePack(docClass, id);
			return pack ? `@UUID[Compendium.${pack}.${docClass}.${id}${tail}]` : match;
		},
	);
	if (scopes.length) {
		const scopeSet = new Set(scopes);
		out = out.replace(COMPENDIUM_LINK_RE, (match, scope, _srcPack, docClass, id, tail) => {
			if (!scopeSet.has(scope)) return match;
			const pack = resolvePack(docClass, id);
			return pack ? `@UUID[Compendium.${pack}.${docClass}.${id}${tail}]` : match;
		});
	}
	return out;
}

/**
 * Rewrite a bare compendium UUID string (e.g. a RollTable result's
 * `documentUuid`) to its converted destination; anything unresolvable or
 * outside the given scopes is returned unchanged.
 * @param {string|null|undefined} uuid
 * @param {(docClass: string, id: string) => string|null} resolvePack
 * @param {{scopes?: string[]}} [options]
 * @returns {string|null}
 */
export function rewriteUuid(uuid, resolvePack, { scopes = [] } = {}) {
	const m = /^Compendium\.([\w-]+)\.([\w-]+)\.([A-Za-z]+)\.([A-Za-z0-9]{16})$/.exec(uuid ?? "");
	if (!m || !scopes.includes(m[1])) return uuid ?? null;
	const pack = resolvePack(m[3], m[4]);
	return pack ? `Compendium.${pack}.${m[3]}.${m[4]}` : uuid;
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
