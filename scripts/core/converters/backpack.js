import { backpackTagEffectData } from "../tags.js";

/**
 * Convert a source `backpack` item to a litmv2 `backpack`.
 * @param {object} source - mist-engine backpack item data
 * @returns {object} litmv2 backpack creation data
 */
export function convertBackpack(source) {
	return {
		_id: source._id,
		name: source.name ?? "Backpack",
		type: "backpack",
		img: source.img ?? "icons/svg/chest.svg",
		system: {},
		effects: backpackTagEffectData(source.system?.items ?? [], source._id),
	};
}
