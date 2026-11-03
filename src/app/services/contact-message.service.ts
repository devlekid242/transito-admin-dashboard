import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";

export type ContactMessageStatus = "NEW" | "READ" | "ARCHIVED";

export interface ContactMessage {
	id: number;
	name: string;
	email: string;
	subject: string;
	status: ContactMessageStatus;
	createdAt: string;
	readAt: string | null;
	readBy: { id: number; name: string | null } | null;
	message?: string;
}

export interface ContactMessageListResponse {
	success: boolean;
	data: ContactMessage[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface ContactMessageResponse {
	success: boolean;
	data: ContactMessage;
}

export interface ContactMessageListParams {
	status?: ContactMessageStatus;
	search?: string;
	page?: number;
	limit?: number;
}

@Injectable({ providedIn: "root" })
export class ContactMessageService {
	private readonly http = inject(HttpClient);
	private readonly apiUrl = `${environment.apiUrl}/admin/contact-messages`;

	list(
		filters: ContactMessageListParams = {},
	): Observable<ContactMessageListResponse> {
		let params = new HttpParams();
		if (filters.status) params = params.set("status", filters.status);
		if (filters.search?.trim()) {
			params = params.set("search", filters.search.trim());
		}
		if (filters.page !== undefined) {
			params = params.set("page", filters.page);
		}
		if (filters.limit !== undefined) {
			params = params.set("limit", filters.limit);
		}

		return this.http.get<ContactMessageListResponse>(this.apiUrl, {
			params,
		});
	}

	get(id: number): Observable<ContactMessageResponse> {
		return this.http.get<ContactMessageResponse>(`${this.apiUrl}/${id}`);
	}

	updateStatus(
		id: number,
		status: ContactMessageStatus,
	): Observable<ContactMessageResponse> {
		return this.http.patch<ContactMessageResponse>(
			`${this.apiUrl}/${id}/status`,
			{ status },
		);
	}

	delete(id: number): Observable<{ success: boolean }> {
		return this.http.delete<{ success: boolean }>(
			`${this.apiUrl}/${id}`,
		);
	}
}
