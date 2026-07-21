// scripts/main.js
import { createProgressReporter } from "./core/progress.js";
import { exportSource } from "./export-flow.js";
import { readHandoffJSON } from "./handoff-io.js";
import { importAll, reimportAll } from "./import-flow.js";
import { pendingSources } from "./prompt-rules.js";
import { detectInstalledSources, MODULE_ID, SYSTEM } from "./registry.js";

const { DialogV2 } = foundry.applications.api;

const BAR_HOLD_MS = 4000;

// `permanent` keeps the bar from Foundry's built-in 500ms auto-removal once it
// reaches 100% (notifications.mjs), so finishBar controls the hold itself.
function startBar(message) {
	return ui.notifications.info(message, { progress: true, permanent: true });
}

/** Fill to 100%, hold briefly so completion registers, then auto-clear. */
function finishBar(bar, message) {
	ui.notifications.update(bar, { pct: 1, message });
	window.setTimeout(() => ui.notifications.remove(bar), BAR_HOLD_MS);
}

Hooks.once("init", () => {
	game.modules.get(MODULE_ID).api = { exportSource, importAll, reimportAll };

	// A settings "menu" whose app never renders — clicking the button runs
	// the update flow instead. registerMenu requires an ApplicationV2 subclass.
	class UpdateContentShim extends foundry.applications.api.ApplicationV2 {
		render() {
			runUpdateFlow();
			return this;
		}
	}
	game.settings.registerMenu(MODULE_ID, "update-content", {
		name: "Update converted content",
		label: "Update Content",
		hint: "Re-run the conversion. In a mist-engine world this re-exports all installed official modules; in a litmv2 world this deletes the converted compendia and re-imports from the latest export.",
		icon: "fa-solid fa-rotate",
		type: UpdateContentShim,
		restricted: true,
	});
});

Hooks.once("ready", async () => {
	if (!game.user.isGM) return;
	if (game.system.id === SYSTEM.source) return offerExport();
	if (game.system.id === SYSTEM.target) return offerImport();
});

/**
 * Convert each given source behind a progress bar and report totals. Shared by
 * the first-run export prompt and the Re-export update flow — only the dialog
 * copy and completion messages (via `done(summary, moduleCount)`) differ.
 */
async function runExport({ sources, startMessage, done }) {
	const bar = startBar(startMessage);
	const report = createProgressReporter(sources.length, (u) => ui.notifications.update(bar, u));
	const results = [];
	for (const s of sources) {
		report(`Converting ${s.label}…`);
		try {
			results.push(await exportSource(s.id));
		} catch (e) {
			console.error(e);
			ui.notifications.error(`Export failed for ${s.label}: ${e.message}`);
		}
	}
	if (!results.length) { ui.notifications.remove(bar); return; }
	const counts = results.reduce((acc, r) => {
		for (const [k, v] of Object.entries(r.counts)) acc[k] = (acc[k] ?? 0) + v;
		return acc;
	}, {});
	const summary = Object.entries(counts).filter(([, v]) => v).map(([k, v]) => `${v} ${k}`).join(", ");
	const m = done(summary, results.length);
	ui.notifications.info(m.info);
	finishBar(bar, m.bar);
}

/**
 * Run an import routine (importAll or reimportAll) behind a progress bar. Shared
 * by the first-run import prompt and the Re-import update flow — only the
 * routine, dialog copy, and completion messages (via `done(summary)`) differ.
 */
async function runImport({ startMessage, run, done }) {
	const bar = startBar(startMessage);
	try {
		const { imported } = await run({ onProgress: (u) => ui.notifications.update(bar, u) });
		const summary = Object.entries(imported).map(([k, v]) => `${v} ${k}`).join(", ") || "nothing";
		const m = done(summary);
		ui.notifications.info(m.info);
		finishBar(bar, m.bar);
	} catch (e) {
		console.error(e);
		ui.notifications.remove(bar);
		ui.notifications.error(e.message, { permanent: true });
	}
}

async function offerExport() {
	const sources = detectInstalledSources();
	if (!sources.length) return;
	// Only prompt when an installed source hasn't been exported yet;
	// re-exports remain available via the module api.
	const manifest = await readHandoffJSON("manifest.json");
	if (!pendingSources(sources, manifest).length) return;
	const ok = await DialogV2.confirm({
		window: { title: "LitM Converter — Export" },
		content: `<p>Found ${sources.length} official LitM module(s). Export their content for litmv2?</p><p>This writes converted data into the converter module. Then open your <b>litmv2</b> world and import.</p>`,
	});
	if (!ok) return;
	await runExport({
		sources,
		startMessage: "Exporting LitM content…",
		done: (summary, n) => ({
			info: `Exported ${summary} across ${n} module(s). Now open your litmv2 world to import.`,
			bar: `Exported ${summary} — open your litmv2 world to import.`,
		}),
	});
}

async function offerImport() {
	const manifest = await readHandoffJSON("manifest.json");
	if (!manifest) return;
	// Already imported (packs populated) — only re-prompt on empty packs;
	// re-imports remain available via the module api.
	const hasContent = game.packs.contents.some((p) => p.metadata.packageName === MODULE_ID && p.index.size > 0);
	if (hasContent) return;
	const ok = await DialogV2.confirm({
		window: { title: "LitM Converter — Import" },
		content: `<p>Converted LitM content is ready. Import it into this module's compendia?</p><p>It will be available to every litmv2 world that enables this module. <b>Reload</b> after importing.</p>`,
	});
	if (!ok) return;
	await runImport({
		startMessage: "Importing converted content…",
		run: importAll,
		done: (summary) => ({
			info: `Imported ${summary} into the converter compendia. Reload to see them.`,
			bar: `Imported ${summary} — reload now.`,
		}),
	});
}

async function runUpdateFlow() {
	if (!game.user.isGM) return;
	if (game.system.id === SYSTEM.source) return updateExport();
	if (game.system.id === SYSTEM.target) return updateImport();
	ui.notifications.warn("LitM Converter: open a mist-engine or litmv2 world to update content.");
}

async function updateExport() {
	const sources = detectInstalledSources();
	if (!sources.length) return ui.notifications.warn("No official LitM source modules are enabled in this world.");
	const ok = await DialogV2.confirm({
		window: { title: "LitM Converter — Re-export" },
		content: `<p>Re-export ${sources.length} installed official module(s), overwriting the current handoff?</p><p>Afterwards, open your <b>litmv2</b> world and run <b>Update Content</b> there to apply it.</p>`,
	});
	if (!ok) return;
	await runExport({
		sources,
		startMessage: "Re-exporting LitM content…",
		done: (summary, n) => ({
			info: `Re-exported ${summary} from ${n} module(s).`,
			bar: `Re-exported ${summary}.`,
		}),
	});
}

async function updateImport() {
	const ok = await DialogV2.confirm({
		window: { title: "LitM Converter — Re-import" },
		content: `<p><b>This deletes all documents in the converter compendia</b> and re-imports them from the latest export.</p><p>World documents you imported from these compendia are not affected.</p>`,
	});
	if (!ok) return;
	await runImport({
		startMessage: "Re-importing converted content…",
		run: reimportAll,
		done: (summary) => ({
			info: `Re-imported ${summary} into the converter compendia. Reload to see them.`,
			bar: `Re-imported ${summary} — reload now.`,
		}),
	});
}
