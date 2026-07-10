// Self-contained copies of litmv2's canonical effect-shaping helpers
// (from litmv2 modules/item/litm-item.js). Copied — not imported — because
// this module runs in a mist-engine world where the litmv2 system is not
// loaded. These produce the exact ActiveEffect creation shape litmv2 expects,
// including the required title tag on themes/story_themes.

/**
 * Build ActiveEffect creation data from theme tag arrays.
 * @param {object} legacy - { powerTags, weaknessTags, isFellowship }
 * @param {object} [titleTag] - { name, isScratched } for the title tag, or falsy to skip
 * @returns {object[]}
 */
export function buildThemeTagEffects(legacy, titleTag) {
	const { powerTags = [], weaknessTags = [], isFellowship = false } = legacy;
	const powerType = isFellowship ? "fellowship_tag" : "power_tag";
	const effects = [
		...powerTags.map((t) => ({
			name: t.name || "",
			type: powerType,
			disabled: !(t.isActive ?? false),
			system: {
				question: t.question ?? null,
				isScratched: t.isScratched ?? false,
			},
		})),
		...weaknessTags.map((t) => ({
			name: t.name || "",
			type: "weakness_tag",
			disabled: !(t.isActive ?? false),
			system: { question: t.question ?? null },
		})),
	];
	if (titleTag?.name) {
		effects.push({
			name: titleTag.name,
			type: powerType,
			disabled: false,
			system: {
				question: "0",
				isScratched: titleTag.isScratched ?? false,
				isTitleTag: true,
			},
		});
	}
	return effects;
}

/**
 * Build ActiveEffect creation data from backpack contents.
 * @param {object[]} contents - Array of legacy tag objects
 * @returns {object[]}
 */
export function buildBackpackTagEffects(contents) {
	return contents.map((t) => ({
		name: t.name || "",
		type: "story_tag",
		disabled: !(t.isActive ?? true),
		system: {
			isScratched: t.isScratched ?? false,
			isSingleUse: t.isSingleUse ?? false,
			isHidden: false,
		},
	}));
}

/**
 * Canonical litmv2 6-slot status `tiers` array for a mist-engine floating entry:
 * its `markings` normalized to exactly 6 slots when any box is set, else a
 * one-hot array for `value` in 1..6, else all-false. Matches the shape litmv2's
 * StatusTagData stores — a 6-box boolean array where multi-box arrays are valid
 * and the effective tier is read as the highest set box.
 * @param {{markings?: boolean[], value?: number}} entry
 * @returns {boolean[]}
 */
export function statusTiers(entry) {
	if (Array.isArray(entry?.markings) && entry.markings.some(Boolean)) {
		const tiers = entry.markings.slice(0, 6);
		while (tiers.length < 6) tiers.push(false);
		return tiers;
	}
	const value = entry?.value;
	return value >= 1 && value <= 6
		? Array.from({ length: 6 }, (_, i) => i === value - 1)
		: [false, false, false, false, false, false];
}

/**
 * The 1-based status tier of a floating entry — litmv2's canonical rule
 * (StatusTagData.tierOf): the highest set box, or 0 when none is set. The single
 * source both the effect array (via {@link statusTiers}) and the tag string
 * (actorTagString) derive from, so the two can never disagree on tier.
 * @param {{markings?: boolean[], value?: number}} entry
 * @returns {number}
 */
export const statusTier = (entry) => statusTiers(entry).lastIndexOf(true) + 1;

/**
 * Build story_tag / status_tag ActiveEffect data from mist-engine
 * floatingTagsAndStatuses entries. Statuses use {@link statusTiers} for the
 * litmv2 tier array.
 * @param {object[]} entries
 * @returns {object[]}
 */
export function buildActorTagEffects(entries) {
	return (entries ?? [])
		.filter((e) => (e?.name ?? "").trim())
		.map((e) => {
			if (e.isStatus) {
				return {
					name: e.name,
					type: "status_tag",
					disabled: false,
					system: { tiers: statusTiers(e), isHidden: false, limitId: null },
				};
			}
			return {
				name: e.name,
				type: "story_tag",
				disabled: false,
				system: { isScratched: !!e.burned, isSingleUse: false, isHidden: false, limitId: null },
			};
		});
}
