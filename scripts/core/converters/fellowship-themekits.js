import { buildThemeTagEffects } from "../effect-builders.js";
import { marks, sliceBetween, strip } from "../journal-source.js";
import { deterministicId, levelIcon } from "../util.js";
import { normalizeKitName, THEMEKIT_INDEX } from "../data/themekit-index.js";

/** theme items for the 6 Fellowship themekits on the "Fellowship Creation" page (0 if absent). */
export function parseFellowshipThemekits(pageHtml) {
	const section = sliceBetween(pageHtml ?? "", /<h3[^>]*>\s*Themekits\s*<\/h3>/i, null);
	if (!section) return [];
	const out = [];
	// Split on themekit-title so each box is bounded regardless of nested div counts.
	const titles = [...section.matchAll(/<div class="themekit-title">\s*<p>([\s\S]*?)<\/p>/g)];
	for (let i = 0; i < titles.length; i++) {
		const start = titles[i].index;
		const end = i + 1 < titles.length ? titles[i + 1].index : section.length;
		const box = section.slice(start, end);
		const name = strip(titles[i][1]);
		const power = marks(sliceBetween(box, /class="powertags"/, /class="(weaknesstags|line|quest)"/))
			.filter((m) => m.cls.includes("positive"))
			.map((m) => m.text);
		const weakness = marks(sliceBetween(box, /class="weaknesstags"/, /class="(line|quest)"/))
			.filter((m) => m.cls.includes("weakness"))
			.map((m) => m.text);
		const quest = strip((box.match(/<div class="quest">\s*<p>([\s\S]*?)<\/p>/) ?? [])[1] ?? "");
		out.push(buildFellowshipKit({ name, power, weakness, quest }));
	}
	return out;
}

function buildFellowshipKit({ name, power, weakness, quest }) {
	const level = THEMEKIT_INDEX[normalizeKitName(name)]?.level ?? "origin";
	const asTemplate = (n) => ({ name: n, isActive: false, isScratched: false });
	return {
		_id: deterministicId(`themekit:fellowship:${name}`),
		name,
		type: "theme",
		img: levelIcon(level),
		folder: null,
		system: {
			description: "",
			themebook: "The Fellowship",
			level,
			improve: { value: 0 },
			quest: { description: quest, tracks: { abandon: { value: 0 }, milestone: { value: 0 } } },
			specialImprovements: [],
		},
		effects: buildThemeTagEffects(
			{ powerTags: power.map(asTemplate), weaknessTags: weakness.map(asTemplate), isFellowship: false },
			{ name, isScratched: false },
		),
	};
}
