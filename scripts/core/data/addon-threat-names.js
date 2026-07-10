// Short threat "verbs" for the Core Book challenge add-ons.
//
// A mist-engine challenge threat is `{ name, description, list }` where `name`
// is a short verb (e.g. "Ambush") and `description` is the threat sentence — the
// way NPC and Hearts of Ravendale addon threats are authored. The six Core Book
// challenge-addons are the lone exception: their threat entries put the whole
// SENTENCE in `name` and leave `description` empty, so the verb was never
// captured in machine-readable form.
//
// The verbs exist only in the printed rulebook's "Challenge Add-ons" section —
// they are NOT in the module's journal or source docs, so they cannot be
// synthesized at runtime the way tropes/themebooks are. This table therefore
// ships them, but ONLY the verbs: short factual titles, the same grey/minor
// copyright tier as the kit names in themekit-index.js. The threat SENTENCE is
// never baked here — it stays in the consumer's owned source data and is matched
// by position at runtime (see converter-distribution-model in project memory).
//
// Verbs are positional: index N is the verb for the addon's Nth threat entry.
// The Core Book addons have all-empty-`description` threats, so positions align
// 1:1 with the source `threatsAndConsequences` array. Out-of-range or
// uncatalogued entries degrade to a blank banner label (the sentence is still
// preserved as the threat text regardless).
const ADDON_THREAT_VERBS = {
	Desperate: ["Entrench", "Flee", "Dare"],
	Ethereal: ["Apparate"],
	"Fiery, Frozen, or Thunderous": ["Radiate", "Project"],
	Mounted: ["Storm", "Pursue"],
	Mysterious: ["Stand Out", "Enveil"],
};

/**
 * Recover the short threat verb for a Core Book addon threat stored in name-only
 * form. Returns "" when the addon or position is not catalogued.
 * @param {string} addonName - raw source addon name (e.g. "Mounted")
 * @param {number} index - position of the threat within the addon's threatsAndConsequences
 * @returns {string}
 */
export function lookupAddonThreatName(addonName, index) {
	return ADDON_THREAT_VERBS[addonName]?.[index] ?? "";
}
