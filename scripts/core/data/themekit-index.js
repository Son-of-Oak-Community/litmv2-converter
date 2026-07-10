// Hand-curated tier + themebook for the themekits whose tier is NOT derivable
// from the installed source folder chain at runtime (kitHints covers the rest).
// Covers the Core Book "Variable/*" kits and all Hearts of Ravendale kits —
// these ship with no level folder, so this table is their only tier source.
//
// The tiers originate from human curation (the printed rulebook), NOT from any
// installed data, so they cannot be regenerated automatically — edit this file
// by hand. To find what needs adding after a content update, run
// `npm run audit:themekits` (see scripts/tools/audit-themekit-index.mjs): it
// lists installed kits with no folder-derived tier that are missing here. Add an
// entry keyed by normalizeKitName(name), e.g.
//   "my new kit": { "level": "origin", "themebook": "Trait" },
// where level is one of "origin" | "adventure" | "greatness".

export function normalizeKitName(s) {
	return (s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export const THEMEKIT_INDEX = {
	"acute nose": {
		"level": "origin",
		"themebook": "Trait"
	},
	"all devouring wurm": {
		"level": "greatness",
		"themebook": "Monstrosity"
	},
	"ancestor worship": {
		"level": "origin",
		"themebook": "Magic"
	},
	"angling weiring": {
		"level": "origin",
		"themebook": "Skill or Trade"
	},
	"archery": {
		"level": "origin",
		"themebook": "Skill or Trade"
	},
	"art of angling": {
		"level": "origin",
		"themebook": "Magic"
	},
	"art of veiling": {
		"level": "origin",
		"themebook": "Magic"
	},
	"art of the shepherd": {
		"level": "origin",
		"themebook": "Magic"
	},
	"artful stitching": {
		"level": "origin",
		"themebook": "Magic"
	},
	"ashstone quarryfolk": {
		"level": "origin",
		"themebook": "People"
	},
	"band of swords": {
		"level": "adventure",
		"themebook": "Companion"
	},
	"banished unburdened": {
		"level": "origin",
		"themebook": "Past"
	},
	"barleytowner": {
		"level": "origin",
		"themebook": "People"
	},
	"bearer of scars": {
		"level": "adventure",
		"themebook": "Influence"
	},
	"beast dreamer": {
		"level": "origin",
		"themebook": "Magic"
	},
	"blazing invoker": {
		"level": "adventure",
		"themebook": "Magic"
	},
	"blessed brewing": {
		"level": "origin",
		"themebook": "Magic"
	},
	"blessing of the goddess": {
		"level": "origin",
		"themebook": "Magic"
	},
	"boisterous bard": {
		"level": "adventure",
		"themebook": "Magic"
	},
	"boundary cairns": {
		"level": "origin",
		"themebook": "Magic"
	},
	"bounds borderlander": {
		"level": "origin",
		"themebook": "People"
	},
	"caller of nature spirits": {
		"level": "adventure",
		"themebook": "Magic"
	},
	"cedar shield": {
		"level": "origin",
		"themebook": "Possessions"
	},
	"cedargate lumberjack": {
		"level": "origin",
		"themebook": "People"
	},
	"champion of the fair folk": {
		"level": "adventure",
		"themebook": "Magic"
	},
	"charmcraft": {
		"level": "origin",
		"themebook": "Magic"
	},
	"cheesemaking": {
		"level": "origin",
		"themebook": "Skill or Trade"
	},
	"cobblebones reader": {
		"level": "origin",
		"themebook": "Magic"
	},
	"cold hearted": {
		"level": "origin",
		"themebook": "Trait"
	},
	"coven witch": {
		"level": "adventure",
		"themebook": "Magic"
	},
	"craftwork apprentice": {
		"level": "origin",
		"themebook": "Companion"
	},
	"crafty home cooking": {
		"level": "origin",
		"themebook": "Magic"
	},
	"craggen banner fashioner": {
		"level": "origin",
		"themebook": "Magic"
	},
	"craggen blood letter": {
		"level": "origin",
		"themebook": "Magic"
	},
	"craggen druid": {
		"level": "origin",
		"themebook": "Magic"
	},
	"craggen highlander": {
		"level": "origin",
		"themebook": "People"
	},
	"craggen trophy crafting": {
		"level": "origin",
		"themebook": "Magic"
	},
	"craggen turnskin": {
		"level": "origin",
		"themebook": "Magic"
	},
	"craggen war witch": {
		"level": "origin",
		"themebook": "Magic"
	},
	"crook flock": {
		"level": "origin",
		"themebook": "Possessions"
	},
	"crop farmer": {
		"level": "origin",
		"themebook": "Skill or Trade"
	},
	"crossroads chatter": {
		"level": "origin",
		"themebook": "Circumstance"
	},
	"crowling": {
		"level": "origin",
		"themebook": "Magic"
	},
	"cult initiate": {
		"level": "origin",
		"themebook": "Magic"
	},
	"curse eating": {
		"level": "origin",
		"themebook": "Magic"
	},
	"dedicated shrine tender": {
		"level": "origin",
		"themebook": "Magic"
	},
	"demon binding": {
		"level": "adventure",
		"themebook": "Magic"
	},
	"dolmen knoll drifter": {
		"level": "origin",
		"themebook": "People"
	},
	"doppelganger": {
		"level": "adventure",
		"themebook": "Magic"
	},
	"dowsing": {
		"level": "origin",
		"themebook": "Magic"
	},
	"eldritch archmage": {
		"level": "greatness",
		"themebook": "Magic"
	},
	"elemental body": {
		"level": "greatness",
		"themebook": "Magic"
	},
	"expert poisoner": {
		"level": "adventure",
		"themebook": "Magic"
	},
	"fallen from grace": {
		"level": "origin",
		"themebook": "Past"
	},
	"familiar master": {
		"level": "origin",
		"themebook": "Magic"
	},
	"fellowship of the amulet": {
		"level": "adventure",
		"themebook": "The Fellowship"
	},
	"folk cures": {
		"level": "origin",
		"themebook": "Magic"
	},
	"folk songs": {
		"level": "origin",
		"themebook": "Skill or Trade"
	},
	"forest ken": {
		"level": "origin",
		"themebook": "Skill or Trade"
	},
	"fortune hunters": {
		"level": "adventure",
		"themebook": "The Fellowship"
	},
	"foul miasma": {
		"level": "origin",
		"themebook": "Trait"
	},
	"foul mouthed": {
		"level": "origin",
		"themebook": "Personality"
	},
	"foxy trickster": {
		"level": "origin",
		"themebook": "Magic"
	},
	"friend i just met": {
		"level": "origin",
		"themebook": "Companion"
	},
	"friend of the vila": {
		"level": "origin",
		"themebook": "Magic"
	},
	"gracious host": {
		"level": "origin",
		"themebook": "Personality"
	},
	"grand necromancy": {
		"level": "greatness",
		"themebook": "Magic"
	},
	"grave robber": {
		"level": "origin",
		"themebook": "Skill or Trade"
	},
	"greenkeeper": {
		"level": "origin",
		"themebook": "Magic"
	},
	"grudgingly helpful": {
		"level": "origin",
		"themebook": "Personality"
	},
	"guardian spirit": {
		"level": "origin",
		"themebook": "Companion"
	},
	"handcrafted pan flute": {
		"level": "origin",
		"themebook": "Possessions"
	},
	"hartlander": {
		"level": "origin",
		"themebook": "People"
	},
	"hearthkeeper": {
		"level": "origin",
		"themebook": "Magic"
	},
	"heartsucking strix": {
		"level": "adventure",
		"themebook": "Uncanny Being"
	},
	"hedge witch": {
		"level": "origin",
		"themebook": "Magic"
	},
	"helmian chronicler": {
		"level": "adventure",
		"themebook": "Knowledge"
	},
	"herald of summer": {
		"level": "greatness",
		"themebook": "Magic"
	},
	"hex curse": {
		"level": "adventure",
		"themebook": "Magic"
	},
	"hexes and blessings": {
		"level": "origin",
		"themebook": "Magic"
	},
	"hexia blooded": {
		"level": "origin",
		"themebook": "People"
	},
	"hidden daggers": {
		"level": "origin",
		"themebook": "Possessions"
	},
	"highglade genteel": {
		"level": "origin",
		"themebook": "People"
	},
	"hill crester": {
		"level": "origin",
		"themebook": "Skill or Trade"
	},
	"hoary avenger": {
		"level": "adventure",
		"themebook": "Magic"
	},
	"horse panoply": {
		"level": "adventure",
		"themebook": "Possessions"
	},
	"horsemanship": {
		"level": "origin",
		"themebook": "Skill or Trade"
	},
	"hospitality magic": {
		"level": "origin",
		"themebook": "Magic"
	},
	"hot headed": {
		"level": "origin",
		"themebook": "Personality"
	},
	"house spirits": {
		"level": "origin",
		"themebook": "Magic"
	},
	"imposing wolfhound": {
		"level": "origin",
		"themebook": "Companion"
	},
	"impregnable stronghold": {
		"level": "greatness",
		"themebook": "Possessions"
	},
	"incredible hammerstroke": {
		"level": "origin",
		"themebook": "Trait"
	},
	"inspiring master": {
		"level": "adventure",
		"themebook": "Companion"
	},
	"irksome pixie": {
		"level": "origin",
		"themebook": "Companion"
	},
	"itinerant sellswords": {
		"level": "origin",
		"themebook": "The Fellowship"
	},
	"keen eyes": {
		"level": "origin",
		"themebook": "Trait"
	},
	"keeper of the oldways": {
		"level": "origin",
		"themebook": "Devotion"
	},
	"life in the wild": {
		"level": "origin",
		"themebook": "Past"
	},
	"lost a loved one": {
		"level": "origin",
		"themebook": "Past"
	},
	"love of the land": {
		"level": "origin",
		"themebook": "Devotion"
	},
	"magic of the household hob": {
		"level": "origin",
		"themebook": "Magic"
	},
	"magical garden": {
		"level": "origin",
		"themebook": "Magic"
	},
	"meadow sylph": {
		"level": "adventure",
		"themebook": "Uncanny Being"
	},
	"milkrest mountainfolk": {
		"level": "origin",
		"themebook": "People"
	},
	"milkrest riding goat": {
		"level": "origin",
		"themebook": "Companion"
	},
	"mountain solitude": {
		"level": "origin",
		"themebook": "Circumstance"
	},
	"murder of crows": {
		"level": "origin",
		"themebook": "Companion"
	},
	"nagging minder": {
		"level": "origin",
		"themebook": "Companion"
	},
	"oldways pilgrim": {
		"level": "origin",
		"themebook": "Magic"
	},
	"oldways witch": {
		"level": "origin",
		"themebook": "Magic"
	},
	"one with the dark": {
		"level": "adventure",
		"themebook": "Magic"
	},
	"overgrown bulwark": {
		"level": "greatness",
		"themebook": "Monstrosity"
	},
	"pasture reveler": {
		"level": "origin",
		"themebook": "People"
	},
	"patient": {
		"level": "origin",
		"themebook": "Personality"
	},
	"pilfered possessions": {
		"level": "origin",
		"themebook": "Possessions"
	},
	"poppet making": {
		"level": "origin",
		"themebook": "Magic"
	},
	"powerful household": {
		"level": "adventure",
		"themebook": "The Fellowship"
	},
	"practical magic": {
		"level": "origin",
		"themebook": "Magic"
	},
	"prankster": {
		"level": "origin",
		"themebook": "Personality"
	},
	"prepared supplies": {
		"level": "origin",
		"themebook": "Possessions"
	},
	"primal earthshaper": {
		"level": "greatness",
		"themebook": "Magic"
	},
	"prisoner of the dalish": {
		"level": "origin",
		"themebook": "Circumstance"
	},
	"protective": {
		"level": "origin",
		"themebook": "Personality"
	},
	"protectors against the dark": {
		"level": "origin",
		"themebook": "The Fellowship"
	},
	"punishment enduring": {
		"level": "origin",
		"themebook": "Trait"
	},
	"ravensdale bumpkin": {
		"level": "origin",
		"themebook": "People"
	},
	"red marshal": {
		"level": "origin",
		"themebook": "Circumstance"
	},
	"river runner": {
		"level": "origin",
		"themebook": "Skill or Trade"
	},
	"rootbed shambler": {
		"level": "adventure",
		"themebook": "Uncanny Being"
	},
	"rudimentary magic": {
		"level": "origin",
		"themebook": "Magic"
	},
	"rune sage": {
		"level": "greatness",
		"themebook": "Magic"
	},
	"runescribing": {
		"level": "origin",
		"themebook": "Magic"
	},
	"scribe": {
		"level": "origin",
		"themebook": "Skill or Trade"
	},
	"seen the twilight": {
		"level": "origin",
		"themebook": "Past"
	},
	"shrewd trader": {
		"level": "origin",
		"themebook": "Skill or Trade"
	},
	"snares traps": {
		"level": "origin",
		"themebook": "Possessions"
	},
	"soddenmore family": {
		"level": "origin",
		"themebook": "People"
	},
	"spellsword": {
		"level": "adventure",
		"themebook": "Magic"
	},
	"spidery reclaimer": {
		"level": "adventure",
		"themebook": "Uncanny Being"
	},
	"spitfire ogre": {
		"level": "adventure",
		"themebook": "Uncanny Being"
	},
	"stormhelm rank": {
		"level": "adventure",
		"themebook": "Influence"
	},
	"tattooed sigils": {
		"level": "adventure",
		"themebook": "Magic"
	},
	"tavern buddies": {
		"level": "origin",
		"themebook": "The Fellowship"
	},
	"town dweller": {
		"level": "origin",
		"themebook": "Circumstance"
	},
	"town geomancer": {
		"level": "origin",
		"themebook": "Magic"
	},
	"trial of the vulture": {
		"level": "origin",
		"themebook": "Devotion"
	},
	"tribe soothsayer": {
		"level": "origin",
		"themebook": "Magic"
	},
	"trove of goods": {
		"level": "origin",
		"themebook": "Possessions"
	},
	"trusty woodaxe": {
		"level": "origin",
		"themebook": "Possessions"
	},
	"twilight avenger": {
		"level": "adventure",
		"themebook": "Uncanny Being"
	},
	"twilight love": {
		"level": "origin",
		"themebook": "Devotion"
	},
	"twilight lullaby": {
		"level": "origin",
		"themebook": "Magic"
	},
	"uncover the truth": {
		"level": "origin",
		"themebook": "Devotion"
	},
	"undying wight": {
		"level": "adventure",
		"themebook": "Uncanny Being"
	},
	"unnaturally famished": {
		"level": "origin",
		"themebook": "Trait"
	},
	"untold riches": {
		"level": "greatness",
		"themebook": "Possessions"
	},
	"untrained potential": {
		"level": "origin",
		"themebook": "Magic"
	},
	"village apothecary": {
		"level": "origin",
		"themebook": "Magic"
	},
	"walker in the dales": {
		"level": "adventure",
		"themebook": "Uncanny Being"
	},
	"wandering wizard": {
		"level": "adventure",
		"themebook": "Magic"
	},
	"wanderlands wise": {
		"level": "origin",
		"themebook": "Circumstance"
	},
	"wanderlust": {
		"level": "origin",
		"themebook": "Personality"
	},
	"warding invocations": {
		"level": "adventure",
		"themebook": "Magic"
	},
	"weapon of old gwyrdolin": {
		"level": "adventure",
		"themebook": "Relic"
	},
	"well regarded": {
		"level": "origin",
		"themebook": "Circumstance"
	},
	"werewolf form": {
		"level": "adventure",
		"themebook": "Magic"
	},
	"wild harvester": {
		"level": "origin",
		"themebook": "Magic"
	},
	"winsome dancer": {
		"level": "origin",
		"themebook": "Trait"
	},
	"wood whisperer": {
		"level": "origin",
		"themebook": "Magic"
	},
	"woodender": {
		"level": "origin",
		"themebook": "People"
	},
	"woodland cult": {
		"level": "adventure",
		"themebook": "Influence"
	},
	"woodland whisperer": {
		"level": "origin",
		"themebook": "Magic"
	},
	"enchanted place": {
		"level": "origin",
		"themebook": "Magic"
	},
	"the sight": {
		"level": "origin",
		"themebook": "Magic"
	}
};
