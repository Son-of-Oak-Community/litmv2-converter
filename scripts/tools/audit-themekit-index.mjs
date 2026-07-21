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

// All pack dirs a source module ships, using the standard modules/<id>/packs/<pack>
// layout. Modules may package content as one Adventure pack (character pack, HoR)
// or as typed packs (Core Book ≥1.2) — this tool reads every pack and handles both.
function packDirs(root, mod) {
	const packsRoot = path.join(root, "modules", mod.id, "packs");
	if (!fs.existsSync(packsRoot)) return [];
	return fs.readdirSync(packsRoot, { withFileTypes: true })
		.filter((e) => e.isDirectory())
		.map((e) => path.join(packsRoot, e.name));
}

// normalizeKitName(name) -> { name, folderDerivable } for every installed themekit.
// Kits appear either embedded in an Adventure document (with the adventure's own
// `folders` array) or as standalone `!items!` documents foldered by the pack's
// `!folders!` documents; the tier-from-folder-chain rule is the same for both.
async function installedThemekits(root) {
	const kits = new Map();
	const record = (it, chain) => {
		if (it.type !== "themekit") return;
		kits.set(normalizeKitName(it.name), { name: it.name, folderDerivable: chain(it.folder).some((n) => LEVELS.has(n)) });
	};
	const chainIn = (folders) => (fid) => {
		const names = [];
		for (let f = folders.get(fid); f; f = folders.get(f.folder)) names.push((f.name ?? "").toLowerCase());
		return names;
	};
	for (const mod of SOURCE_MODULES) {
		for (const dir of packDirs(root, mod)) {
			const db = new ClassicLevel(dir, { valueEncoding: "json" });
			const entries = [];
			for await (const [k, v] of db.iterator()) entries.push([k, v]);
			await db.close();
			const packFolders = new Map(entries.filter(([k]) => k.startsWith("!folders!")).map(([, f]) => [f._id, f]));
			for (const [key, v] of entries) {
				if (key.startsWith("!items!")) record(v, chainIn(packFolders));
				if (Array.isArray(v?.items) && Array.isArray(v?.folders)) {
					const advFolders = new Map(v.folders.map((f) => [f._id, f]));
					for (const it of v.items) record(it, chainIn(advFolders));
				}
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
