/**
 * Convert a source Scene: verbatim passthrough except per-user ownership
 * entries (source-world user ids), `active`, and `_stats`. Asset paths under
 * modules/legend-in-the-mist-* are kept (those modules are installed in both
 * worlds); token actorIds stay valid because actor _ids are preserved.
 * @param {object} source
 * @returns {object}
 */
export function convertScene(source) {
	const { _stats, ...scene } = source;
	return {
		...scene,
		active: false,
		ownership: { default: source.ownership?.default ?? 0 },
	};
}
