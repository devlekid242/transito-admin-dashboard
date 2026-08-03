import { Component, inject, signal, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { SupportService, FAQ } from "../../services/support.service";
import { PageHeaderComponent } from "../../shared/page-header.component";
import { ModalComponent } from "../../shared/modal.component";

@Component({
	selector: "app-faq-management",
	standalone: true,
	imports: [CommonModule, FormsModule, PageHeaderComponent, ModalComponent],
	templateUrl: "faq-management.page.html",
})
export class FAQManagementPage implements OnInit {
	readonly supportService = inject(SupportService);

	// Modal states
	readonly showCreateModal = signal(false);
	readonly showEditModal = signal(false);
	readonly showDeleteModal = signal(false);

	// Form states
	readonly currentFAQ = signal<FAQ | null>(null);
	readonly newFAQ = signal({
		question: "",
		answer: "",
		category: "general",
		orderPriority: 0,
		isActive: true,
	});

	// Categories for dropdown
	readonly categories = signal<string[]>([
		"general",
		"payment",
		"reservation",
		"technical",
		"account",
		"other",
	]);
	readonly allCategories = signal<string[]>([]);

	// Confirmation states
	readonly deleteTargetId = signal<number | null>(null);
	readonly faqToDelete = signal<FAQ | null>(null);

	constructor() {
		this.loadCategories();
	}

	ngOnInit(): void {
		this.loadFAQs();
	}

	loadFAQs(): void {
		this.supportService.getFAQs().subscribe();
	}

	loadCategories(): void {
		this.supportService.getFAQCategories().subscribe((response) => {
			if (response && response.categories) {
				this.allCategories.set(response.categories);
			}
		});
	}

	// Filter methods
	onCategoryFilterChange(category: string): void {
		this.supportService.updateFAQFilter({
			category: category === "all" ? "all" : category,
		});
		this.loadFAQs();
	}

	onSearchChange(search: string): void {
		this.supportService.updateFAQFilter({ search });
		this.loadFAQs();
	}

	onActiveFilterChange(activeOnly: boolean): void {
		this.supportService.updateFAQFilter({ activeOnly });
		this.loadFAQs();
	}

	// Modal methods
	openCreateModal(): void {
		this.showCreateModal.set(true);
		this.newFAQ.set({
			question: "",
			answer: "",
			category: "general",
			orderPriority: 0,
			isActive: true,
		});
	}

	closeCreateModal(): void {
		this.showCreateModal.set(false);
		this.supportService.clearError();
	}

	openEditModal(faq: FAQ): void {
		this.currentFAQ.set(faq);
		this.showEditModal.set(true);
		this.supportService.clearError();
	}

	closeEditModal(): void {
		this.showEditModal.set(false);
		this.currentFAQ.set(null);
		this.supportService.clearError();
	}

	openDeleteModal(faq: FAQ): void {
		this.faqToDelete.set(faq);
		this.deleteTargetId.set(faq.id);
		this.showDeleteModal.set(true);
	}

	closeDeleteModal(): void {
		this.showDeleteModal.set(false);
		this.faqToDelete.set(null);
		this.deleteTargetId.set(null);
		this.supportService.clearError();
	}

	// CRUD operations
	createFAQ(): void {
		const faq = this.newFAQ();
		this.supportService.createFAQ(faq).subscribe({
			next: () => {
				this.closeCreateModal();
				this.loadFAQs();
			},
			error: (error) => {
				console.error("Failed to create FAQ:", error);
			},
		});
	}

	updateFAQ(): void {
		const faq = this.currentFAQ();
		if (!faq) return;

		const updates: Partial<FAQ> = {
			question: faq.question,
			answer: faq.answer,
			category: faq.category,
			orderPriority: faq.orderPriority,
			isActive: faq.isActive,
		};

		this.supportService.updateFAQ(faq.id, updates).subscribe({
			next: () => {
				this.closeEditModal();
				this.loadFAQs();
			},
			error: (error) => {
				console.error("Failed to update FAQ:", error);
			},
		});
	}

	deleteFAQ(): void {
		const id = this.deleteTargetId();
		if (!id) return;

		this.supportService.deleteFAQ(id).subscribe({
			next: () => {
				this.closeDeleteModal();
				this.loadFAQs();
			},
			error: (error) => {
				console.error("Failed to delete FAQ:", error);
			},
		});
	}

	// Update form values
	updateNewFAQ(field: keyof FAQ, value: any): void {
		this.newFAQ.update((current) => ({ ...current, [field]: value }));
	}

	updateCurrentFAQ(field: keyof FAQ, value: any): void {
		this.currentFAQ.update((current) =>
			current ? { ...current, [field]: value } : null,
		);
	}

	// Table columns for FAQ list
	faqColumns = [
		{ key: "orderPriority", header: "Order", type: "number" },
		{ key: "question", header: "Question", type: "text" },
		{ key: "category", header: "Category", type: "text" },
		{ key: "isActive", header: "Active", type: "boolean" },
		{ key: "createdAt", header: "Created", type: "date" },
	];

	// Get active FAQs count
	get activeFAQsCount(): number {
		return this.supportService.faqs().filter((faq) => faq.isActive).length;
	}

	// Get total FAQs count
	get totalFAQsCount(): number {
		return this.supportService.faqs().length;
	}

	// Toggle FAQ active status
	toggleFAQStatus(faq: FAQ): void {
		this.supportService
			.updateFAQ(faq.id, { isActive: !faq.isActive })
			.subscribe({
				next: () => {
					this.loadFAQs();
				},
			});
	}

	// Get categories with counts
	get categoriesWithCounts(): { category: string; count: number }[] {
		const faqs = this.supportService.faqs();
		const categoryCounts = new Map<string, number>();

		faqs.forEach((faq) => {
			const count = categoryCounts.get(faq.category) || 0;
			categoryCounts.set(faq.category, count + 1);
		});

		return Array.from(categoryCounts.entries()).map(
			([category, count]) => ({ category, count }),
		);
	}

	// Check if form is valid
	isFormValid(faq: Partial<FAQ>): boolean {
		return !!(faq.question?.trim() && faq.answer?.trim());
	}

	// Reset filters
	resetFilters(): void {
		this.supportService.resetFAQFilters();
		this.loadFAQs();
	}
}
