import assert from "node:assert/strict";
import test from "node:test";
import {
	createEnvironmentInjector,
	Injector,
	PendingTasks,
	runInInjectionContext,
} from "@angular/core";
import {
	provideHttpClient,
	withNoXsrfProtection,
} from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
} from "@angular/common/http/testing";
import { Router } from "@angular/router";
import { of } from "rxjs";
import { AlertService } from "../src/app/services/alert.service.ts";
import { SiteContentService } from "../src/app/services/site-content.service.ts";
import { SitePagesPage } from "../src/app/pages/site-content/site-pages.page.ts";
import { SiteSettingsPage } from "../src/app/pages/site-content/site-settings.page.ts";
import {
	blockPayloadFromDraft,
	EMPTY_BLOCK_DRAFT,
	plainTextPreview,
	validateBlockDraft,
	validateSetting,
} from "../src/app/pages/site-content/site-content.forms.ts";
import { authGuard } from "../src/app/guards/auth.guard.ts";
import { AdminAuthService } from "../src/app/services/admin-auth.service.ts";

function createHttpInjector() {
	const parentInjector = Injector.create({ providers: [] });
	const injector = createEnvironmentInjector(
		[
			provideHttpClient(withNoXsrfProtection()),
			provideHttpClientTesting(),
			{ provide: PendingTasks, useValue: { add: () => () => {} } },
			SiteContentService,
		],
		parentInjector,
	);
	return { injector, parentInjector };
}

test("SiteContentService appelle les routes pages, blocs, publication, ordre et paramètres", () => {
	const { injector, parentInjector } = createHttpInjector();
	const service = runInInjectionContext(injector, () => injector.get(SiteContentService));
	const http = injector.get(HttpTestingController);

	service.listPages().subscribe();
	http.expectOne((request) => request.url.endsWith("/api/admin/site/pages"))
		.flush({ success: true, data: [] });

	service.createPage({
		slug: "home",
		title: "Accueil",
		metaTitle: "Accueil",
		metaDescription: "Description",
	}).subscribe();
	const createPage = http.expectOne((request) => request.url.endsWith("/api/admin/site/pages"));
	assert.equal(createPage.request.method, "POST");
	createPage.flush({ success: true, data: { id: 1 } });

	service.listBlocks(1).subscribe();
	const blocks = http.expectOne((request) =>
		request.url.endsWith("/api/admin/site/blocks") &&
		request.params.get("pageId") === "1",
	);
	blocks.flush({ success: true, data: [] });

	service.reorderBlocks([{ id: 2, position: 0 }]).subscribe();
	const reorder = http.expectOne((request) => request.url.endsWith("/api/admin/site/blocks/reorder"));
	assert.deepEqual(reorder.request.body, { items: [{ id: 2, position: 0 }] });
	reorder.flush({ success: true });

	service.setBlockStatus(2, "PUBLISHED").subscribe();
	const publication = http.expectOne((request) =>
		request.url.endsWith("/api/admin/site/blocks/2/publication"),
	);
	assert.deepEqual(publication.request.body, { status: "PUBLISHED" });
	publication.flush({ success: true, data: {} });

	service.updateSetting("contact_email", "hello@example.test").subscribe();
	const setting = http.expectOne((request) =>
		request.url.endsWith("/api/admin/site/settings/contact_email"),
	);
	assert.equal(setting.request.method, "PUT");
	assert.deepEqual(setting.request.body, { value: "hello@example.test" });
	setting.flush({ success: true, data: {} });

	service.deleteSetting("contact_email").subscribe();
	const deleteSetting = http.expectOne((request) =>
		request.url.endsWith("/api/admin/site/settings/contact_email"),
	);
	assert.equal(deleteSetting.request.method, "DELETE");
	deleteSetting.flush({ success: true });
	http.verify();
	injector.destroy();
	parentInjector.destroy();
});

test("les formulaires de bloc valident les champs par type et préparent des données sans HTML", () => {
	const heroDraft = {
		...EMPTY_BLOCK_DRAFT,
		blockKey: "hero-main",
		title: "Bienvenue",
		imageUrl: "https://example.test/hero.png",
	};
	assert.deepEqual(validateBlockDraft("HERO", heroDraft), {});
	assert.deepEqual(blockPayloadFromDraft("HERO", heroDraft), {
		title: "Bienvenue",
		imageUrl: "https://example.test/hero.png",
	});
	assert.match(
		validateBlockDraft("TEXT", { ...EMPTY_BLOCK_DRAFT, blockKey: "body", body: "<b>HTML</b>" }).body[0],
		/HTML/,
	);

	const steps = {
		...EMPTY_BLOCK_DRAFT,
		blockKey: "steps",
		itemsText: "Choisir | Sélectionner un trajet",
	};
	assert.deepEqual(validateBlockDraft("STEPS", steps), {});
	assert.deepEqual(blockPayloadFromDraft("STEPS", steps).items, [
		{ title: "Choisir", description: "Sélectionner un trajet" },
	]);
	assert.deepEqual(plainTextPreview({ title: "Titre", body: "Texte" }), [
		"title : Titre",
		"body : Texte",
	]);
});

