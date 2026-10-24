import { Component, inject, signal, effect, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { HttpEvent, HttpEventType } from "@angular/common/http";
import { AdminProfileService } from "../../services/admin-profile.service";
import { PageHeaderComponent } from "../../shared/page-header.component";
import { environment } from "../../../environments/environment";

@Component({
	selector: "app-admin-profile",
	standalone: true,
	imports: [CommonModule, FormsModule, PageHeaderComponent],
	templateUrl: "admin-profile.page.html",
	styleUrls: ["admin-profile.page.css"],
})
export class AdminProfilePage implements OnInit {
	readonly profileService = inject(AdminProfileService);

	readonly BaseApiUrl = environment.baseApiUrl; // Assuming you have an environment file with the API base URL

	// Form data
	profileForm = signal({
		fullName: "",
		email: "",
		phoneNumber: "",
		department: "",
		profilePhotoUrl: "",
	});

	securityForm = signal({
		currentPassword: "",
		newPassword: "",
		confirmPassword: "",
	});

	// Photo upload
	photoFile = signal<File | null>(null);
	photoPreview = signal<string | null>(null);
	isEditingPhoto = signal(false);

	// Edit mode
	isEditingProfile = signal(false);
	isEditingPassword = signal(false);

	constructor() {
		// Update form data when profile changes
		effect(() => {
			const profile = this.profileService.profile();
			if (profile) {
				this.profileForm.set({
					fullName: profile.fullName || "",
					email: profile.email || "",
					phoneNumber: profile.phoneNumber || "",
					department: profile.department || "",
					profilePhotoUrl: profile.profilePhotoUrl || "",
				});
			}
		});
	}

	ngOnInit() {
		// Load initial data
		this.profileService.loadProfile().subscribe();
		this.profileService.loadActivityLogs().subscribe();
	}

	// Get profile data
	profile() {
		return this.profileService.profile();
	}
	kpis() {
		return this.profileService.kpis();
	}
	recentActivity() {
		return this.profileService.recentActivity();
	}
	loading() {
		return this.profileService.loading();
	}
	saving() {
		return this.profileService.saving();
	}
	uploadProgress() {
		return this.profileService.uploadProgress();
	}
	error() {
		return this.profileService.error();
	}
	successMessage() {
		return this.profileService.successMessage();
	}
	activityPage() {
		return this.profileService.activityPage();
	}
	activityPages() {
		return this.profileService.activityPages();
	}

	// Helper methods
	str(n: number): string {
		return String(n);
	}

	getInitials(): string {
		return this.profileService.getInitials();
	}

	getRoleColorClass(): string {
		const profile = this.profile();
		return profile
			? this.profileService.getRoleColorClass(profile.adminRole)
			: "bg-gray-100 text-gray-700";
	}

	getRoleLabel(): string {
		const profile = this.profile();
		return profile
			? this.profileService.getRoleLabel(profile.adminRole)
			: "Utilisateur";
	}

	getActionTypeColorClass(type: string): string {
		return this.profileService.getActionTypeColorClass(type);
	}

	getActionTypeBgColorClass(type: string): string {
		return this.profileService.getActionTypeBgColorClass(type);
	}

	formatDate(dateString?: string): string {
		return this.profileService.formatDate(dateString);
	}

	formatShortDate(dateString?: string): string {
		return this.profileService.formatShortDate(dateString);
	}

	formatAccountAge(days: number): string {
		return this.profileService.formatAccountAge(days);
	}

	// Action methods
	toggleEditProfile() {
		this.isEditingProfile.update((value) => !value);
		this.profileService.clearError();
		this.profileService.clearSuccessMessage();
	}

	toggleEditPassword() {
		this.isEditingPassword.update((value) => !value);
		this.securityForm.set({
			currentPassword: "",
			newPassword: "",
			confirmPassword: "",
		});
		this.profileService.clearError();
		this.profileService.clearSuccessMessage();
	}

	saveProfile() {
		const profile = this.profile();
		if (!profile) return;

		const formData = this.profileForm();
		const payload = {} as any;

		// Only include fields that have changed
		if (formData.fullName !== profile.fullName) {
			payload.fullName = formData.fullName;
		}
		if (formData.email !== profile.email) {
			payload.email = formData.email;
		}
		if (formData.phoneNumber !== profile.phoneNumber) {
			payload.phoneNumber = formData.phoneNumber;
		}
		if (formData.department !== (profile.department || "")) {
			payload.department = formData.department || null;
		}
		if (formData.profilePhotoUrl !== (profile.profilePhotoUrl || "")) {
			payload.profilePhotoUrl = formData.profilePhotoUrl || null;
		}

		// Check if there are any changes
		if (Object.keys(payload).length === 0) {
			this.profileService.successMessage.set(
				"Aucune modification détectée",
			);
			this.isEditingProfile.set(false);
			return;
		}

		this.profileService.updateProfile(payload).subscribe({
			next: (response) => {
				if (response.success) {
					this.isEditingProfile.set(false);
					// Reload activity logs to show the new profile update entry
					this.profileService.loadActivityLogs().subscribe();
				}
			},
			error: (error) => {
				console.error("Profile update error:", error);
			},
		});
	}

	savePassword() {
		const formData = this.securityForm();

		this.profileService
			.changePassword({
				currentPassword: formData.currentPassword,
				newPassword: formData.newPassword,
				confirmPassword: formData.confirmPassword,
			})
			.subscribe({
				next: (response) => {
					if (response.success) {
						this.isEditingPassword.set(false);
						this.securityForm.set({
							currentPassword: "",
							newPassword: "",
							confirmPassword: "",
						});
						// Reload activity logs to show the password change entry
						this.profileService.loadActivityLogs().subscribe();
					}
				},
				error: (error) => {
					console.error("Password change error:", error);
				},
			});
	}

	cancelEditProfile() {
		this.isEditingProfile.set(false);
		this.profileService.clearError();
		this.profileService.clearSuccessMessage();

		// Reset form data to current profile
		const profile = this.profile();
		if (profile) {
			this.profileForm.set({
				fullName: profile.fullName || "",
				email: profile.email || "",
				phoneNumber: profile.phoneNumber || "",
				department: profile.department || "",
				profilePhotoUrl: profile.profilePhotoUrl || "",
			});
		}
	}

	cancelEditPassword() {
		this.isEditingPassword.set(false);
		this.securityForm.set({
			currentPassword: "",
			newPassword: "",
			confirmPassword: "",
		});
		this.profileService.clearError();
		this.profileService.clearSuccessMessage();
	}

	// Photo management methods
	toggleEditPhoto() {
		this.isEditingPhoto.set(true);
		this.profileService.clearError();
		this.profileService.clearSuccessMessage();
	}

	cancelEditPhoto() {
		this.isEditingPhoto.set(false);
		this.photoFile.set(null);
		this.photoPreview.set(null);
		this.profileService.clearError();
		this.profileService.clearSuccessMessage();
	}

	onPhotoSelected(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files[0]) {
			const file = input.files[0];

			// Validate file type
			const allowedTypes = [
				"image/jpeg",
				"image/png",
				"image/gif",
				"image/webp",
			];
			if (!allowedTypes.includes(file.type)) {
				this.profileService.error.set(
					"Type de fichier non autorisé. Types autorisés: JPEG, PNG, GIF, WebP",
				);
				// Reset the input
				input.value = "";
				return;
			}

			// Validate file size (2MB max)
			if (file.size > 2 * 1024 * 1024) {
				this.profileService.error.set(
					"La taille du fichier dépasse 2MB",
				);
				input.value = "";
				return;
			}

			this.photoFile.set(file);

			// Create preview
			const reader = new FileReader();
			reader.onload = () => {
				this.photoPreview.set(reader.result as string);
			};
			reader.onerror = () => {
				this.profileService.error.set(
					"Erreur lors de la lecture du fichier",
				);
				this.photoFile.set(null);
			};
			reader.readAsDataURL(file);
		}
	}

	removePhoto() {
		if (
			confirm(
				"Êtes-vous sûr de vouloir supprimer votre photo de profil ? Cette action est irréversible.",
			)
		) {
			this.profileService.removePhoto().subscribe({
				next: (response) => {
					if (response.success) {
						this.isEditingPhoto.set(false);
						this.photoFile.set(null);
						this.photoPreview.set(null);
						this.profileService.successMessage.set(
							"Photo de profil supprimée avec succès",
						);
					}
				},
				error: (error) => {
					console.error("Error removing photo:", error);
				},
			});
		}
	}

	uploadPhoto() {
		const file = this.photoFile();
		if (!file) {
			this.profileService.error.set("Veuillez sélectionner une photo");
			return;
		}

		// Use the actual file upload method
		this.profileService.uploadPhotoFile(file).subscribe({
			next: (event: HttpEvent<any>) => {
				// For HttpEvent, we need to check if it's the complete response
				if (event.type === HttpEventType.Response) {
					if (event.body?.success) {
						this.isEditingPhoto.set(false);
						this.photoFile.set(null);
						this.photoPreview.set(null);
					}
				}
			},
			error: (error) => {
				console.error("Error uploading photo:", error);
			},
		});
	}

	loadMoreActivity() {
		this.profileService.loadMoreActivity();
	}

	clearError() {
		this.profileService.clearError();
	}

	clearSuccessMessage() {
		this.profileService.clearSuccessMessage();
	}
}
