import { describe, expect, it } from "vitest";
import {
	anchorBlocks, decodeEntities, findPageHtml, letterBoxQuestions,
	listAfterHeading, marks, sliceBetween, strip,
} from "../scripts/core/journal-source.js";

describe("journal-source helpers", () => {
	it("strip removes tags, decodes entities, collapses whitespace", () => {
		expect(strip("<p>Hex &amp;   Curse</p>")).toBe("Hex & Curse");
	});
	it("decodeEntities handles the common set", () => {
		expect(decodeEntities("a &amp; b &lt;c&gt; &quot;d&quot; &#39;e&#39;")).toBe(`a & b <c> "d" 'e'`);
	});
	it("findPageHtml matches a text page by name (case-insensitive)", () => {
		const adv = { journal: [{ pages: [
			{ type: "text", name: "Themebooks", text: { content: "<p>X</p>" } },
			{ type: "text", name: "Other", text: { content: "<p>Y</p>" } },
		] }] };
		expect(findPageHtml(adv, "themebooks")).toBe("<p>X</p>");
		expect(findPageHtml(adv, (n) => n === "Missing")).toBeNull();
	});
	it("marks returns class + stripped inner for each mark", () => {
		expect(marks(`<mark class="tag positive">a</mark><mark class="tag">b &amp; c</mark>`)).toEqual([
			{ cls: "tag positive", text: "a" },
			{ cls: "tag", text: "b & c" },
		]);
	});
	it("anchorBlocks slices from each data-anchor heading to the next", () => {
		const html = `<h2 data-anchor="a">A</h2><p>1</p><h2 data-anchor="b">B</h2><p>2</p>`;
		const b = anchorBlocks(html);
		expect(Object.keys(b)).toEqual(["a", "b"]);
		expect(b.a).toContain("<p>1</p>");
		expect(b.a).not.toContain("<p>2</p>");
	});
	it("listAfterHeading returns li texts of the ul after a heading", () => {
		const html = `<h3 class="with-line">Quest Ideas</h3><ul><li><p>One.</p></li><li><p>Two.</p></li></ul>`;
		expect(listAfterHeading(html, "Quest Ideas")).toEqual(["One.", "Two."]);
	});
	it("sliceBetween returns the span between two patterns", () => {
		expect(sliceBetween("aa<b/>xx<c/>yy", /<b\/>/, /<c\/>/)).toBe("<b/>xx");
	});
	it("letterBoxQuestions returns the text after each letter-box span", () => {
		const html = `<p><span class="letter-box">A</span><strong>First?</strong></p><p><span class="letter-box">B</span>Second?</p>`;
		expect(letterBoxQuestions(html)).toEqual(["First?", "Second?"]);
	});
});
