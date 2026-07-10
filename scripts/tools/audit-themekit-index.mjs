// Maintainer audit for scripts/core/data/themekit-index.js.
//
// themekit-index.js is hand-curated: it holds the tier + themebook for themekits
// whose tier is NOT derivable from the installed source folder chain (the Core
// Book "Variable/*" kits and all Hearts of Ravendale kits). This script does NOT
// generate those tiers — they come from human curation (the printed rulebook)
// and cannot be recovered from installed data. It reports which installed kits
// still need a manual entry, so a maintainer knows what to add by hand after a
// content update.
//
// Usage (a Foundry Data directory must be supplied — no path is hardcoded):
//   FOUNDRY_DATA=/path/to/FoundryVTT/Data npm run audit:themekits
//   node scripts/tools/audit-themekit-index.mjs --data /path/to/FoundryVTT/Data
//
// Source packs are resolved from that root using only the standard Foundry
// `modules/<id>/packs/<pack>` layout and the ids declared in scripts/registry.js.
import fs from "node:fs";
import path from "node:path";
import { SOURCE_MODULES } from "../registry.js";
import { normalizeKitName, THEMEKIT_INDEX } from "../core/data/themekit-index.js";

// classic-level reads Foundry's LevelDB packs. It's a maintainer-only dependency
// (declared in devDependencies); resolve it however this repo provides modules,
// with a clear hint if absent — never from a hardcoded path.
let ClassicLevel;
try {
	({ ClassicLevel } = await import("classic-level"));
} catch {
	console.error("This tool needs the `classic-level` package to read Foundry LevelDB packs.");
	console.error("Install it where this repo resolves modules (e.g. `npm i -D classic-level`) and re-run.");
	process.exit(1);
}

const LEVELS = new Set(["origin", "adventure", "greatness"]);

function dataRoot() {
	const flag = process.argv.indexOf("--data");
	const root = flag >= 0 ? process.argv[flag + 1] : process.env.FOUNDRY_DATA;
	if (!root) {
		console.error("No Foundry data path. Set FOUNDRY_DATA=/path/to/FoundryVTT/Data or pass --data <path>.");
		process.exit(1);
	}
	if (!fs.existsSync(root)) {
		console.error(`Foundry data path not found: ${root}`);
		process.exit(1);
	}
	return root;
}

// Each source module ships one Adventure pack; the pack name is the part of
// packId after the module id. On-disk layout is the standard modules/<id>/packs/<pack>.
function adventurePackDir(root, mod) {
	const packName = mod.packId.split(".").slice(1).join(".");
	return path.join(root, "modules", mod.id, "packs", packName);
}

// normalizeKitName(name) -> { name, folderDerivable } for every installed themekit.
async function installedThemekits(root) {
	const kits = new Map();
	for (const mod of SOURCE_MODULES) {
		const dir = adventurePackDir(root, mod);
		if (!fs.existsSync(dir)) continue;
		const db = new ClassicLevel(dir, { valueEncoding: "json" });
		const docs = [];
		for await (const [, v] of db.iterator()) docs.push(v);
		await db.close();
		for (const v of docs) {
			if (!Array.isArray(v?.items)) continue;
			const folders = new Map((v.folders ?? []).map((f) => [f._id, f]));
			const chain = (fid) => {
				const names = [];
				for (let f = folders.get(fid); f; f = folders.get(f.folder)) names.push((f.name ?? "").toLowerCase());
				return names;
			};
			for (const it of v.items) {
				if (it.type !== "themekit") continue;
				kits.set(normalizeKitName(it.name), { name: it.name, folderDerivable: chain(it.folder).some((n) => LEVELS.has(n)) });
			}
		}
	}
	return kits;
}

const root = dataRoot();
const kits = await installedThemekits(root);
if (!kits.size) {
	console.error(`No themekits found under ${root}. Are the official LitM modules installed there?`);
	process.exit(1);
}

// A kit needs a manual entry when its tier is neither folder-derivable at runtime
// nor already curated here.
const missing = [];
for (const [key, { name, folderDerivable }] of kits) {
	if (!folderDerivable && !(key in THEMEKIT_INDEX)) missing.push(name);
}

console.log(`Scanned ${kits.size} installed themekit(s) across ${SOURCE_MODULES.length} source module(s).`);
if (!missing.length) {
	console.log("themekit-index.js is complete — every non-folder-derivable kit has a curated tier.");
} else {
	console.log(`\n${missing.length} kit(s) need a manual tier entry in scripts/core/data/themekit-index.js:`);
	for (const name of missing.sort((a, b) => a.localeCompare(b)))
		console.log(`  "${normalizeKitName(name)}": { "level": "…", "themebook": "…" },  // ${name}`);
	console.log('\nTiers come from the printed rulebook — this script cannot supply them (levels: "origin" | "adventure" | "greatness").');
	process.exitCode = 1;
}
