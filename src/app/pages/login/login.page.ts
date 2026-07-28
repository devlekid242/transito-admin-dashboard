import { Component, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { AdminAuthService } from "../../services/admin-auth.service";

@Component({
	selector: "app-login",
	standalone: true,
	imports: [CommonModule, FormsModule],
	templateUrl: "login.page.html",
})
export class LoginPage {
	private router = inject(Router);
	private adminAuthService = inject(AdminAuthService);
	readonly loading = signal(false);
	readonly showPass = signal(false);
	readonly errorMsg = signal("");

	email = "";
	password = "";

	handleSubmit() {
		this.errorMsg.set("");
		const email = this.email.trim();
		const password = this.password;
		if (!email || !password) {
			this.errorMsg.set("Veuillez remplir tous les champs.");
			return;
		}

		this.loading.set(true);
		this.adminAuthService.login(email, password).subscribe({
			next: () => {
				this.router.navigate(["/dashboard"]);
				this.loading.set(false);
			},
			error: (err: Error) => {
				this.errorMsg.set(err.message || "Échec de connexion.");
				this.loading.set(false);
			}
		});
	}
}