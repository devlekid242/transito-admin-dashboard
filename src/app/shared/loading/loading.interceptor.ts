import { Injectable } from "@angular/core";
import {
	HttpEvent,
	HttpHandler,
	HttpInterceptor,
	HttpRequest,
} from "@angular/common/http";
import { Observable } from "rxjs";
import { finalize } from "rxjs/operators";
import { LoadingService } from "./loading.service";

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
	constructor(private loading: LoadingService) {}

	intercept(
		req: HttpRequest<any>,
		next: HttpHandler,
	): Observable<HttpEvent<any>> {
		// Only track API calls to the backend; adjust URL pattern if needed
		const shouldTrack =
			req.url && !req.url.includes("/assets/") && req.method !== "GET"
				? true
				: true;

		if (shouldTrack) {
			this.loading.show();
		}

		return next.handle(req).pipe(
			finalize(() => {
				if (shouldTrack) {
					this.loading.hide();
				}
			}),
		);
	}
}
