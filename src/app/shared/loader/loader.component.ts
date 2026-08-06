import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
	standalone: true,
	selector: "app-loader",
	imports: [CommonModule],
	templateUrl: "./loader.component.html",
	styleUrls: ["./loader.component.css"],
})
export class LoaderComponent {}
