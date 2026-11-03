import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { join, resolve } from "node:path";

const temporaryDirectory = await mkdtemp(
	join(process.cwd(), ".angular", "cache", "admin-contact-tests-"),
);
const bundledTests = [
	join(temporaryDirectory, "contact-messages.spec.mjs"),
	join(temporaryDirectory, "faq-management.spec.mjs"),
	join(temporaryDirectory, "site-content.spec.mjs"),
	join(temporaryDirectory, "cities.spec.mjs"),
];

try {
	await build({
		entryPoints: [
			resolve("tests/contact-messages.spec.mjs"),
			resolve("tests/faq-management.spec.mjs"),
			resolve("tests/site-content.spec.mjs"),
			resolve("tests/cities.spec.mjs"),
		],
		bundle: true,
		packages: "external",
		platform: "node",
		format: "esm",
		outExtension: { ".js": ".mjs" },
		outdir: temporaryDirectory,
		banner: { js: "import '@angular/compiler';" },
	});

	for (const bundledTest of bundledTests) {
		const result = spawnSync(
			process.execPath,
			["--test", bundledTest],
			{ stdio: "inherit" },
		);
		if (result.error) throw result.error;
		if (result.status !== 0) process.exitCode = result.status ?? 1;
	}
} finally {
	await rm(temporaryDirectory, { recursive: true, force: true });
}
