import { describe, expect, it } from "vitest";
import { convertStoryThemeActor, STORY_THEMES_FOLDER_ID, storyThemesFolder } from "../scripts/core/converters/story-theme-actor.js";

const source = {
	_id: "st1st1st1st1st1s",
	name: "Friendly Badger",
	type: "themebook",
	folder: "if1if1if1if1if1i",
	sort: 700,
	system: {
		options: { isStoryTheme: true },
		description: "<p>A helpful badger.</p>",
		powertags: [{ name: "keen nose" }, { name: "burrowing" }],
		weaknesstags: [{ name: "easily distracted" }],
	},
};

describe("convertStoryThemeActor", () => {
	const out = convertStoryThemeActor(source);

	it("wraps the story-theme item in a vessel actor carrying the source id", () => {
		expect(out.type).toBe("story_theme");
		expect(out._id).toBe("st1st1st1st1st1s");
		expect(out.name).toBe("Friendly Badger");
		expect(out.system).toEqual({});
		expect(out.effects).toEqual([]);
		expect(out.sort).toBe(700);
	});

	it("embeds exactly one story_theme item with a deterministic reversed id and no folder", () => {
		expect(out.items).toHaveLength(1);
		const item = out.items[0];
		expect(item.type).toBe("story_theme");
		expect(item._id).toBe("s1ts1ts1ts1ts1ts");
		expect(item.folder).toBeUndefined();
		expect(item.system.description).toBe("<p>A helpful badger.</p>");
		expect(item.effects.length).toBeGreaterThan(0);
	});

	it("makes a scene-ready token: linked, friendly, named, textured with the item img", () => {
		expect(out.img).toBe("systems/litmv2/assets/media/icons/origin.svg");
		expect(out.prototypeToken).toEqual({
			name: "Friendly Badger",
			actorLink: true,
			disposition: 1,
			texture: { src: "systems/litmv2/assets/media/icons/origin.svg" },
		});
	});

	it("sits in the synthesized Story Themes folder", () => {
		expect(out.folder).toBe(STORY_THEMES_FOLDER_ID);
		expect(STORY_THEMES_FOLDER_ID).toHaveLength(16);
		expect(storyThemesFolder()).toEqual({
			_id: STORY_THEMES_FOLDER_ID, type: "Actor", name: "Story Themes", folder: null,
			color: null, sorting: "a", sort: 0, description: "", flags: {},
		});
	});
});
