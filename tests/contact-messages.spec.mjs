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
import { of } from "rxjs";
import {
	ContactMessageService,
} from "../src/app/services/contact-message.service.ts";
import {
	ContactMessagesPage,
} from "../src/app/pages/contact-messages/contact-messages.page.ts";
import { AlertService } from "../src/app/services/alert.service.ts";

const message = {
	id: 17,
	name: "Ada Example",
	email: "ada@example.test",
	subject: "Question",
	status: "NEW",
	createdAt: "2026-10-24T10:00:00+00:00",
	readAt: null,
	readBy: null,
	message: "Bonjour, ceci est un message.",
};

function createHttpInjector() {
	const parentInjector = Injector.create({ providers: [] });
	return createEnvironmentInjector([
		provideHttpClient(withNoXsrfProtection()),
		provideHttpClientTesting(),
		{ provide: PendingTasks, useValue: { add: () => () => {} } },
		ContactMessageService,
	], parentInjector);
}

test("ContactMessageService envoie les filtres serveur et extrait les opérations admin", () => {
	const injector = createHttpInjector();
	const service = runInInjectionContext(injector, () =>
		injector.get(ContactMessageService),
	);
	const http = injector.get(HttpTestingController);
	let listResponse;
	service
		.list({ status: "NEW", search: "Ada", page: 2, limit: 20 })
		.subscribe((response) => (listResponse = response));
	const listRequest = http.expectOne(
		(request) =>
			request.url.endsWith("/api/admin/contact-messages") &&
			request.params.get("status") === "NEW" &&
			request.params.get("search") === "Ada" &&
			request.params.get("page") === "2" &&
			request.params.get("limit") === "20",
	);
	listRequest.flush({
		success: true,
		data: [message],
		pagination: { page: 2, limit: 20, total: 21, totalPages: 2 },
	});
	assert.equal(listResponse.pagination.total, 21);

	let detail;
	service.get(17).subscribe((response) => (detail = response.data));
	http.expectOne((request) =>
		request.url.endsWith("/api/admin/contact-messages/17"),
	).flush({
		success: true,
		data: message,
	});
	assert.equal(detail.message, message.message);

	let statusResponse;
	service
		.updateStatus(17, "READ")
		.subscribe((response) => (statusResponse = response.data));
	const statusRequest = http.expectOne((request) =>
		request.url.endsWith("/api/admin/contact-messages/17/status"),
	);
	assert.equal(statusRequest.request.method, "PATCH");
	assert.deepEqual(statusRequest.request.body, { status: "READ" });
	statusRequest.flush({ success: true, data: { ...message, status: "READ" } });
	assert.equal(statusResponse.status, "READ");

	service.delete(17).subscribe();
	const deleteRequest = http.expectOne((request) =>
		request.url.endsWith("/api/admin/contact-messages/17"),
	);
	assert.equal(deleteRequest.request.method, "DELETE");
	deleteRequest.flush({ success: true });
	http.verify();
	injector.destroy();
});

test("ContactMessagesPage charge les messages, ouvre le détail et marque comme lu", async () => {
	let currentMessage = message;
	let deleteCalls = 0;
	let confirmationCalls = 0;
	const alerts = {
		getApiErrorMessage: (_error, fallback) => fallback,
		apiError: () => {},
		success: () => {},
		confirm: async () => {
			confirmationCalls++;
			return true;
		},
	};
	const service = {
		list: () =>
			of({
				success: true,
				data: [currentMessage],
				pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
			}),
		get: () => of({ success: true, data: message }),
		updateStatus: (_id, status) => {
			currentMessage = { ...currentMessage, status };
			return of({ success: true, data: currentMessage });
		},
		delete: () => {
			deleteCalls++;
			return of({ success: true });
		},
	};
	const parentInjector = Injector.create({ providers: [] });
	const injector = createEnvironmentInjector(
		[
			{ provide: ContactMessageService, useValue: service },
			{ provide: AlertService, useValue: alerts },
		],
		parentInjector,
	);
	const page = runInInjectionContext(
		injector,
		() => new ContactMessagesPage(),
	);

	page.ngOnInit();
	assert.equal(page.messages().length, 1);
	assert.equal(page.newMessagesOnPage(), 1);
	page.openDetails(message);
	assert.equal(page.selectedMessage().message, message.message);
	await page.markAsRead();
	assert.equal(page.selectedMessage().status, "READ");
	assert.equal(page.newMessagesOnPage(), 0);
	await page.archive();
	assert.equal(page.selectedMessage().status, "ARCHIVED");
	await page.deleteMessage();
	assert.equal(deleteCalls, 1);
	assert.equal(confirmationCalls, 1);
	assert.equal(page.selectedMessage(), null);

	injector.destroy();
});
