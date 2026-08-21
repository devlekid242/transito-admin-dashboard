import { Component, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { AdminAuthService } from "../../services/admin-auth.service";
import { AlertService } from "../../services/alert.service";

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
	readonly alertService = inject(AlertService);
	readonly emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

	email = "";
	password = "";

	handleSubmit() {
		this.errorMsg.set("");
		// check email format
		const email = this.email.trim();
		const password = this.password;
		if (!email || !password) {
			this.errorMsg.set("Veuillez remplir tous les champs.");
			return;
		}
		
		if (!this.emailPattern.test(email)) {
			this.errorMsg.set("Veuillez entrer une adresse email valide.");
			return;
		}

		this.loading.set(true);
		this.adminAuthService.login(email, password).subscribe({
			next: () => {
				this.router.navigate(["/dashboard"]);
				this.loading.set(false);
			},
			error: (err: Error) => {
				this.alertService.error("Un probleme est survenue lors de l'authentification veuillez contacter le service technique en cas ou l'erreur persiste");
				this.errorMsg.set(err.message || "Échec de connexion.");
				this.loading.set(false);
			}
		});
	}
}