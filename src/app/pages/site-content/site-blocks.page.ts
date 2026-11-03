import { CommonModule } from "@angular/common";
import { Component, inject, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { HttpErrorResponse } from "@angular/common/http";
import {
	SiteContentBlock,
	SiteContentBlockType,
	SiteContentService,
	SitePage,
	SitePublicationStatus,
} from "../../services/site-content.service";
import { AlertService } from "../../services/alert.service";
import { DataTableColumn, DataTableComponent } from "../../shared/data-table.component";
import { ModalComponent } from "../../shared/modal.component";
import { PageHeaderComponent } from "../../shared/page-header.component";
import {
	blockDraftFromPayload,
	blockPayloadFromDraft,
	BlockDraft,
	EMPTY_BLOCK_DRAFT,
	plainTextPreview,
	validateBlockDraft,
} from "./site-content.forms";

const BLOCK_TYPES: { value: SiteContentBlockType; label: string }[] = [
	{ value: "HERO", label: "Bannière (HERO)" },
	{ value: "TEXT", label: "Texte (TEXT)" },
	{ value: "STEPS", label: "Étapes (STEPS)" },
	{ value: "CTA", label: "Appel à l’action (CTA)" },
	{ value: "LINK_LIST", label: "Liste de liens (LINK_LIST)" },
	{ value: "FEATURES", label: "Avantages (FEATURES)" },
	{ value: "IMAGE", label: "Image (IMAGE)" },
];

const BLOCK_COLUMNS: DataTableColumn[] = [
	{ key: "position", label: "Ordre", align: "center" },
	{ key: "blockKey", label: "Clé" },
	{ key: "type", label: "Type" },
	{ key: "status", label: "Statut" },
	{ key: "updatedAt", label: "Dernière modification" },
	{ key: "actions", label: "Actions", align: "right" },
];

@Component({
	selector: "app-site-blocks",
	standalone: true,
	imports: [CommonModule, FormsModule, RouterLink, DataTableComponent, ModalComponent, PageHeaderComponent],
	templateUrl: "./site-blocks.page.html",
})
export class SiteBlocksPage implements OnInit {
	private readonly service = inject(SiteContentService);
	private readonly alerts = inject(AlertService);
	private readonly route = inject(ActivatedRoute);

	readonly pages = signal<SitePage[]>([]);
	readonly blocks = signal<SiteContentBlock[]>([]);
	readonly pageId = signal<number | null>(null);
	readonly loading = signal(false);
	readonly saving = signal(false);
	readonly errorMessage = signal<string | null>(null);
	readonly fieldErrors = signal<Record<string, string[]>>({});
	readonly modalOpen = signal(false);
	readonly creating = signal(false);
	readonly editingBlock = signal<SiteContentBlock | null>(null);
	readonly selectedType = signal<SiteContentBlockType>("TEXT");
	readonly draft = signal<BlockDraft>({ ...EMPTY_BLOCK_DRAFT });
	readonly blockTypes = BLOCK_TYPES;
	readonly columns = BLOCK_COLUMNS;

	ngOnInit(): void {
		const queryPageId = Number(this.route.snapshot.queryParamMap.get("pageId"));
		this.pageId.set(Number.isInteger(queryPageId) && queryPageId > 0 ? queryPageId : null);
		this.service.listPages().subscribe({
			next: (response) => {
				this.pages.set(response.data);
				if (this.pageId() === null && response.data.length) this.pageId.set(response.data[0].id);
				this.loadBlocks();
			},
			error: (error: unknown) => {
				this.errorMessage.set(this.alerts.getApiErrorMessage(error, "Impossible de charger les pages."));
			},
		});
	}

	loadBlocks(): void {
		const pageId = this.pageId();
		if (pageId === null) {
			this.blocks.set([]);
			return;
		}
		this.loading.set(true);
		this.errorMessage.set(null);
		this.service.listBlocks(pageId).subscribe({
			next: (response) => this.blocks.set([...response.data].sort((a, b) => a.position - b.position)),
			error: (error: unknown) => {
				this.loading.set(false);
				this.errorMessage.set(this.alerts.getApiErrorMessage(error, "Impossible de charger les blocs."));
				this.blocks.set([]);
			},
			complete: () => this.loading.set(false),
		});
	}

	onPageChange(id: string): void {
		const pageId = Number(id);
		this.pageId.set(Number.isInteger(pageId) && pageId > 0 ? pageId : null);
		this.loadBlocks();
	}

	openCreate(): void {
		if (this.pageId() === null) return;
		this.creating.set(true);
		this.editingBlock.set(null);
		this.selectedType.set("TEXT");
		this.draft.set({ ...EMPTY_BLOCK_DRAFT });
		this.fieldErrors.set({});
		this.errorMessage.set(null);
		this.modalOpen.set(true);
	}

	openEdit(block: SiteContentBlock): void {
		this.creating.set(false);
		this.editingBlock.set(block);
		this.selectedType.set(block.type);
		this.draft.set(blockDraftFromPayload(block.blockKey, block.type, block.payload));
		this.fieldErrors.set({});
		this.errorMessage.set(null);
		this.modalOpen.set(true);
	}

	closeModal(): void {
		this.modalOpen.set(false);
		this.fieldErrors.set({});
	}

	setType(type: SiteContentBlockType): void {
		const previous = this.draft();
		this.selectedType.set(type);
		this.draft.set({ ...EMPTY_BLOCK_DRAFT, blockKey: previous.blockKey });
		this.fieldErrors.set({});
	}

	updateDraft<K extends keyof BlockDraft>(key: K, value: BlockDraft[K]): void {
		this.draft.update((current) => ({ ...current, [key]: value }));
		this.fieldErrors.update((errors) => {
			const next = { ...errors };
			delete next[key];
			delete next[`payload.${key}`];
			return next;
		});
	}

	fieldError(key: string): string | null {
		const aliases: Record<string, string[]> = {
			label: ["payload.ctaLabel"],
			url: ["payload.ctaUrl"],
			imageAlt: ["payload.alt"],
			alt: ["payload.imageAlt"],
			description: ["payload.description"],
		};
		const keys = [key, `payload.${key}`, ...(aliases[key] ?? [])];
		for (const candidate of keys) {
			if (this.fieldErrors()[candidate]) return this.fieldErrors()[candidate].join(" ");
		}
		return null;
	}

	save(): void {
		const pageId = this.pageId();
		if (pageId === null) return;
		const draft = this.draft();
		const type = this.selectedType();
		const payload = blockPayloadFromDraft(type, draft);
		const errors = validateBlockDraft(type, draft);
		if (Object.keys(errors).length) {
			this.fieldErrors.set(errors);
			return;
		}
		const requestData = {
			pageId,
			blockKey: draft.blockKey.trim(),
			type,
			payload,
			position: this.editingBlock()?.position ?? this.blocks().length,
			status: this.editingBlock()?.status ?? "DRAFT" as SitePublicationStatus,
		};
		this.saving.set(true);
		this.fieldErrors.set({});
		const request = this.creating()
			? this.service.createBlock(requestData)
			: this.service.updateBlock(this.editingBlock()!.id, requestData);
		request.subscribe({
			next: () => {
				this.closeModal();
				this.loadBlocks();
				this.alerts.success(this.creating() ? "Le bloc a été créé en brouillon." : "Le bloc a été mis à jour.");
			},
			error: (error: unknown) => {
				this.saving.set(false);
				this.handleApiError(error);
			},
			complete: () => this.saving.set(false),
		});
	}

	async togglePublication(block: SiteContentBlock): Promise<void> {
		const nextStatus: SitePublicationStatus = block.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
		const action = nextStatus === "PUBLISHED" ? "publier" : "dépublier";
		if (!(await this.alerts.confirm(`${action[0].toUpperCase()}${action.slice(1)} ce bloc ?`, "Le contenu public sera mis à jour."))) return;
		this.service.setBlockStatus(block.id, nextStatus).subscribe({
			next: () => {
				this.alerts.success(nextStatus === "PUBLISHED" ? "Le bloc a été publié." : "Le bloc a été dépublié.");
				this.loadBlocks();
			},
			error: (error: unknown) => this.alerts.apiError(error, "Impossible de modifier la publication."),
		});
	}

	async deleteBlock(block: SiteContentBlock): Promise<void> {
		if (!(await this.alerts.confirm("Supprimer ce bloc ?", "Cette action est définitive."))) return;
		this.service.deleteBlock(block.id).subscribe({
			next: () => {
				this.alerts.success("Le bloc a été supprimé.");
				this.loadBlocks();
			},
			error: (error: unknown) => this.alerts.apiError(error, "Impossible de supprimer le bloc."),
		});
	}

	move(block: SiteContentBlock, direction: -1 | 1): void {
		const ordered = [...this.blocks()].sort((a, b) => a.position - b.position);
		const index = ordered.findIndex((item) => item.id === block.id);
		const target = index + direction;
		if (index < 0 || target < 0 || target >= ordered.length) return;
		[ordered[index], ordered[target]] = [ordered[target], ordered[index]];
		this.blocks.set(ordered.map((item, position) => ({ ...item, position })));
		this.service.reorderBlocks(ordered.map((item, position) => ({ id: item.id, position }))).subscribe({
			next: () => this.loadBlocks(),
			error: (error: unknown) => {
				this.alerts.apiError(error, "Impossible de réordonner les blocs.");
				this.loadBlocks();
			},
		});
	}

	previewLines(): string[] {
		const block = this.editingBlock();
		const payload = this.modalOpen() ? blockPayloadFromDraft(this.selectedType(), this.draft()) : block?.payload;
		return payload ? plainTextPreview(payload) : [];
	}

	statusLabel(status: SitePublicationStatus): string {
		return status === "PUBLISHED" ? "Publié" : "Brouillon";
	}

	private handleApiError(error: unknown): void {
		if (error instanceof HttpErrorResponse && error.status === 422 && isRecord(error.error) && isRecord(error.error["errors"])) {
			this.fieldErrors.set(error.error["errors"] as Record<string, string[]>);
			this.errorMessage.set("Vérifiez les champs indiqués.");
			return;
		}
		this.errorMessage.set(this.alerts.getApiErrorMessage(error, "Impossible d’enregistrer le bloc."));
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
