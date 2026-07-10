import { translateMarkup } from "../markup.js";
import { lookupAddonThreatName } from "../data/addon-threat-names.js";
import { actorTagString, namedFloating } from "../tags.js";
import { clamp, litmIcon, paragraphs, titleCase } from "../util.js";

/** Shared by challenge + addon converters: mist limits → litmv2 limit rows (id omitted; schema fills it). */
export function convertLimits(limits, t) {
	return (limits ?? [])
		.filter((l) => (l?.name ?? "").trim())
		.map((l) => ({
			label: titleCase(l.name),
			outcome: t(l.consequence ?? ""),
			max: clamp(parseInt(l.value, 10) || 0, 0, 9),
			value: 0,
		}));
}

/** Shared: named {name, description} blocks → one HTML string. */
export function featureBlocksHtml(blocks, t) {
	return (blocks ?? [])
		.filter((b) => (b?.name ?? "").trim() || (b?.description ?? "").trim())
		.map((b) => `<h4>${titleCase(b.name ?? "")}</h4><p>${t(b.description ?? "")}</p>`)
		.join("");
}

/**
 * Mist `secrets` become Foundry secret sections appended to `description` —
 * litmv2 sheets render these with a per-secret GM reveal toggle, so they stay
 * hidden from players until revealed (unlike specialFeatures, where they used
 * to be folded). Ids are deterministic (parent doc id + index) so reimports
 * don't churn documents.
 */
export function secretSectionsHtml(secrets, parentId, t) {
	return (secrets ?? [])
		.filter((s) => (s?.name ?? "").trim() || (s?.description ?? "").trim())
		.map((s, i) => `<section class="secret" id="secret-${parentId}${i}"><h4>${titleCase(s.name ?? "")}</h4><p>${t(s.description ?? "")}</p></section>`)
		.join("");
}

/**
 * Convert a source `challenge-addon` to a litmv2 `addon` item.
 * @param {object} source
 * @param {{convertText?: (s: string) => string}} [ctx]
 * @returns {object}
 */
export function convertAddon(source, ctx = {}) {
	const t = ctx.convertText ?? translateMarkup;
	const sys = source.system ?? {};
	const floating = namedFloating(sys);
	return {
		_id: source._id,
		name: titleCase(source.name),
		type: "addon",
		img: litmIcon("rating.svg"),
		folder: source.folder ?? null,
		system: {
			ratingBonus: clamp(sys.ratingIncrease, 0, 5),
			categories: (sys.roles ?? []).filter(Boolean),
			description: paragraphs(t(sys.description ?? "").split(/\n{2,}/)) + secretSectionsHtml(sys.secrets, source._id, t),
			specialFeatures: featureBlocksHtml(sys.specialFeatures, t),
			tags: actorTagString(floating),
			limits: convertLimits(sys.limits, t),
			might: [],
			// Standard threat shape (NPCs, HoR addons): `name` is the verb, `description`
			// the sentence. Core Book addons instead put the sentence in `name` with an
			// empty `description` — detect that and recover the verb from the rulebook
			// table, promoting the sentence to `threat` (blank verb if uncatalogued).
			threats: (sys.threatsAndConsequences ?? []).map((v, i) => {
				const hasDescription = (v.description ?? "").trim() !== "";
				const name = hasDescription ? (v.name ?? "") : lookupAddonThreatName(source.name, i);
				const threat = hasDescription ? (v.description ?? "") : (v.name ?? "");
				return {
					name: titleCase(name),
					threat: t(threat),
					consequences: (v.list ?? []).map((s) => t(s)),
					isConsequenceOnly: false,
				};
			}),
		},
	};
}
