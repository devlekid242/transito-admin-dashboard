import type {
	SiteContentBlockType,
	SiteSettingKey,
} from "../../services/site-content.service";

export interface BlockDraft {
	blockKey: string;
	title: string;
	body: string;
	description: string;
	imageUrl: string;
	imageAlt: string;
	label: string;
	url: string;
	itemsText: string;
	linksText: string;
}

export const SITE_SETTING_FIELDS: {
	key: SiteSettingKey;
	label: string;
	type: "text" | "email" | "tel" | "url" | "textarea";
}[] = [
	{ key: "contact_phone", label: "Téléphone", type: "tel" },
	{ key: "contact_whatsapp", label: "WhatsApp", type: "tel" },
	{ key: "contact_email", label: "E-mail de contact", type: "email" },
	{ key: "office_address", label: "Adresse du bureau", type: "textarea" },
	{ key: "office_hours", label: "Horaires", type: "textarea" },
	{ key: "appstore_url", label: "Lien App Store", type: "url" },
	{ key: "playstore_url", label: "Lien Google Play", type: "url" },
	{ key: "social_facebook", label: "Facebook", type: "url" },
	{ key: "social_instagram", label: "Instagram", type: "url" },
	{ key: "social_x", label: "X", type: "url" },
	{ key: "social_linkedin", label: "LinkedIn", type: "url" },
	{ key: "terms_url", label: "Lien des conditions", type: "url" },
];

export const EMPTY_BLOCK_DRAFT: BlockDraft = {
	blockKey: "",
	title: "",
	body: "",
	description: "",
	imageUrl: "",
	imageAlt: "",
	label: "",
	url: "",
	itemsText: "",
	linksText: "",
};

export function blockPayloadFromDraft(
	type: SiteContentBlockType,
	draft: BlockDraft,
): Record<string, unknown> {
	switch (type) {
		case "HERO":
			return omitEmpty({
				title: draft.title,
				description: draft.description,
				imageUrl: draft.imageUrl,
				imageAlt: draft.imageAlt,
				ctaLabel: draft.label,
				ctaUrl: draft.url,
			});
		case "TEXT":
			return omitEmpty({ title: draft.title, body: draft.body });
		case "CTA":
			return omitEmpty({
				title: draft.title,
				body: draft.body,
				label: draft.label,
				url: draft.url,
			});
		case "IMAGE":
			return omitEmpty({ imageUrl: draft.imageUrl, alt: draft.imageAlt });
		case "STEPS":
		case "FEATURES":
			return omitEmpty({
				title: draft.title,
				items: parsePairLines(draft.itemsText),
			});
		case "LINK_LIST":
			return omitEmpty({
				title: draft.title,
				links: draft.linksText
					.split(/\r?\n/)
					.map((line) => line.trim())
					.filter(Boolean)
					.map((line) => {
						const [label, ...urlParts] = line.split("|");
						return { label: label.trim(), url: urlParts.join("|").trim() };
					}),
			});
	}
}

export function blockDraftFromPayload(
	blockKey: string,
	type: SiteContentBlockType,
	payload: Record<string, unknown>,
): BlockDraft {
	const items = Array.isArray(payload["items"]) ? payload["items"] : [];
	const links = Array.isArray(payload["links"]) ? payload["links"] : [];
	return {
		blockKey,
		title: stringValue(payload["title"]),
		body: stringValue(payload["body"]),
		description: stringValue(payload["description"]),
		imageUrl: stringValue(payload["imageUrl"]),
		imageAlt: stringValue(payload["imageAlt"] ?? payload["alt"]),
		label: stringValue(payload["label"] ?? payload["ctaLabel"]),
		url: stringValue(payload["url"] ?? payload["ctaUrl"]),
		itemsText: items
			.map((item) =>
				isRecord(item)
					? `${stringValue(item["title"])} | ${stringValue(item["description"])}`
					: "",
			)
			.join("\n"),
		linksText: links
			.map((item) =>
				isRecord(item)
					? `${stringValue(item["label"])} | ${stringValue(item["url"])}`
					: "",
			)
			.join("\n"),
	};
}

