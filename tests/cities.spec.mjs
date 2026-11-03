import assert from "node:assert/strict";
import test from "node:test";
import {
	createEnvironmentInjector,
	Injector,
	PendingTasks,
	runInInjectionContext,
} from "@angular/core";
import {
	HttpClient,
	HttpEventType,
	provideHttpClient,
	withNoXsrfProtection,
} from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
} from "@angular/common/http/testing";
import { CityService } from "../src/app/services/city.service.ts";
import { CitiesPage } from "../src/app/pages/cities/cities.page.ts";

function createContext() {
	const parent = Injector.create({ providers: [] });
	const injector = createEnvironmentInjector(
		[
			provideHttpClient(withNoXsrfProtection()),
			provideHttpClientTesting(),
			{ provide: PendingTasks, useValue: { add: () => () => {} } },
			CityService,
		],
		parent,
	);
	return { parent, injector, http: injector.get(HttpTestingController) };
}

function city(overrides = {}) {
	return {
		id: 12,
		name: "Brazzaville",
		code: "BZV",
		country: "Congo",
		isActive: true,
		showOnSite: true,
		siteDisplayOrder: 0,
		hasImage: false,
		imagePreviewUrl: null,
		tripsCount: 2,
		boardingPointsCount: 1,
		createdAt: "2026-01-01T00:00:00+00:00",
		...overrides,
	};
}

function finish({ injector, parent, http }) {
	http.verify();
	injector.destroy();
	parent.destroy();
}

function expectApiRequest(http, path) {
	return http.expectOne((request) => request.url.endsWith(path));
}

test("CityService filtre les villes avec showOnSite", () => {
	const context = createContext();
	const service = context.injector.get(CityService);
	service.getCities(undefined, undefined, true).subscribe();
	const request = context.http.expectOne(
		(request) =>
			request.url.endsWith("/api/admin/cities") &&
			request.params.get("showOnSite") === "true",
	);
	request.flush({ success: true, data: [city()] });
	assert.equal(service.cities()[0].showOnSite, true);
	finish(context);
});

test("CityService envoie le PATCH de visibilité brut et applique son résultat", () => {
	const context = createContext();
	const service = context.injector.get(CityService);
	service.cities.set([city()]);
	const payload = [
		{ id: 12, showOnSite: false, siteDisplayOrder: 4 },
	];
	service.updateSiteVisibility(payload).subscribe();
	const request = expectApiRequest(context.http, "/api/admin/cities/site-visibility");
	assert.equal(request.request.method, "PATCH");
	assert.deepEqual(request.request.body, payload);
	request.flush({
		success: true,
		data: [city({ showOnSite: false, siteDisplayOrder: 4 })],
	});
	assert.equal(service.cities()[0].showOnSite, false);
	finish(context);
});

test("CityService envoie l’image en multipart et suit la progression", () => {
	const context = createContext();
	const service = context.injector.get(CityService);
	service.cities.set([city()]);
	const file = new Blob(["image"], { type: "image/png" });
	const events = [];
	service.uploadCityImage(12, file).subscribe((event) => {
		if (event.type === HttpEventType.UploadProgress) {
			events.push(service.uploadProgress());
		}
	});
	const request = expectApiRequest(context.http, "/api/admin/cities/12/image");
	assert.equal(request.request.method, "POST");
	assert.equal(request.request.reportProgress, true);
	assert.equal(request.request.body instanceof FormData, true);
	assert.equal(request.request.body.has("image"), true);
	request.event({ type: HttpEventType.UploadProgress, loaded: 25, total: 100 });
	assert.equal(service.uploadProgress(), 25);
	request.flush({ success: true, data: city({ hasImage: true }) });
	assert.deepEqual(events, [25]);
	assert.equal(service.cities()[0].hasImage, true);
	finish(context);
});

test("CityService supprime une image et télécharge une prévisualisation authentifiée", () => {
	const context = createContext();
	const service = context.injector.get(CityService);
	service.cities.set([city({ hasImage: true })]);
	service.deleteCityImage(12).subscribe();
	const deletion = expectApiRequest(context.http, "/api/admin/cities/12/image");
	assert.equal(deletion.request.method, "DELETE");
	deletion.flush({ success: true, data: city({ hasImage: false }) });
	assert.equal(service.cities()[0].hasImage, false);

	service.getCityImagePreview(12).subscribe();
	const preview = expectApiRequest(context.http, "/api/admin/cities/12/image");
	assert.equal(preview.request.method, "GET");
	assert.equal(preview.request.responseType, "blob");
	preview.flush(new Blob(["image"], { type: "image/webp" }));
	finish(context);
});

