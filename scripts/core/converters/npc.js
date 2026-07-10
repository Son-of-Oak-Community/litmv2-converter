import { buildActorTagEffects } from "../effect-builders.js";
import { translateMarkup } from "../markup.js";
import { actorTagString, namedFloating } from "../tags.js";
import { clamp, paragraphs, remapSystemAsset, retoken, titleCase } from "../util.js";
import { convertLimits, featureBlocksHtml, secretSectionsHtml } from "./addon.js";
import { vignetteData } from "./vignette.js";

const CHALLENGE_ICON = "icons/svg/mystery-man.svg";

/**
 * Roles can arrive as an array (test fixtures, legacy data) or a plain string
 * (real official Core Book / HoR exports) — normalize either into a display
 * string rather than assuming array shape.
 */
function rolesToCategory(roles) {
	if (Array.isArray(roles)) return roles.filter(Boolean).join(", ");
	if (typeof roles === "string") return roles.trim();
	return "";
}

/**
 * Convert a source `litm-npc` to a litmv2 `challenge` actor.
 * Threats become embedded vignette items; loose tags/statuses become both a
 * tag string and matching effects (both sides required — see Global Constraints).
 * @param {object} source
 * @param {{convertText?: (s: string) => string}} [ctx]
 * @returns {object}
 */
export function convertNpc(source, ctx = {}) {
	const t = ctx.convertText ?? translateMarkup;
	const sys = source.system ?? {};
	const floating = namedFloating(sys);
	// appliedAddons never occurs in the official corpus; if data ever carries
	// them, keep the names visible rather than dropping them silently.
	const addonNote = (sys.appliedAddons ?? []).length
		? `<h4>Addons</h4><p>${(sys.appliedAddons ?? []).map((a) => a?.name ?? String(a)).join(", ")}</p>`
		: "";
	return {
		_id: source._id,
		name: titleCase(source.name),
		type: "challenge",
		img: remapSystemAsset(source.img, CHALLENGE_ICON),
		prototypeToken: retoken(source.prototypeToken, CHALLENGE_ICON),
		folder: source.folder ?? null,
		sort: source.sort ?? 0,
		system: {
			category: rolesToCategory(sys.roles),
			rating: clamp(sys.difficulty ?? 1, 1, 5),
			description: paragraphs([t(sys.shortDescription ?? ""), t(sys.biography ?? "")]) + secretSectionsHtml(sys.secrets, source._id, t),
			might: (sys.mightyAspects ?? []).map((a) => ({
				level: a.level === "greatness" ? "greatness" : "adventure",
				description: a.aspect ?? "",
			})),
			specialFeatures: featureBlocksHtml(sys.specialFeatures ?? [], t) + addonNote,
			limits: convertLimits(sys.limits, t),
			tags: actorTagString(floating),
		},
		items: (sys.threatsAndConsequences ?? []).map((v) =>
			vignetteData({
				name: v.name ?? "",
				threat: t(v.description ?? ""),
				consequences: (v.list ?? []).map((s) => t(s)),
			}),
		),
		effects: buildActorTagEffects(floating),
	};
}
