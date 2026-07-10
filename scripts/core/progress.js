// scripts/core/progress.js

/**
 * Build a coarse progress reporter. Call the returned function once per
 * completed work unit; it reports the fraction of `total` done so far and the
 * message describing the current unit, then advances the internal counter.
 *
 * @param {number} total                                      Total work units.
 * @param {(u: { pct: number, message: string }) => void} [onProgress]
 * @returns {(message: string) => void}
 */
export function createProgressReporter(total, onProgress = () => {}) {
	let done = 0;
	return (message) => {
		const pct = total > 0 ? Math.min(done / total, 1) : 0;
		onProgress({ pct, message });
		done += 1;
	};
}