test("CitiesPage confirme le masquage et n’envoie le PATCH qu’après confirmation", () => {
	const context = createContext();
	const page = runInInjectionContext(
		context.injector,
		() => new CitiesPage(),
	);
	expectApiRequest(context.http, "/api/admin/cities").flush({
		success: true,
		data: [city()],
	});

	page.requestVisibilityToggle(page.cities()[0]);
	assert.equal(page.showVisibilityConfirm(), true);
	context.http.expectNone((request) =>
		request.url.endsWith("/api/admin/cities/site-visibility"),
	);

	page.confirmHideFromSite();
	const request = expectApiRequest(context.http, "/api/admin/cities/site-visibility");
	assert.deepEqual(request.request.body, [
		{ id: 12, showOnSite: false, siteDisplayOrder: 0 },
	]);
	request.flush({
		success: true,
		data: [city({ showOnSite: false })],
	});
	assert.equal(page.showVisibilityConfirm(), false);
	assert.equal(page.shownOnSiteCount(), 0);
	expectApiRequest(context.http, "/api/admin/cities").flush({
		success: true,
		data: [city({ showOnSite: false })],
	});
	finish(context);
});

test("CitiesPage réordonne la liste affichée puis envoie un seul PATCH", () => {
	const context = createContext();
	const page = runInInjectionContext(
		context.injector,
		() => new CitiesPage(),
	);
	expectApiRequest(context.http, "/api/admin/cities").flush({
		success: true,
		data: [
			city(),
			city({
				id: 18,
				name: "Pointe-Noire",
				code: "PNR",
				siteDisplayOrder: 1,
			}),
		],
	});

	page.openOrganizer();
	page.moveOrganizedCity(1, -1);
	page.saveOrganizerOrder();
	const request = expectApiRequest(context.http, "/api/admin/cities/site-visibility");
	assert.deepEqual(request.request.body, [
		{ id: 18, showOnSite: true, siteDisplayOrder: 0 },
		{ id: 12, showOnSite: true, siteDisplayOrder: 1 },
	]);
	request.flush({
		success: true,
		data: [
			city({ id: 18, name: "Pointe-Noire", code: "PNR", siteDisplayOrder: 0 }),
			city({ siteDisplayOrder: 1 }),
		],
	});
	assert.equal(page.showOrganizerModal(), false);
	expectApiRequest(context.http, "/api/admin/cities").flush({
		success: true,
		data: [
			city({ id: 18, name: "Pointe-Noire", code: "PNR", siteDisplayOrder: 0 }),
			city({ siteDisplayOrder: 1 }),
		],
	});
	finish(context);
});

test("CitiesPage conserve le formulaire après création pour permettre l’ajout de l’image", () => {
	const context = createContext();
	const page = runInInjectionContext(
		context.injector,
		() => new CitiesPage(),
	);
	expectApiRequest(context.http, "/api/admin/cities").flush({
		success: true,
		data: [],
	});

	page.openCreateModal();
	page.form.name = "Dolisie";
	page.saveCity();
	const request = expectApiRequest(context.http, "/api/admin/cities");
	assert.equal(request.request.method, "POST");
	assert.equal(request.request.body.showOnSite, false);
	assert.equal(request.request.body.siteDisplayOrder, null);
	request.flush({ success: true, data: city({ id: 25, name: "Dolisie" }) });
	assert.equal(page.formMode(), "edit");
	assert.equal(page.editingCity().id, 25);
	assert.equal(page.showFormModal(), true);
	finish(context);
});

test("CitiesPage affiche l’échec du PATCH sans fermer l’organisateur", () => {
	const context = createContext();
	const page = runInInjectionContext(
		context.injector,
		() => new CitiesPage(),
	);
	expectApiRequest(context.http, "/api/admin/cities").flush({
		success: true,
		data: [city()],
	});
	page.openOrganizer();
	page.saveOrganizerOrder();
	expectApiRequest(context.http, "/api/admin/cities/site-visibility").flush(
		{ success: false, message: "Erreur de validation" },
		{ status: 422, statusText: "Unprocessable Entity" },
	);
	assert.equal(page.showOrganizerModal(), true);
	assert.match(page.organizerError(), /Erreur de validation/);
	finish(context);
});

test("CitiesPage filtre l’affichage public avec isActive et showOnSite", () => {
	const context = createContext();
	const page = runInInjectionContext(
		context.injector,
		() => new CitiesPage(),
	);
	expectApiRequest(context.http, "/api/admin/cities").flush({
		success: true,
		data: [
			city(),
			city({ id: 13, isActive: false, showOnSite: true }),
			city({ id: 14, showOnSite: false }),
		],
	});
	page.onSiteVisibilityFilter("shown");
	assert.deepEqual(page.filteredCities().map((item) => item.id), [12]);
	page.onSiteVisibilityFilter("hidden");
	assert.deepEqual(
		page
			.filteredCities()
			.map((item) => item.id)
			.sort(),
		[13, 14],
	);
	finish(context);
});
