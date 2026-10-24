import {
	Component,
	ContentChild,
	ElementRef,
	EventEmitter,
	HostListener,
	Input,
	Output,
	TemplateRef,
	computed,
	inject,
	signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import {
	DateFilter,
	FinancialService,
	PeriodType,
} from "../services/financial.service";

@Component({
	selector: "app-page-header",
	imports: [CommonModule, FormsModule],
	templateUrl: "page-header.component.html",
})
export class PageHeaderComponent {
	@Input({ required: true }) title = "";
	@Input() subtitle = "";
	@Input() actions = false;
	@Input() showDateFilter = true;
	@Input() showRefresh = true;

	@Output() refresh = new EventEmitter<void>();
	@Output() dateFilterChange = new EventEmitter<DateFilter>();

	@ContentChild("buttonAction") Action: TemplateRef<any> | undefined;

	readonly financialService = inject(FinancialService);
	private readonly elementRef = inject(ElementRef);

	readonly dateFilter = this.financialService.dateFilter;
	readonly isRefreshing = signal(false);
	readonly dateDropdownOpen = signal(false);

	readonly customStartDate = signal("");
	readonly customEndDate = signal("");

	readonly periods: { value: PeriodType; label: string }[] = [
		{ value: "today", label: "Aujourd'hui" },
		{ value: "daily", label: "7 derniers jours" },
		{ value: "weekly", label: "30 derniers jours" },
		{ value: "monthly", label: "Ce mois" },
		{ value: "custom", label: "Personnalisé" },
	];

	readonly periodLabel = computed(() => {
		return this.financialService.getDateFilterLabel();
	});

	@HostListener("document:click", ["$event"])
	onDocumentClick(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!this.elementRef.nativeElement.contains(target)) {
			this.dateDropdownOpen.set(false);
		}
	}

	toggleDateDropdown() {
		const current = this.dateDropdownOpen();
		if (!current) {
			const filter = this.dateFilter();
			this.customStartDate.set(filter.startDate || "");
			this.customEndDate.set(filter.endDate || "");
		}
		this.dateDropdownOpen.set(!current);
	}

	selectPeriod(period: PeriodType) {
		if (period === "custom") {
			const filter = this.dateFilter();
			this.customStartDate.set(filter.startDate || "");
			this.customEndDate.set(filter.endDate || "");
			return;
		}

		this.financialService.updatePeriod(period);
		this.dateFilterChange.emit(this.financialService.dateFilter());
		this.dateDropdownOpen.set(false);
	}

	applyCustomDates() {
		const start = this.customStartDate();
		const end = this.customEndDate();
		if (start && end) {
			this.financialService.updateDateRange(start, end);
			this.dateFilterChange.emit(this.financialService.dateFilter());
			this.dateDropdownOpen.set(false);
		}
	}

	onRefreshClick() {
		this.isRefreshing.set(true);
		this.financialService.refreshAll();
		this.refresh.emit();

		setTimeout(() => {
			this.isRefreshing.set(false);
		}, 700);
	}
}
