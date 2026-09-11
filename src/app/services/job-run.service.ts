import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment.prod";
import { JobRun, JobRunListResponse } from "../models/job-run.model";

export interface JobRunFilters {
	commandName?: string | null;
	status?: string | null;
	since?: string | null;
	page?: number;
	limit?: number;
}

@Injectable({ providedIn: "root" })
export class JobRunService {
	private http = inject(HttpClient);
	private baseUrl = `${environment.baseApiUrl}/api/admin/job-runs`;

	list(filters: JobRunFilters = {}): Observable<JobRunListResponse> {
		let params = new HttpParams()
			.set("page", String(filters.page ?? 1))
			.set("limit", String(filters.limit ?? 50));

		if (filters.commandName) {
			params = params.set("commandName", filters.commandName);
		}
		if (filters.status) {
			params = params.set("status", filters.status);
		}
		if (filters.since) {
			params = params.set("since", filters.since);
		}

		return this.http.get<JobRunListResponse>(this.baseUrl, { params });
	}

	latest(): Observable<JobRun[]> {
		return this.http.get<JobRun[]>(`${this.baseUrl}/latest`);
	}

	get(id: number): Observable<JobRun> {
		return this.http.get<JobRun>(`${this.baseUrl}/${id}`);
	}
}