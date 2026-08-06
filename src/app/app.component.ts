import { Component, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, RouterOutlet } from "@angular/router";
import { AdminAuthService } from "./services/admin-auth.service";
import { LoaderComponent } from "./shared/loader/loader.component";
import { LoadingService } from "./shared/loading/loading.service";
import { AsyncPipe } from "@angular/common";

@Component({
	selector: "app-root",
	imports: [CommonModule, RouterOutlet, LoaderComponent, AsyncPipe],
	templateUrl: "app.component.html",
})
export class AppComponent {
	private router = inject(Router);
	private adminAuthService = inject(AdminAuthService);
	private loadingService = inject(LoadingService);
	readonly checking = signal(true);
	readonly loading$ = this.loadingService.loading$;

	constructor() {
		setTimeout(() => {
			if (!this.adminAuthService.isAuthenticated()) {
				const currentUrl = this.router.url;
				if (!currentUrl.startsWith("/login")) {
					this.router.navigate(["/login"]);
				}
			}
			this.checking.set(false);
		}, 300);
	}
}
