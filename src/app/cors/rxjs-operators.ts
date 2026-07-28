import { Observable, OperatorFunction } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Interface représentant la structure standard d'une collection API Platform / JSON-LD
 */
interface JsonLdCollection<T> {
  '@context'?: string;
  '@id'?: string;
  '@type'?: string;
  totalItems?: number;
  member: T[]; // La propriété cible à extraire
}

export interface NormalizedCollection<T> {
  data: T[];
  total: number;
}

function normalizeCollectionPayload<T>(response: any): T[] {
  if (!response) {
    return [];
  }

  if (Array.isArray(response)) {
    return response as T[];
  }

  if (typeof response === 'object' && response !== null) {
    if (Array.isArray(response.member)) {
      return response.member as T[];
    }

    if (Array.isArray(response['hydra:member'])) {
      return response['hydra:member'] as T[];
    }

    if (Array.isArray(response.data)) {
      return response.data as T[];
    }
  }

  return [];
}

export function unwrapCollection<T>(): OperatorFunction<any, T[]>;
export function unwrapCollection<T>(preserveMetadata: false): OperatorFunction<any, NormalizedCollection<T>>;
export function unwrapCollection<T>(preserveMetadata = true) {
  return (source: Observable<any>): Observable<T[] | NormalizedCollection<T>> => {
    return source.pipe(
      map((response) => {
        const data = normalizeCollectionPayload<T>(response);

        if (preserveMetadata === false) {
          const total = typeof response === 'object' && response !== null
            ? Number(response.totalItems ?? response['hydra:totalItems'] ?? data.length)
            : data.length;

          return {
            data,
            total,
          } as NormalizedCollection<T>;
        }

        return data as T[];
      }),
    );
  };
}
