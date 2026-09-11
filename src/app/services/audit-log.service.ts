import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment.prod";
import {
	AuditLogFilters,
	AuditLogResponse,
} from "../models/audit-log.model";

@Injectable({ providedIn: "root" })
export class AuditLogService {
	private readonly http = inject(HttpClient);
	private readonly endpoint = `${environment.apiUrl}/admin/audit/domain-logs`;

	list(filters: AuditLogFilters = {}): Observable<AuditLogResponse> {
		let params = new HttpParams()
			.set("page", String(filters.page ?? 1))
			.set("limit", String(filters.limit ?? 50));

		for (const [key, value] of Object.entries(filters)) {
			if (key !== "page" && key !== "limit" && value) {
				params = params.set(key, value);
			}
		}

		return this.http.get<AuditLogResponse>(this.endpoint, { params });
	}
}