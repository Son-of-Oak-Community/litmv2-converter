import {
	anchorBlocks, letterBoxQuestions, listAfterHeading, sliceBetween, strip,
} from "../journal-source.js";
import { deterministicId, levelIcon, normalizeThemebookName, paragraphs, titleCase } from "../util.js";

/** Envisioning tags: the theme-description line, split on '+' or '*', title-cased. */
function envisioningTags(blockHtml) {
	const m = (blockHtml ?? "").match(/<p class="theme-description[^"]*">([\s\S]*?)<\/p>/i);
	if (!m) return [];
	return strip(m[1])
		.split(/\s*[+*]\s*/)
		.map((t) => titleCase(t.trim()))
		.filter(Boolean);
}

/** Map of normalized themebook name → { envisioningTags, questIdeas } from the "Themebooks" page. */
export function parseThemebookIndex(pageHtml) {
	const out = {};
	for (const block of Object.values(anchorBlocks(pageHtml ?? ""))) {
		const name = strip((block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/) ?? [])[1] ?? "");
		if (!name) continue;
		out[normalizeThemebookName(name)] = {
			envisioningTags: envisioningTags(block),
			questIdeas: listAfterHeading(block, "Quest Ideas"),
		};
	}
	return out;
}

/** The Fellowship themebook doc, synthesized from the "Fellowship Creation" page, or null. */
export function parseFellowshipThemebook(pageHtml) {
	const block = sliceBetween(pageHtml ?? "", /data-anchor="fellowship"/i, /<h3[^>]*>\s*Themekits\s*<\/h3>/i);
	if (!block) return null;

	const power = sliceBetween(block, /Power Tag Questions/i, /Weakness Tag Questions/i);
	const weakness = sliceBetween(block, /Weakness Tag Questions/i, /Quest Ideas/i);
	const might = strip((block.match(/<strong>\s*Fellowship Might:\s*<\/strong>([\s\S]*?)<\/p>/i) ?? [])[1] ?? "");
	const conceptSection = sliceBetween(block, /Fellowship Might/i, /Power Tag Questions/i);
	const conceptQuestions = [...conceptSection.matchAll(/<li>([\s\S]*?)<\/li>/g)].map(([, li]) => strip(li));
	const improvementsSection = sliceBetween(block, /Special Improvements\s*<\/h3>/i, null);
	const specialImprovements = [...improvementsSection.matchAll(/<p><strong>([^<:]+):<\/strong>([\s\S]*?)<\/p>/g)].map(
		([, name, desc]) => ({ name: name.trim(), description: strip(desc) }),
	);

	const description = paragraphs([
		might ? `Fellowship Might: ${might}` : "",
		...conceptQuestions.map((q) => `• ${q}`),
	]);

	return {
		_id: deterministicId("themebook:the-fellowship"),
		name: "The Fellowship",
		type: "themebook",
		img: levelIcon("variable"),
		folder: null,
		system: {
			theme_level: "variable",
			isFellowship: true,
			description,
			envisioningTags: envisioningTags(block),
			powerTagQuestions: letterBoxQuestions(power),
			weaknessTagQuestions: letterBoxQuestions(weakness),
			questIdeas: listAfterHeading(block, "Quest Ideas"),
			specialImprovements,
		},
		effects: [],
	};
}