test("les paramètres valident e-mail, URL HTTPS et téléphone", () => {
	assert.equal(validateSetting("contact_email", "contact@example.test"), null);
	assert.match(validateSetting("contact_email", "pas-un-email"), /e-mail/);
	assert.equal(validateSetting("appstore_url", "https://apps.example.test/app"), null);
	assert.match(validateSetting("appstore_url", "http://apps.example.test/app"), /HTTPS/);
	assert.equal(validateSetting("contact_phone", "+242 06 123 45 67"), null);
	assert.match(validateSetting("contact_phone", "abc"), /téléphone/);
});

test("SitePagesPage empêche l'enregistrement SEO au-delà des compteurs et envoie les métadonnées valides", () => {
	let writes = 0;
	const service = {
		createPage: (payload) => {
			writes++;
			assert.equal(payload.metaTitle.length, 70);
			return of({ success: true, data: { id: 1 } });
		},
		updatePage: () => of({ success: true, data: {} }),
		listPages: () => of({ success: true, data: [] }),
	};
	const alerts = { success: () => {}, getApiErrorMessage: (_error, fallback) => fallback };
	const parent = Injector.create({ providers: [] });
	const injector = createEnvironmentInjector([
		{ provide: SiteContentService, useValue: service },
		{ provide: AlertService, useValue: alerts },
	], parent);
	const page = runInInjectionContext(injector, () => new SitePagesPage());
	page.openCreate();
	page.updateForm("title", "Accueil");
	page.updateForm("metaTitle", "a".repeat(71));
	page.save();
	assert.equal(writes, 0);
	assert.ok(page.fieldError("metaTitle"));
	page.updateForm("metaTitle", "a".repeat(70));
	page.updateForm("metaDescription", "Description de la page");
	page.save();
	assert.equal(writes, 1);
	injector.destroy();
	parent.destroy();
});

test("SiteSettingsPage affiche la validation et n'envoie que les champs valides", () => {
	const writes = [];
	const service = {
		listSettings: () => of({ success: true, data: [] }),
		updateSetting: (key, value) => {
			writes.push([key, value]);
			return of({ success: true, data: { key, value } });
		},
	};
	const alerts = {
		success: () => {},
		info: () => {},
		getApiErrorMessage: (_error, fallback) => fallback,
	};
	const parent = Injector.create({ providers: [] });
	const injector = createEnvironmentInjector([
		{ provide: SiteContentService, useValue: service },
		{ provide: AlertService, useValue: alerts },
	], parent);
	const page = runInInjectionContext(injector, () => new SiteSettingsPage());
	page.updateValue("contact_email", "mauvais");
	page.updateValue("appstore_url", "https://apps.example.test/app");
	page.save();
	assert.equal(writes.length, 0);
	assert.match(page.fieldError("contact_email"), /e-mail/);
	page.updateValue("contact_email", "contact@example.test");
	page.save();
	assert.deepEqual(writes.sort((a, b) => a[0].localeCompare(b[0])), [
		["appstore_url", "https://apps.example.test/app"],
		["contact_email", "contact@example.test"],
	]);
	injector.destroy();
	parent.destroy();
});

test("authGuard refuse les rôles exclus et accepte la modération ainsi que super admin", () => {
	for (const [role, expected] of [
		["FINANCE_ADMIN", false],
		["SUPPORT_ADMIN", false],
		["MODERATION_ADMIN", true],
		["SUPER_ADMIN", true],
	]) {
		const router = { navigate: () => {} };
		const auth = { isAuthenticated: () => true, getAdminRole: () => role };
		const parent = Injector.create({ providers: [] });
		const injector = createEnvironmentInjector([
			{ provide: AdminAuthService, useValue: auth },
			{ provide: Router, useValue: router },
		], parent);
		const result = runInInjectionContext(injector, () =>
			authGuard({ data: { adminRoles: ["MODERATION_ADMIN", "SUPER_ADMIN"] } }),
		);
		assert.equal(result, expected, role);
		injector.destroy();
		parent.destroy();
	}
});
