export type DeliveryMode = 'local' | 'shipping' | 'both';

export type Condition = 'new' | 'like-new' | 'very-good' | 'used' | 'damaged';

export type QueryMode = 'merge' | 'manual-only';

export interface ActorInput {
    itemName: string;
    category?: string;
    brandModel?: string;
    condition: Condition;
    attributes?: string;
    defects?: string;
    expectedPrice?: number;
    deliveryMode: DeliveryMode;
    postalCode?: string;
    radiusKm?: number;
    manualQueries?: string[];
    manualSearchUrls?: string[];
    queryMode?: QueryMode;
    maxResults?: number;
    includePromoted?: boolean;
}

export interface ValidatedInput {
    itemName: string;
    category: string | null;
    brandModel: string | null;
    condition: Condition;
    attributes: string | null;
    defects: string | null;
    expectedPrice: number | null;
    deliveryMode: DeliveryMode;
    postalCode: string;
    radiusKm: number;
    manualQueries: string[];
    manualSearchUrls: string[];
    queryMode: QueryMode;
    maxResults: number;
    includePromoted: boolean;
}
