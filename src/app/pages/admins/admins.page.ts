import { Component, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import {
	AdminService,
	AdminUserRow,
	AdminRoleType,
} from "../../services/admin.service";
import { PageHeaderComponent } from "../../shared/page-header.component";
import { StatCardComponent } from "../../shared/stat-card.component";
import { ModalComponent } from "../../shared/modal.component";
import { environment } from "../../../environments/environment.prod";

@Component({
	selector: "app-admins",
	imports: [
		CommonModule,
		RouterLink,
		PageHeaderComponent,
		StatCardComponent,
		ModalComponent,
	],
	templateUrl: "admins.page.html",
})
export class AdminsPage {
	readonly adminService = inject(AdminService);
	readonly BaseApiUrl = environment.baseApiUrl; // Assuming you have an environment file with the API base URL

	readonly admins = this.adminService.admins;
	readonly loading = this.adminService.loadingAdmins;
	readonly deleting = this.adminService.deleting;
	readonly error = this.adminService.lastError;
	readonly searchQuery = signal("");
	readonly selectedStatus = signal<
		"active" | "inactive" | "suspended" | "ALL"
	>("ALL");
	readonly selectedRole = signal<AdminRoleType | "ALL">("ALL");
	readonly showDeleteModal = signal(false);
	readonly showEditModal = signal(false);
	readonly selectedAdmin = signal<AdminUserRow | null>(null);
	readonly editForm = signal({
		fullName: "",
		email: "",
		phoneNumber: "",
		status: "active" as "active" | "inactive" | "suspended",
		adminRole: "SUPPORT_ADMIN" as AdminRoleType,
		permissions: [] as string[],
		department: "",
		notes: "",
	});

	constructor() {
		this.adminService.getAdmins(1).subscribe();
	}

	initials(name: string) {
		return name
			.split(" ")
			.map((w) => w[0])
			.join("")
			.slice(0, 2)
			.toUpperCase();
	}

	str(value: number) {
		return String(value);
	}

	roleLabel(role: AdminRoleType): string {
		const map: Record<AdminRoleType, string> = {
			SUPER_ADMIN: "Super Admin",
			FINANCE_ADMIN: "Finance",
			MODERATION_ADMIN: "Modération",
			SUPPORT_ADMIN: "Support",
		};
		return map[role] ?? role;
	}

	get statusLabel() {
		return {
			active: "Actif",
			inactive: "Inactif",
			suspended: "Suspendu",
			ALL: "Tous",
		};
	}

	openEditModal(admin: AdminUserRow) {
		this.selectedAdmin.set(admin);
		this.editForm.set({
			fullName: admin.fullName,
			email: admin.email ?? "",
			phoneNumber: admin.phoneNumber,
			status: admin.status,
			adminRole: admin.adminRole,
			permissions: admin.permissions ?? [],
			department: admin.department ?? "",
			notes: admin.notes ?? "",
		});
		this.showEditModal.set(true);
	}

	closeEditModal() {
		this.showEditModal.set(false);
		this.selectedAdmin.set(null);
	}

	confirmSaveAdmin() {
		const admin = this.selectedAdmin();
		if (!admin) {
			return;
		}

		const payload = {
			fullName: this.editForm().fullName,
			email: this.editForm().email,
			phoneNumber: this.editForm().phoneNumber,
			status: this.editForm().status,
			adminRole: this.editForm().adminRole,
			permissions: this.editForm().permissions,
			department: this.editForm().department || undefined,
			notes: this.editForm().notes || undefined,
		};

		this.adminService
			.updateAdmin(admin.id, payload)
			.subscribe((response) => {
				if (response.success) {
					this.closeEditModal();
				}
			});
	}

	openDeleteModal(admin: AdminUserRow) {
		this.selectedAdmin.set(admin);
		this.showDeleteModal.set(true);
	}

	closeDeleteModal() {
		this.showDeleteModal.set(false);
		this.selectedAdmin.set(null);
	}

	confirmDelete() {
		const admin = this.selectedAdmin();
		if (!admin) {
			return;
		}

		this.adminService.deleteAdmin(admin.id).subscribe((response) => {
			if (response.success) {
				this.closeDeleteModal();
			}
		});
	}

	setSearch(query: string) {
		this.searchQuery.set(query);
		this.adminService.setSearch(query);
		this.adminService.getAdmins(1).subscribe();
	}

	setRoleFilter(role: AdminRoleType | "ALL") {
		this.selectedRole.set(role);
		this.adminService.setRoleFilter(role);
		this.adminService.getAdmins(1).subscribe();
	}

	setStatusFilter(status: "active" | "inactive" | "suspended" | "ALL") {
		this.selectedStatus.set(status);
		this.adminService.setStatusFilter(status);
		this.adminService.getAdmins(1).subscribe();
	}

	hasPermission(permission: string) {
		return this.editForm().permissions.includes(permission);
	}

	togglePermission(permission: string) {
		const permissions = this.editForm().permissions;
		if (permissions.includes(permission)) {
			this.editForm.set({
				...this.editForm(),
				permissions: permissions.filter((p) => p !== permission),
			});
		} else {
			this.editForm.set({
				...this.editForm(),
				permissions: [...permissions, permission],
			});
		}
	}
}
