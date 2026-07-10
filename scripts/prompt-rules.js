// scripts/prompt-rules.js

/**
 * Which installed source modules have no entry in the handoff manifest yet.
 * Drives the export ready-prompt: only ask when something new needs exporting.
 * @param {Array<{id: string}>} installed - detectInstalledSources() result
 * @param {{sources?: Array<{id: string}>}|null} manifest - handoff/manifest.json (or null)
 * @returns {Array<{id: string}>}
 */
export function pendingSources(installed, manifest) {
	const exported = new Set((manifest?.sources ?? []).map((s) => s.id));
	return installed.filter((s) => !exported.has(s.id));
}
