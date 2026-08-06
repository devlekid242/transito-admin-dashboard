import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";

@Injectable({ providedIn: "root" })
export class LoadingService {
	private _count = 0;
	private _loading$ = new BehaviorSubject<boolean>(false);

	get loading$(): Observable<boolean> {
		return this._loading$.asObservable();
	}

	show() {
		this._count += 1;
		if (this._count > 0) {
			this._loading$.next(true);
		}
	}

	hide() {
		this._count = Math.max(0, this._count - 1);
		if (this._count === 0) {
			this._loading$.next(false);
		}
	}

	reset() {
		this._count = 0;
		this._loading$.next(false);
	}
}
