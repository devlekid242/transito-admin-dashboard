import { Component, Input, Output, EventEmitter, signal } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
	selector: "app-modal",
	imports: [CommonModule],
	templateUrl: "modal.component.html",
})
export class ModalComponent {
	@Input({ alias: "title", required: true }) titleText = "";
	@Input({ alias: "subtitle" }) subtitleText = "";
	@Input() size: "sm" | "md" | "lg" = "md";
	@Input() isOpen = false;

	@Input({ alias: "open" })
	set open(value: boolean) {
		this.isOpen = value;
	}

	get open(): boolean {
		return this.isOpen;
	}

	@Output() close = new EventEmitter<void>();

	readonly closing = signal(false);

	sizeClass() {
		if (this.size === "lg") return "sm:max-w-3xl";
		if (this.size === "sm") return "sm:max-w-md";
		return "sm:max-w-xl";
	}

	onClose() {
		this.close.emit();
	}
}
