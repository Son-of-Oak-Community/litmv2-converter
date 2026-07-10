import { buildActorTagEffects } from "../effect-builders.js";
import { translateMarkup } from "../markup.js";
import { actorTagString, namedFloating, tagStringEffects } from "../tags.js";
import { paragraphs, retoken, titleCase } from "../util.js";
import { convertShortChallenge } from "./vignette.js";

const GC_RE = /^general consequences$/i;

/**
 * Convert a source `litm-journey` to a litmv2 `journey` actor.
 * @param {object} source
 * @param {{convertText?: (s: string) => string}} [ctx]
 * @returns {object}
 */
export function convertJourney(source, ctx = {}) {
	const t = ctx.convertText ?? translateMarkup;
	const sys = source.system ?? {};
	const name = titleCase(source.name);
	const floating = namedFloating(sys);

	let generalConsequences = "";
	const items = (source.items ?? [])
		.filter((i) => i.type === "shortchallenge")
		.map((i) => {
			const isGC = GC_RE.test((i.name ?? "").trim());
			if (isGC) generalConsequences = i._id;
			return convertShortChallenge(i, ctx, {
				isConsequenceOnly: isGC,
				name: isGC ? `${name} General Consequences` : undefined,
			});
		});

	// Translate the source tags string once: mist markup (e.g. `[/s mysterious-2]`)
	// can appear inside it, and copying it verbatim would also poison
	// tagStringEffects below (creating a bogus story tag literally named "/s mysterious").
	const sourceTags = t(sys.tags ?? "");
	const tags = [sourceTags, actorTagString(floating)].filter(Boolean).join(", ");

	return {
		_id: source._id,
		name,
		type: "journey",
		img: source.img,
		prototypeToken: retoken(source.prototypeToken, source.img ?? "icons/svg/mystery-man.svg"),
		folder: source.folder ?? null,
		sort: source.sort ?? 0,
		system: {
			category: (sys.role ?? "").replace(/^journey\s*-\s*/i, "").trim(),
			description: paragraphs([t(sys.shortDescription ?? ""), t(sys.notes ?? ""), t(sys.biography ?? "")]),
			tags,
			generalConsequences,
		},
		items,
		effects: [...tagStringEffects(sourceTags), ...buildActorTagEffects(floating)],
	};
}
