import { inject } from "@angular/core";
import { CanActivateFn, Router, ActivatedRouteSnapshot } from "@angular/router";
import { AdminAuthService } from "../services/admin-auth.service";

export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
	const authService = inject(AdminAuthService);
	const router = inject(Router);

	// isAuthenticated() exige désormais un token ET un profil admin chargé
	if (!authService.isAuthenticated()) {
		router.navigate(["/login"]);
		return false;
	}

	const requiredPermission = route.data?.["permission"];
	if (requiredPermission && !authService.hasPermission(requiredPermission)) {
		router.navigate(["/"]);
		return false;
	}

	return true;
};