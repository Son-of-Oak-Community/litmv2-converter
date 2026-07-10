// Success-verb mapping for hero example-action outcome lines.
// Verbs must exist in litmv2's SUCCESS_VERBS (modules/item/action/verb-definitions.js):
// attack, disrupt, influence, weaken, bestow, create, enhance, restore,
// advance, setBack, lessen, quick, discover, extraFeat.

/** Leading outcome word (lowercase) → verb. */
export const LEADING_VERBS = {
	lessen: "lessen",
	discover: "discover",
	quick: "quick",
	create: "create",
	advance: "advance",
	remove: "restore",
	gain: "enhance",
};

/**
 * "Give <status>" verb by status (lowercase). Curated from the corpus:
 * harm lands on the opponent (attack), social sways an NPC (influence),
 * buffs help yourself or allies (enhance).
 */
export const GIVE_STATUS_VERBS = {
	// harm → attack
	wounded: "attack", terrified: "attack", paralyzed: "attack",
	broken: "attack", stunned: "attack", sticky: "attack",
	"weak spot": "attack", hobbled: "attack", wet: "attack",
	cold: "attack", "bolt-stricken": "attack", restrained: "attack",
	prone: "attack", tangled: "attack", threatened: "attack",
	banished: "attack", "laid-to-rest": "attack",
	// social → influence
	friendly: "influence", convinced: "influence", happy: "influence",
	intoxicated: "influence", inspired: "influence", compliant: "influence",
	charmed: "influence", amused: "influence", distracted: "influence",
	disheartened: "influence",
	// buffs → enhance
	shielded: "enhance", warded: "enhance", heartened: "enhance",
	encouraged: "enhance", confident: "enhance",
};

export const FALLBACK_VERB = "enhance";

/**
 * Resolve an outcome line to a litmv2 success verb, reporting whether the
 * corpus tables actually matched. `matched` is false only when the fallback
 * fired: an unrecognized leading word, or a "give" line whose statuses are
 * all absent from GIVE_STATUS_VERBS. A leading word that legitimately maps
 * to "enhance" (e.g. "gain") still counts as matched — matched tracks table
 * hits, not the resulting verb.
 * @param {string} text - plain-text outcome line (statuses may be [name-] tokens)
 * @param {string[]} [statuses] - status names found in the line, in order
 * @returns {{verb: string, matched: boolean}}
 */
export function resolveOutcomeVerb(text, statuses = []) {
	const lead = (/^[A-Za-z]+/.exec(text ?? "")?.[0] ?? "").toLowerCase();
	if (lead === "give") {
		for (const s of statuses) {
			const verb = GIVE_STATUS_VERBS[s.toLowerCase()];
			if (verb) return { verb, matched: true };
		}
		return { verb: FALLBACK_VERB, matched: false };
	}
	const verb = LEADING_VERBS[lead];
	return verb ? { verb, matched: true } : { verb: FALLBACK_VERB, matched: false };
}

/**
 * Resolve an outcome line to a litmv2 success verb.
 * @param {string} text - plain-text outcome line (statuses may be [name-] tokens)
 * @param {string[]} [statuses] - status names found in the line, in order
 * @returns {string}
 */
export function outcomeVerb(text, statuses = []) {
	return resolveOutcomeVerb(text, statuses).verb;
}
