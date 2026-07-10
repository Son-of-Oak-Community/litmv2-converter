import { describe, expect, it } from "vitest";
import { createProgressReporter } from "../scripts/core/progress.js";

describe("createProgressReporter", () => {
	it("emits an increasing pct starting at 0 with each message", () => {
		const calls = [];
		const report = createProgressReporter(2, (u) => calls.push(u));
		report("a");
		report("b");
		expect(calls).toEqual([
			{ pct: 0, message: "a" },
			{ pct: 0.5, message: "b" },
		]);
	});

	it("guards against divide-by-zero when total is 0", () => {
		const calls = [];
		const report = createProgressReporter(0, (u) => calls.push(u));
		report("only");
		expect(calls).toEqual([{ pct: 0, message: "only" }]);
	});

	it("clamps pct at 1 when called more times than total", () => {
		const calls = [];
		const report = createProgressReporter(1, (u) => calls.push(u));
		report("a"); // done 0 -> pct 0
		report("b"); // done 1 -> 1/1 = 1
		report("c"); // done 2 -> 2/1 clamped to 1
		expect(calls.map((c) => c.pct)).toEqual([0, 1, 1]);
	});

	it("is a no-op when no callback is provided", () => {
		const report = createProgressReporter(2);
		expect(() => {
			report("a");
			report("b");
		}).not.toThrow();
	});
});
