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
    matchedSegments?: SearchSegment[];
    dataCompleteness: number;
}

export type CategoryAttributeValue = string | number | boolean | null;
export type CategoryAttributes = Record<string, CategoryAttributeValue>;
export type CategoryExtractor = (listing: NormalizedListing) => CategoryAttributes;

export interface RelevanceResult {
    score: number;
    included: boolean;
    matchReasons: string[];
    exclusionReasons: string[];
}

export type ScoredListing = NormalizedListing & RelevanceResult;

export interface PriceStatistics {
    minimum: number | null;
    maximum: number | null;
    mean: number | null;
    median: number | null;
    lowerQuartile: number | null;
    upperQuartile: number | null;
    weightedMedian: number | null;
}

export interface PriceSlice {
    count: number;
    median: number | null;
}

export interface PriceAnalysis {
    segment: SearchSegment;
    counts: { candidates: number; comparable: number; afterOutliers: number; outliers: number };
    before: PriceStatistics;
    after: PriceStatistics;
    outlierListingIds: string[];
    strategies: { quick: number | null; market: number | null; ambitious: number | null };
    slices: { promoted: PriceSlice; organic: PriceSlice; private: PriceSlice; business: PriceSlice; shipping: PriceSlice };
    confidence: 'none' | 'low' | 'medium' | 'high';
    warnings: string[];
}

export interface ContentAnalysis {
    count: number;
    commonWords: Array<{ word: string; count: number }>;
    commonPhrases: Array<{ phrase: string; count: number }>;
    commonAttributes: Array<{ name: string; value: string; count: number }>;
    averages: { titleLength: number | null; descriptionLength: number | null; photoCount: number | null };
    priceBandContrasts: {
        lower: { count: number; commonWords: string[]; averagePhotoCount: number | null };
        upper: { count: number; commonWords: string[]; averagePhotoCount: number | null };
    };
}

export interface FetchRequest {
    url: URL;
    kind: 'search' | 'detail';
    attempt: number;
}

export interface FetchResult {
    html: string;
    statusCode: number;
    finalUrl: string;
}

export interface PageFetcher {
    fetchHtml(request: FetchRequest): Promise<FetchResult>;
}

export interface CollectionFailure {
    url: string;
    stage: 'search' | 'detail';
    reason: string;
}

export interface CollectionResult {
    listings: NormalizedListing[];
    excludedFailures: CollectionFailure[];
    counts: { searchPages: number; candidates: number; detailAttempts: number; saved: number; failed: number };
    warnings: string[];
    partial: boolean;
    selectorDrift: { attempted: number; failures: number; ratio: number; terminal: boolean };
}

export interface CollectorDependencies {
    httpFetcher: PageFetcher;
    browserFetcher: PageFetcher;
    saveCheckpoint(listing: NormalizedListing): Promise<void> | void;
    now(): Date;
    sleep?(milliseconds: number): Promise<void> | void;
}

export interface ReportAnalyses {
    prices: Partial<Record<SearchSegment, PriceAnalysis>>;
    content: ContentAnalysis;
}

export interface ReportOffer {
    listingId: string;
    url: string;
    title: string;
    price: number | null;
    locationName: string | null;
    distanceKm: number | null;
    score: number;
    matchReasons: string[];
    attributes: CategoryAttributes;
    descriptionSummary: string | null;
}

export interface ReportModel {
    generatedAt: string;
    input: ValidatedInput;
    queries: string[];
    collectionCounts: CollectionResult['counts'];
    priceSections: Partial<Record<SearchSegment, PriceAnalysis>>;
    content: ContentAnalysis;
    assumptions: string[];
    missingFields: string[];
    diagnostics: { partial: boolean; warnings: string[]; selectorDrift: CollectionResult['selectorDrift']; failures: CollectionFailure[] };
    topOffers: ReportOffer[];
    otherComparableCount: number;
}

export interface StoragePort {
    pushOffer(record: ScoredListing): Promise<void> | void;
    setArtifact(name: string, value: unknown, contentType: string): Promise<void> | void;
    setStatus(message: string): Promise<void> | void;
}

export interface RuntimeDependencies {
    getInput(): Promise<unknown>;
    collect(plan: SearchPlan, input: ValidatedInput): Promise<CollectionResult>;
    storage: StoragePort;
    now(): Date;
}

export interface RunSummary {
    itemName: string;
    comparableOffers: number;
    collectedOffers: number;
    partial: boolean;
    confidence: Partial<Record<SearchSegment, PriceAnalysis['confidence']>>;
}
