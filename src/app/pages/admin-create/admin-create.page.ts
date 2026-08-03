import { Component, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, RouterLink } from "@angular/router";
import { AdminService, AdminRoleType } from "../../services/admin.service";
import { PageHeaderComponent } from "../../shared/page-header.component";

interface AdminCreateForm {
	fullName: string;
	email: string;
	phoneNumber: string;
	password: string;
	adminRole: AdminRoleType;
	permissions: string[];
	department: string;
	notes: string;
}

@Component({
	selector: "app-admin-create",
	imports: [CommonModule, RouterLink, PageHeaderComponent],
	templateUrl: "admin-create.page.html",
})
export class AdminCreatePage {
	private readonly router = inject(Router);
	private readonly adminService = inject(AdminService);

	readonly currentStep = signal(1);
	readonly form = signal<AdminCreateForm>({
		fullName: "",
		email: "",
		phoneNumber: "",
		password: "",
		adminRole: "SUPPORT_ADMIN",
		permissions: [],
		department: "",
		notes: "",
	});
	readonly saving = this.adminService.saving;
	readonly lastError = this.adminService.lastError;

	readonly steps = [
		{ num: 1, title: "Informations", desc: "Identité" },
		{ num: 2, title: "Rôle", desc: "Permissions" },
		{ num: 3, title: "Sécurité", desc: "Mot de passe & 2FA" },
		{ num: 4, title: "Terminé", desc: "Création" },
	];

	readonly roleOptions = [
		{
			value: "SUPER_ADMIN" as AdminRoleType,
			label: "Super Admin",
			desc: "Pleine gestion de la plateforme",
		},
		{
			value: "FINANCE_ADMIN" as AdminRoleType,
			label: "Finance",
			desc: "Gère les retraits, remboursements et finances",
		},
		{
			value: "MODERATION_ADMIN" as AdminRoleType,
			label: "Modération",
			desc: "Gère les agences, KYC et utilisateurs",
		},
		{
			value: "SUPPORT_ADMIN" as AdminRoleType,
			label: "Support",
			desc: "Répond aux tickets de support",
		},
	];

	readonly permissionOptions = [
		"Voir utilisateurs",
		"Gérer administrateurs",
		"Voir finances",
		"Valider retraits",
		"Forcer remboursements",
		"Gérer agences",
		"Valider KYC",
		"Répondre tickets",
		"Voir rapports",
	];

	nextStep() {
		this.currentStep.update((v) => Math.min(v + 1, 4));
	}
	prevStep() {
		this.currentStep.update((v) => Math.max(v - 1, 1));
	}

	updateField(field: keyof AdminCreateForm, value: string | string[]) {
		this.form.set({ ...this.form(), [field]: value });
	}

	togglePermission(permission: string) {
		const permissions = this.form().permissions;
		this.form.set({
			...this.form(),
			permissions: permissions.includes(permission)
				? permissions.filter((item) => item !== permission)
				: [...permissions, permission],
		});
	}

	createAdmin() {
		const payload = {
			fullName: this.form().fullName.trim(),
			email: this.form().email.trim(),
			phoneNumber: this.form().phoneNumber.trim(),
			password: this.form().password,
			adminRole: this.form().adminRole,
			permissions: this.form().permissions,
			department: this.form().department.trim() || undefined,
			notes: this.form().notes.trim() || undefined,
		};

		this.adminService.createAdmin(payload).subscribe((response) => {
			if (response.success) {
				this.currentStep.set(4);
				setTimeout(() => {
					this.router.navigate(["/admin/admins"]);
				}, 1000);
			}
		});
	}

	reset() {
		this.currentStep.set(1);
		this.form.set({
			fullName: "",
			email: "",
			phoneNumber: "",
			password: "",
			adminRole: "SUPPORT_ADMIN",
			permissions: [],
			department: "",
			notes: "",
		});
	}
}