export function validateBlockDraft(
	type: SiteContentBlockType,
	draft: BlockDraft,
): Record<string, string[]> {
	const errors: Record<string, string[]> = {};
	const payload = blockPayloadFromDraft(type, draft);
	const required: Record<SiteContentBlockType, string[]> = {
		HERO: ["title"],
		TEXT: ["body"],
		STEPS: ["items"],
		CTA: ["title", "label", "url"],
		LINK_LIST: ["title", "links"],
		FEATURES: ["items"],
		IMAGE: ["imageUrl", "alt"],
	};
	for (const field of required[type]) {
		const value = payload[field];
		if (
			value === undefined ||
			value === "" ||
			(Array.isArray(value) && value.length === 0)
		) {
			errors[field] = ["Ce champ est obligatoire."];
		}
	}
	for (const [field, value] of Object.entries(payload)) {
		if (typeof value === "string" && (value.includes("<") || value.includes(">"))) {
			errors[field] = [...(errors[field] ?? []), "Le HTML n’est pas autorisé."];
		}
		if (field === "url" || field === "ctaUrl" || field === "imageUrl") {
			if (typeof value === "string" && value && !isAllowedUrl(value, field === "imageUrl")) {
				errors[field] = [...(errors[field] ?? []), "Saisissez une URL HTTPS valide."];
			}
		}
	}
	if (!/^[a-z0-9][a-z0-9_-]{0,79}$/.test(draft.blockKey.trim())) {
		errors["blockKey"] = ["La clé doit contenir 1 à 80 caractères minuscules, chiffres, tirets ou tirets bas."];
	}
	if (Array.isArray(payload["items"])) {
		const items = payload["items"] as Record<string, string>[];
		const maxItems = type === "STEPS" ? 10 : 8;
		if (items.length < 1 || items.length > maxItems) {
			errors["items"] = [`La liste doit contenir entre 1 et ${maxItems} éléments.`];
		}
		items.forEach((item, index) => {
			if (!item["title"] || item["title"].length > 120) {
				errors[`items.${index}.title`] = ["Le titre est obligatoire (120 caractères maximum)."];
			}
			if (!item["description"] || item["description"].length > (type === "STEPS" ? 500 : 300)) {
				errors[`items.${index}.description`] = ["La description est obligatoire et trop longue ou absente."];
			}
		});
	}
	if (Array.isArray(payload["links"])) {
		const links = payload["links"] as { label: string; url: string }[];
		if (links.length < 1 || links.length > 20) {
			errors["links"] = ["La liste doit contenir entre 1 et 20 liens."];
		}
		links.forEach((link, index) => {
			if (!link.label || link.label.length > 80) {
				errors[`links.${index}.label`] = ["Le libellé est obligatoire (80 caractères maximum)."];
			}
			if (!isAllowedUrl(link.url, false)) {
				errors[`links.${index}.url`] = ["Saisissez une URL HTTP ou HTTPS valide."];
			}
		});
	}
	return errors;
}

export function validateSetting(
	key: SiteSettingKey,
	value: string,
): string | null {
	const trimmed = value.trim();
	if (!trimmed || trimmed.length > 500) return "La valeur est obligatoire (500 caractères maximum).";
	if (trimmed.includes("<") || trimmed.includes(">")) return "Le HTML n’est pas autorisé.";
	if (key === "contact_email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
		return "Saisissez une adresse e-mail valide.";
	}
	if (key.endsWith("_url") && !isAllowedUrl(trimmed, false, true)) {
		return "Saisissez une URL HTTPS valide.";
	}
	if ((key === "contact_phone" || key === "contact_whatsapp") && !/^[+]?[0-9\s\-()]{6,30}$/.test(trimmed)) {
		return "Saisissez un numéro de téléphone valide.";
	}
	return null;
}

export function plainTextPreview(payload: Record<string, unknown>): string[] {
	const lines: string[] = [];
	const collect = (value: unknown, label: string): void => {
		if (typeof value === "string" && value.trim()) {
			lines.push(label ? `${label} : ${value}` : value);
		} else if (Array.isArray(value)) {
			value.forEach((item, index) => collect(item, String(index + 1)));
		} else if (isRecord(value)) {
			for (const [key, child] of Object.entries(value)) collect(child, key);
		}
	};
	for (const [key, value] of Object.entries(payload)) collect(value, key);
	return lines;
}

function parsePairLines(value: string): { title: string; description: string }[] {
	return value
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => {
			const [title, ...description] = line.split("|");
			return { title: title.trim(), description: description.join("|").trim() };
		});
}

function omitEmpty(value: Record<string, unknown>): Record<string, unknown> {
	return Object.fromEntries(
		Object.entries(value).filter(([, entry]) =>
			Array.isArray(entry) ? entry.length > 0 : typeof entry === "string" ? entry.trim() !== "" : entry !== undefined,
		),
	);
}

function isAllowedUrl(value: string, image: boolean, httpsOnly = false): boolean {
	if (image && value.startsWith("/brand/")) return /^\/brand\/[a-z0-9._-]+$/i.test(value);
	try {
		const url = new URL(value);
		return httpsOnly
			? url.protocol === "https:"
			: url.protocol === "https:" || url.protocol === "http:";
	} catch {
		return false;
	}
}

function stringValue(value: unknown): string {
	return typeof value === "string" ? value : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
