import { Injectable, Injector } from "@angular/core";
import {
	HttpEvent,
	HttpHandler,
	HttpInterceptor,
	HttpErrorResponse,
	HttpRequest,
} from "@angular/common/http";
import { Observable, from, throwError } from "rxjs";
import { catchError, switchMap } from "rxjs/operators";
import { AdminAuthService } from "../services/admin-auth.service";
import { environment } from "../../environments/environment";

@Injectable()
export class AdminTokenInterceptor implements HttpInterceptor {
	private refreshPromise: Promise<string | null> | null = null;
	private authService!: AdminAuthService;

	constructor(private injector: Injector) {}

	/**
	 * Récupère dynamiquement AdminAuthService pour éviter la dépendance circulaire
	 */
	private getAuthService(): AdminAuthService {
		if (!this.authService) {
			this.authService = this.injector.get(AdminAuthService);
		}
		return this.authService;
	}

	/**
	 * Check if route is public (auth routes)
	 */
	private isPublicAuthRoute(url: string): boolean {
		return [
			"/auth/login",
			"/auth/register",
			"/auth/refresh",
			"/auth/request-reset",
			"/auth/verify-reset",
		].some((route) => url.includes(route));
	}

	/**
	 * Add Authorization header with Bearer token
	 */
	private addAuthHeaders(
		req: HttpRequest<any>,
		token: string,
	): HttpRequest<any> {
		const headers: { [key: string]: string } = {
			Authorization: `Bearer ${token}`,
		};

		// Add admin role header
		const authService = this.getAuthService();
		const adminRole = authService.getAdminRole();
		if (adminRole) {
			headers["X-User-Role"] = "admin";
			headers["X-Admin-Role"] = adminRole;
		}

		if (
			!(req.body instanceof FormData) &&
			!req.headers.has("Content-Type")
		) {
			headers["Content-Type"] = "application/json";
		}

		return req.clone({ setHeaders: headers });
	}

	intercept(
		req: HttpRequest<any>,
		next: HttpHandler,
	): Observable<HttpEvent<any>> {
		const isApiRequest = req.url.startsWith(environment.apiUrl);
		const shouldAttachToken =
			isApiRequest && !this.isPublicAuthRoute(req.url);

		const authService = this.getAuthService();
		const token = authService.getToken();
		let authRequest = req;

		// Add token if available
		if (shouldAttachToken && token) {
			authRequest = this.addAuthHeaders(req, token);
		}

		return next.handle(authRequest).pipe(
			catchError((error: HttpErrorResponse) => {
				// If 401 and we have a refresh token, try to refresh
				if (
					error.status !== 401 ||
					!isApiRequest ||
					this.isPublicAuthRoute(req.url) ||
					!authService.getRefreshToken()
				) {
					return throwError(() => error);
				}

				// Try to refresh token
				if (!this.refreshPromise) {
					this.refreshPromise = authService
						.refreshAccessToken()
						.finally(() => (this.refreshPromise = null));
				}

				return from(this.refreshPromise).pipe(
					switchMap((newToken) => {
						if (!newToken) {
							return throwError(() => error);
						}

						const retriedRequest = this.addAuthHeaders(
							req,
							newToken,
						);
						return next.handle(retriedRequest);
					}),
					catchError(() => throwError(() => error)),
				);
			}),
		);
	}
}
