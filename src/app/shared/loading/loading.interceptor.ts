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
		// On ne tracke que les requêtes GET (hors /assets/), pour ne pas afficher
		// le loader sur les POST/PUT/DELETE etc.
		const shouldTrack = req.method === "GET" && !req.url.includes("/assets/");

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