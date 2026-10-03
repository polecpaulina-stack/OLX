import { describe, expect, it, vi } from 'vitest';
import { runActor } from '../src/run-actor.js';
import type { CollectionResult, RuntimeDependencies, StoragePort } from '../src/types.js';

const rawInput = { itemName: 'opony zimowe 205/55 R16', condition: 'used', deliveryMode: 'local', postalCode: '55-002', radiusKm: 50, maxResults: 10 };
const emptyCollection: CollectionResult = { listings: [], excludedFailures: [], counts: { searchPages: 1, candidates: 0, detailAttempts: 0, saved: 0, failed: 0 }, warnings: [], partial: false, selectorDrift: { attempted: 0, failures: 0, ratio: 0, terminal: false } };

describe('runActor', () => {
    it('runs ordered stages, persists useful zero-result outputs and statuses', async () => {
        const statuses: string[] = [];
        const storage: StoragePort = { pushOffer: vi.fn(), setArtifact: vi.fn(), setStatus: vi.fn(async (message) => { statuses.push(message); }) };
        const collect = vi.fn(async () => emptyCollection);
        const deps: RuntimeDependencies = { getInput: async () => rawInput, collect, storage, now: () => new Date('2026-10-03T12:00:00Z') };
        const result = await runActor(deps);
        expect(collect).toHaveBeenCalledTimes(1);
        expect(statuses).toEqual(['Walidacja wejścia', 'Budowanie planu wyszukiwania', 'Pobieranie ofert', 'Ocena i analiza ofert', 'Zapisywanie wyników', 'Zakończono: 0 ofert porównywalnych']);
        expect(storage.setArtifact).toHaveBeenCalledWith('REPORT.md', expect.stringContaining('Brak porównywalnych ofert'), expect.any(String));
        expect(result.comparableOffers).toBe(0);
    });
});
