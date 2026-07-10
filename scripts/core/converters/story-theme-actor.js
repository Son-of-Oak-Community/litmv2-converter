import { convertThemebookItem } from "./themebook.js";

// Synthesized Actor folder grouping all story-theme vessel actors (16-char id;
// deterministic so reimports are stable; per-collection, so the same id in the
// core-book pack and the HoR adventure never collides).
export const STORY_THEMES_FOLDER_ID = "storyThemeFolder";

export function storyThemesFolder() {
	return {
		_id: STORY_THEMES_FOLDER_ID, type: "Actor", name: "Story Themes", folder: null,
		color: null, sorting: "a", sort: 0, description: "", flags: {},
	};
}

const reverseId = (id) => id.split("").reverse().join("");

/**
 * Wrap a source story theme (themebook with options.isStoryTheme) in a litmv2
 * `story_theme` vessel actor — a schema-less actor embedding one story_theme
 * item, so the theme can be dropped on a scene and played like an NPC.
 * The actor takes the source _id (it is now the top-level document); the
 * embedded item's id is the source id reversed (deterministic, unique within
 * the parent). Token: linked (companion state persists across scenes) and
 * friendly (story themes are player-side assets).
 * @param {object} source - mist-engine themebook item with options.isStoryTheme
 * @param {{convertText?: (s: string) => string}} [ctx]
 * @returns {object} litmv2 story_theme actor creation data
 */
export function convertStoryThemeActor(source, ctx = {}) {
	const { folder: _folder, ...item } = convertThemebookItem(source, ctx);
	item._id = reverseId(source._id);
	return {
		_id: source._id,
		name: item.name,
		type: "story_theme",
		img: item.img,
		folder: STORY_THEMES_FOLDER_ID,
		sort: source.sort ?? 0,
		prototypeToken: {
			name: item.name,
			actorLink: true,
			disposition: 1,
			texture: { src: item.img },
		},
		system: {},
		items: [item],
		effects: [],
	};
}
