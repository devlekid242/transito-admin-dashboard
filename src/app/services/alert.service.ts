import { Injectable } from "@angular/core";
import { HttpErrorResponse } from "@angular/common/http";
import Swal from "sweetalert2";

@Injectable({
	providedIn: "root",
})
export class AlertService {
	success(message: string, title: string = "Succès !"): void {
		Swal.fire({
			title,
			text: message,
			icon: "success",
			confirmButtonColor: "#3b82f6",
			timer: 2200,
			timerProgressBar: true,
			showConfirmButton: false,
		});
	}

	error(message: string, title: string = "Une erreur est survenue"): void {
		Swal.fire({
			title,
			text: message,
			icon: "error",
			confirmButtonColor: "#ef4444",
		});
	}

	/** Extrait le message utile des formats d'erreur renvoyés par l'API. */
	getApiErrorMessage(
		error: unknown,
		fallback = "Une erreur est survenue.",
	): string {
		if (error instanceof HttpErrorResponse) {
			return this.getApiErrorMessage(
				error.error,
				error.message || fallback,
			);
		}

		if (typeof error === "string" && error.trim()) {
			return error;
		}

		if (error && typeof error === "object") {
			const payload = error as Record<string, unknown>;
			const directMessage =
				payload["message"] ?? payload["error"] ?? payload["detail"];

			if (typeof directMessage === "string" && directMessage.trim()) {
				return directMessage;
			}

			if (directMessage && typeof directMessage === "object") {
				const nestedMessage = this.getApiErrorMessage(
					directMessage,
					"",
				);
				if (nestedMessage) {
					return nestedMessage;
				}
			}

			if (Array.isArray(directMessage)) {
				return (
					directMessage
						.filter((item) => typeof item === "string")
						.join("\n") || fallback
				);
			}

			const errors = payload["errors"];
			if (errors && typeof errors === "object") {
				const messages = Object.values(errors)
					.flatMap((value) =>
						Array.isArray(value) ? value : [value],
					)
					.filter(
						(value): value is string =>
							typeof value === "string" &&
							value.trim().length > 0,
					);

				if (messages.length > 0) {
					return messages.join("\n");
				}
			}

			const violations = payload["violations"];
			if (Array.isArray(violations)) {
				const messages = violations
					.map((violation) => {
						if (!violation || typeof violation !== "object")
							return null;
						const item = violation as Record<string, unknown>;
						return typeof item["message"] === "string"
							? item["message"]
							: null;
					})
					.filter((message): message is string => Boolean(message));

				if (messages.length > 0) {
					return messages.join("\n");
				}
			}
		}

		return fallback;
	}

	apiError(error: unknown, fallback = "Une erreur est survenue."): void {
		this.error(this.getApiErrorMessage(error, fallback));
	}

	warning(message: string, title: string = "Attention"): void {
		Swal.fire({
			title,
			text: message,
			icon: "warning",
			confirmButtonColor: "#f59e0b",
		});
	}

	info(message: string, title: string = "Information"): void {
		Swal.fire({
			title,
			text: message,
			icon: "info",
			confirmButtonColor: "#3b82f6",
			timer: 2200,
			timerProgressBar: true,
			showConfirmButton: false,
		});
	}

	async confirm(title: string, text: string): Promise<boolean> {
		const result = await Swal.fire({
			title,
			text,
			icon: "warning",
			showCancelButton: true,
			confirmButtonColor: "#3b82f6",
			cancelButtonColor: "#6b7280",
			confirmButtonText: "Confirmer",
			cancelButtonText: "Annuler",
		});

		return result.isConfirmed;
	}
}
