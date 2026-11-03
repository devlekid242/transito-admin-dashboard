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
	provideHttpClient,
	withNoXsrfProtection,
} from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
} from "@angular/common/http/testing";
import { of } from "rxjs";
import { FAQManagementPage } from "../src/app/pages/faq-management/faq-management.page.ts";
import { SupportService } from "../src/app/services/support.service.ts";

test("SupportService filtre les FAQ admin par audience", () => {
	const parent = Injector.create({ providers: [] });
	const injector = createEnvironmentInjector(
		[
			provideHttpClient(withNoXsrfProtection()),
			provideHttpClientTesting(),
			{ provide: PendingTasks, useValue: { add: () => () => {} } },
		],
		parent,
	);
	const service = runInInjectionContext(
		injector,
		() => new SupportService(injector.get(HttpClient)),
	);
	service.currentFAQFilter.set({
		activeOnly: true,
		audience: "AGENCY",
	});
	service.getFAQs().subscribe();

	const request = injector
		.get(HttpTestingController)
		.expectOne(
			(request) =>
				request.urlWithParams.includes(
					"/api/admin/support/faqs?audience=AGENCY&active_only=true",
				),
		);
	request.flush({ data: [], total: 0 });
	injector.get(HttpTestingController).verify();
	injector.destroy();
	parent.destroy();
});

test("FAQManagementPage utilise ALL par défaut et transmet l'audience à la création et à la mise à jour", () => {
	let createdFaq;
	let updatedFaq;
	const service = {
		getFAQCategories: () => of({ categories: [] }),
		getFAQs: () => of([]),
		clearError: () => {},
		createFAQ: (faq) => {
			createdFaq = faq;
			return of(faq);
		},
		updateFAQ: (_id, faq) => {
			updatedFaq = faq;
			return of(faq);
		},
		deleteFAQ: () => of(true),
		faqs: () => [],
		currentFAQFilter: () => ({ activeOnly: true }),
		updateFAQFilter: () => {},
		resetFAQFilters: () => {},
	};
	const parent = Injector.create({ providers: [] });
	const injector = createEnvironmentInjector(
		[{ provide: SupportService, useValue: service }],
		parent,
	);
	const page = runInInjectionContext(
		injector,
		() => new FAQManagementPage(),
	);

	page.openCreateModal();
	assert.equal(page.newFAQ().audience, "ALL");
	page.updateNewFAQ("audience", "AGENCY");
	page.createFAQ();
	assert.equal(createdFaq.audience, "AGENCY");

	page.openEditModal({
		id: 5,
		question: "Question",
		answer: "Réponse",
		category: "general",
		audience: "TRAVELER",
		orderPriority: 0,
		isActive: true,
	});
	page.updateCurrentFAQ("audience", "ALL");
	page.updateFAQ();
	assert.equal(updatedFaq.audience, "ALL");

	injector.destroy();
	parent.destroy();
});
