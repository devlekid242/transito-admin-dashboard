import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";

export type SitePageSlug = "home" | "agences" | "contact" | "confidentialite";
export type SitePublicationStatus = "DRAFT" | "PUBLISHED";
export type SiteContentBlockType =
	| "HERO"
	| "TEXT"
	| "STEPS"
	| "CTA"
	| "LINK_LIST"
	| "FEATURES"
	| "IMAGE";
export type SiteSettingKey =
	| "contact_phone"
	| "contact_whatsapp"
	| "contact_email"
	| "office_address"
	| "office_hours"
	| "appstore_url"
	| "playstore_url"
	| "social_facebook"
	| "social_instagram"
	| "social_x"
	| "social_linkedin"
	| "terms_url";

export interface SitePage {
	id: number;
	slug: SitePageSlug;
	title: string;
	metaTitle: string | null;
	metaDescription: string | null;
	status: SitePublicationStatus;
	publishedAt: string | null;
	updatedAt: string;
	updatedBy: { id: number; name: string | null } | null;
}

export interface SiteContentBlock {
	id: number;
	pageId: number;
	blockKey: string;
	type: SiteContentBlockType;
	payload: Record<string, unknown>;
	position: number;
	status: SitePublicationStatus;
	updatedAt: string;
}

export interface SiteSetting {
	key: SiteSettingKey;
	value: string;
	updatedAt: string;
}

export interface SiteApiResponse<T> {
	success: boolean;
	data: T;
}

export interface SiteValidationError {
	success: false;
	errors?: Record<string, string[]>;
	message?: string;
}

@Injectable({ providedIn: "root" })
export class SiteContentService {
	private readonly http = inject(HttpClient);
	private readonly baseUrl = `${environment.apiUrl}/admin/site`;

	listPages(): Observable<SiteApiResponse<SitePage[]>> {
		return this.http.get<SiteApiResponse<SitePage[]>>(`${this.baseUrl}/pages`);
	}

	createPage(payload: SitePageWrite): Observable<SiteApiResponse<SitePage>> {
		return this.http.post<SiteApiResponse<SitePage>>(`${this.baseUrl}/pages`, payload);
	}

	updatePage(id: number, payload: Partial<SitePageWrite>): Observable<SiteApiResponse<SitePage>> {
		return this.http.patch<SiteApiResponse<SitePage>>(`${this.baseUrl}/pages/${id}`, payload);
	}

	setPageStatus(id: number, status: SitePublicationStatus): Observable<SiteApiResponse<SitePage>> {
		return this.http.patch<SiteApiResponse<SitePage>>(
			`${this.baseUrl}/pages/${id}/publication`,
			{ status },
		);
	}

	deletePage(id: number): Observable<{ success: boolean }> {
		return this.http.delete<{ success: boolean }>(`${this.baseUrl}/pages/${id}`);
	}

	listBlocks(pageId?: number): Observable<SiteApiResponse<SiteContentBlock[]>> {
		let params = new HttpParams();
		if (pageId !== undefined) params = params.set("pageId", pageId);
		return this.http.get<SiteApiResponse<SiteContentBlock[]>>(`${this.baseUrl}/blocks`, { params });
	}

	createBlock(payload: SiteBlockWrite): Observable<SiteApiResponse<SiteContentBlock>> {
		return this.http.post<SiteApiResponse<SiteContentBlock>>(`${this.baseUrl}/blocks`, payload);
	}

	updateBlock(id: number, payload: Partial<SiteBlockWrite>): Observable<SiteApiResponse<SiteContentBlock>> {
		return this.http.patch<SiteApiResponse<SiteContentBlock>>(`${this.baseUrl}/blocks/${id}`, payload);
	}

	setBlockStatus(id: number, status: SitePublicationStatus): Observable<SiteApiResponse<SiteContentBlock>> {
		return this.http.patch<SiteApiResponse<SiteContentBlock>>(
			`${this.baseUrl}/blocks/${id}/publication`,
			{ status },
		);
	}

	deleteBlock(id: number): Observable<{ success: boolean }> {
		return this.http.delete<{ success: boolean }>(`${this.baseUrl}/blocks/${id}`);
	}

	reorderBlocks(items: { id: number; position: number }[]): Observable<{ success: boolean }> {
		return this.http.post<{ success: boolean }>(`${this.baseUrl}/blocks/reorder`, { items });
	}

	listSettings(): Observable<SiteApiResponse<SiteSetting[]>> {
		return this.http.get<SiteApiResponse<SiteSetting[]>>(`${this.baseUrl}/settings`);
	}

	updateSetting(key: SiteSettingKey, value: string): Observable<SiteApiResponse<SiteSetting>> {
		return this.http.put<SiteApiResponse<SiteSetting>>(`${this.baseUrl}/settings/${key}`, { value });
	}

	deleteSetting(key: SiteSettingKey): Observable<{ success: boolean }> {
		return this.http.delete<{ success: boolean }>(`${this.baseUrl}/settings/${key}`);
	}
}

export interface SitePageWrite {
	slug: SitePageSlug;
	title: string;
	metaTitle: string | null;
	metaDescription: string | null;
}

export interface SiteBlockWrite {
	pageId: number;
	blockKey: string;
	type: SiteContentBlockType;
	payload: Record<string, unknown>;
	position: number;
	status: SitePublicationStatus;
}
