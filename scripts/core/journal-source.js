const TAG_RE = /<[^>]+>/g;
const MARK_RE = /<mark class="([^"]*)">([\s\S]*?)<\/mark>/g;
const ENT = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " " };

export function decodeEntities(s) {
	return (s ?? "").replace(/&amp;|&lt;|&gt;|&quot;|&#39;|&nbsp;/g, (m) => ENT[m]);
}

export function strip(html) {
	return decodeEntities((html ?? "").replace(TAG_RE, "")).replace(/\s+/g, " ").trim();
}

/**
 * HTML of the first text journal page whose name matches, or null.
 * @param {object} adventureData
 * @param {string|((name: string) => boolean)} matcher
 */
export function findPageHtml(adventureData, matcher) {
	const match =
		typeof matcher === "function" ? matcher : (n) => n.toLowerCase() === String(matcher).toLowerCase();
	for (const j of adventureData?.journal ?? [])
		for (const p of j.pages ?? [])
			if (p.type === "text" && match((p.name ?? "").trim())) return p.text?.content ?? null;
	return null;
}

export function marks(html) {
	return [...(html ?? "").matchAll(MARK_RE)].map(([, cls, inner]) => ({ cls: cls.trim(), text: strip(inner) }));
}

/** slug → HTML slice from each `data-anchor` heading to the next (or end). */
export function anchorBlocks(html) {
	const src = html ?? "";
	const hits = [...src.matchAll(/<h[1-6][^>]*\bdata-anchor="([^"]+)"[^>]*>/g)];
	const out = {};
	for (let i = 0; i < hits.length; i++) {
		const end = i + 1 < hits.length ? hits[i + 1].index : src.length;
		out[hits[i][1]] = src.slice(hits[i].index, end);
	}
	return out;
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** `<li>` texts of the first `<ul>` immediately following a heading with the given text. */
export function listAfterHeading(html, heading) {
	const re = new RegExp(`<h[1-6][^>]*>\\s*${escapeRe(heading)}\\s*</h[1-6]>\\s*<ul>([\\s\\S]*?)</ul>`, "i");
	const m = (html ?? "").match(re);
	return m ? [...m[1].matchAll(/<li>([\s\S]*?)<\/li>/g)].map(([, li]) => strip(li)) : [];
}

/** Substring from the first `startRe` match up to the next `endRe` match (or end). */
export function sliceBetween(html, startRe, endRe) {
	const src = html ?? "";
	const a = src.search(startRe);
	if (a < 0) return "";
	const rest = src.slice(a);
	if (!endRe) return rest;
	const b = rest.slice(1).search(endRe);
	return b < 0 ? rest : rest.slice(0, b + 1);
}

/** Text after each `<span class="letter-box">…</span>` up to `</p>`. */
export function letterBoxQuestions(sectionHtml) {
	return [...(sectionHtml ?? "").matchAll(/<span class="letter-box">[^<]*<\/span>([\s\S]*?)<\/p>/g)].map(
		([, q]) => strip(q),
	);
}
