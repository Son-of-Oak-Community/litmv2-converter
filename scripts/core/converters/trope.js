import { marks, sliceBetween, strip } from "../journal-source.js";
import { deterministicId, levelIcon } from "../util.js";

const padTo3 = (arr) => [0, 1, 2].map((i) => arr[i] ?? "");

const kitNames = (listHtml) => marks(listHtml).filter((m) => m.cls === "tag").map((m) => m.text);

/** Lowercase, collapse non-alphanumeric runs to a single hyphen, trim leading/trailing hyphens. */
const slugify = (name) =>
	(name ?? "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");

/** Parse every `.trope` block on a Tropes journal page. */
export function parseTropes(pageHtml) {
	const src = pageHtml ?? "";
	const out = [];
	// Each wrapper carries one category via <span class="trope-type">Tropes</span>Category.
	const wrappers = [...src.matchAll(/<div class="tropes-wrapper">/g)];
	for (let w = 0; w < wrappers.length; w++) {
		const wEnd = w + 1 < wrappers.length ? wrappers[w + 1].index : src.length;
		const wrapper = src.slice(wrappers[w].index, wEnd);
		const category = strip(
			(wrapper.match(/<span class="trope-type">[\s\S]*?<\/span>([\s\S]*?)<\/h1>/) ?? [])[1] ?? "",
		);
		const blocks = [...wrapper.matchAll(/<div class="trope">/g)];
		for (let i = 0; i < blocks.length; i++) {
			const end = i + 1 < blocks.length ? blocks[i + 1].index : wrapper.length;
			const block = wrapper.slice(blocks[i].index, end);
			const head = block.match(/<h2 class="trope-title"(?:\s+data-anchor="([^"]+)")?>([\s\S]*?)<\/h2>/);
			if (!head) continue;
			const name = strip(head[2]);
			out.push({
				category,
				anchor: head[1] ?? slugify(name),
				name,
				description: strip((block.match(/<p class="trope-body">([\s\S]*?)<\/p>/) ?? [])[1] ?? ""),
				fixed: kitNames(sliceBetween(block, /class="kit-list"/, /<\/ul>/)),
				optional: kitNames(sliceBetween(block, /class="choose-list"/, /<\/ul>/)),
				backpack: kitNames(sliceBetween(block, /class="backpack-items"/, /<\/p>/)),
			});
		}
	}
	return out;
}

/**
 * Convert one parsed trope to a litmv2 `trope` item.
 * @param {ReturnType<typeof parseTropes>[number]} parsed
 * @param {{resolveKitUuid?: (kitName: string) => string|null}} [ctx]
 */
export function convertTrope(parsed, ctx = {}) {
	const resolve = (name) => (name ? (ctx.resolveKitUuid?.(name) ?? name) : "");
	return {
		// Seed includes `category`, not just anchor/name: the two HoR trope pages
		// (Dalish + Uncanny) merge into one destination pack (litm-hor-tropes),
		// and anchors are only unique per-page, so two tropes across those pages
		// could otherwise share a slugified anchor and collide on _id (silently
		// overwriting one trope on import, since import keeps the id).
		_id: deterministicId(`trope:${parsed.category}:${parsed.anchor || parsed.name}`),
		name: parsed.name,
		type: "trope",
		img: levelIcon("origin"),
		folder: null,
		system: {
			category: parsed.category ?? "",
			description: parsed.description ?? "",
			themeKits: {
				fixed: padTo3(parsed.fixed.map(resolve)),
				optional: padTo3(parsed.optional.map(resolve)),
			},
			backpackChoices: parsed.backpack ?? [],
		},
	};
}
