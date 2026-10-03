export type DeliveryMode = 'local' | 'shipping' | 'both';

export type Condition = 'new' | 'like-new' | 'very-good' | 'used' | 'damaged';

export type QueryMode = 'merge' | 'manual-only';

export type SearchSegment = 'local' | 'shipping';

export type SearchSource = 'automatic' | 'manual-query' | 'manual-url';

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

export interface SearchRequest {
    source: SearchSource;
    segment: SearchSegment;
    query: string | null;
    manualUrl: string | null;
    postalCode: string | null;
    radiusKm: number | null;
    shippingOnly: boolean;
}

export interface SearchPlan {
    generatedQueries: string[];
    queries: string[];
    requests: SearchRequest[];
}

export interface Coordinates {
    latitude: number;
    longitude: number;
}

export interface SearchCandidate {
    listingId: string;
    url: string;
    title: string;
    isPromoted: boolean;
    source: SearchRequest;
}

export interface RawListing {
    listingId: string;
    url: string;
    canonicalUrl: string;
    title: string;
    priceText: string | null;
    currency: string | null;
    categoryPath: string[];
    condition: string | null;
    attributesRaw: Record<string, string>;
    locationName: string | null;
    voivodeship: string | null;
    latitude: number | null;
    longitude: number | null;
    shippingAvailable: boolean | null;
    sellerType: 'private' | 'business' | null;
    publishedAt: string | null;
    refreshedAt: string | null;
    description: string | null;
    photoCount: number | null;
    isPromoted: boolean;
}

export interface NormalizeContext {
    segment: SearchSegment;
    matchedQueries: string[];
    originCoordinates: Coordinates | null;
    locationFilterMatched: boolean;
}

export interface NormalizedListing extends RawListing {
    price: number | null;
    priceNegotiable: boolean;
    attributesNormalized: Record<string, string | number | boolean | null>;
    distanceKm: number | null;
    locationFilterMatched: boolean;
    descriptionClean: string | null;
    matchedQueries: string[];
    segment: SearchSegment;
    dataCompleteness: number;
}

export type CategoryAttributeValue = string | number | boolean | null;
export type CategoryAttributes = Record<string, CategoryAttributeValue>;
export type CategoryExtractor = (listing: NormalizedListing) => CategoryAttributes;
