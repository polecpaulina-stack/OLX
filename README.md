## Co robi OLX Market Research Assistant?

Actor analizuje publiczne oferty z [OLX.pl](https://www.olx.pl/) dla jednego przedmiotu na uruchomienie. Porównuje ceny ofertowe, lokalizacje, parametry i wzorce treści, a następnie tworzy **raport cenowy**, tabelę porównywalnych ofert i gotowy materiał do ręcznego wklejenia do ChatGPT. Nie publikuje ogłoszeń, nie kontaktuje się ze sprzedawcami i nie korzysta z prywatnych danych ani z API omijających interfejs serwisu.

## Dlaczego warto użyć tego Actora?

- działa dla odbioru osobistego, wysyłki lub obu segmentów;
- domyślnie obsługuje opony, rowery i buty dziecięce oraz skrzydła okienne dachowe, ale ma też tryb ogólny;
- usuwa duplikaty, odrzuca akcesoria, ogłoszenia „kupię” i nieporównywalne zestawy;
- pokazuje trzy strategie: szybką sprzedaż, cenę rynkową i ambitną;
- tworzy raporty w Dataset i Key-value store, które można pobierać przez API Apify, harmonogramy i integracje;
- zachowuje częściowe wyniki oraz diagnostykę, jeśli pojedyncze strony przestaną działać.

## Jakie dane Actor wydobywa?

| Pole | Typ | Znaczenie |
|---|---|---|
| `title`, `url` | tekst | Tytuł i publiczny adres oferty |
| `price`, `currency` | liczba/tekst | Cena ofertowa i waluta |
| `locationName`, `distanceKm` | tekst/liczba | Lokalizacja i dostępna odległość |
| `shippingAvailable` | boolean | Deklarowana wysyłka OLX |
| `attributesNormalized` | obiekt | Rozmiar, model i parametry kategorii |
| `score`, `matchReasons` | liczba/lista | Ocena podobieństwa i jej wyjaśnienie |

## Jak analizować konkurencję na OLX?

1. Otwórz kartę Input Actora.
2. Wpisz jeden sprzedawany przedmiot, jego stan i najważniejsze parametry.
3. Wybierz odbiór osobisty, wysyłkę albo oba warianty. Dla odbioru podaj kod pocztowy i promień.
4. Opcjonalnie dodaj własne frazy lub publiczne adresy wyników wyszukiwania OLX.
5. Uruchom Actor i otwórz `REPORT.html` albo `REPORT.md`.
6. Skopiuj `CHATGPT_PROMPT.md` do ChatGPT, aby otrzymać oryginalny tytuł i opis swojej oferty.

## Ile kosztuje analiza OLX?

Actor zużywa zasoby compute units na pobieranie stron. Największy wpływ mają `maxResults`, liczba automatycznych i ręcznych zapytań, liczba segmentów oraz ewentualne użycie przeglądarki. Zacznij od 20–50 ofert i jednego segmentu. Limity kredytów oraz bieżące zużycie są widoczne w konsoli Apify. Proxy może poprawić stabilność, ale zwiększa koszt zgodnie z planem Apify.

## Input

Pełna konfiguracja jest widoczna w karcie Input. `itemName`, `condition` i `deliveryMode` są wymagane. Dla odbioru podaj zgodne `postalCode` i `locationName`; OLX używa miejscowości w publicznym adresie wyszukiwania, a kod pocztowy pozostaje w raporcie jako deklarowany punkt odniesienia. `manualQueries` uzupełniają zapytania automatyczne, a `queryMode: manual-only` wyłącza ich generowanie. `manualSearchUrls` przyjmuje wyłącznie publiczne adresy HTTPS wyszukiwania z domeny `olx.pl`. Domyślny odbiór osobisty to Kamieniec Wrocławski, kod `55-002` i promień 50 km.

## Output

Dataset zawiera jeden rekord na zaakceptowaną ofertę. Możesz pobrać Dataset w formatach JSON, HTML, CSV lub Excel. Key-value store zawiera:

- `REPORT.md` i `REPORT.html` — raport dla człowieka;
- `CHATGPT_PROMPT.md` — pakiet do ręcznej pracy w ChatGPT;
- `RUN_SUMMARY.json` — wejście, analizy i diagnostykę;
- `EXCLUDED.json` — ograniczoną listę odrzuconych wyników.

Przykładowy rekord:

```json
{"title":"Opony zimowe 205/55 R16","price":800,"locationName":"Wrocław","score":0.91,"matchReasons":["zgodna nazwa przedmiotu"]}
```

## Uruchomienie lokalne i wdrożenie

Wymagany jest Node.js 22+ i Apify CLI. Uruchom `npm ci`, następnie `apify run --purge`. Testy: `npm test`; kompilacja: `npm run build`. Kontrolowany test sieciowy uruchomisz tylko jawnie: `LIVE_OLX_SMOKE=1 npm run smoke:live -- --input tests/fixtures/inputs/winter-tires.json` (w PowerShell ustaw zmienną przez `$env:LIVE_OLX_SMOKE='1'`). Wdrożenie na własne konto: `apify push`. Nie zapisuj tokenu Apify w repozytorium.

## Wskazówki i rozwiązywanie problemów

Jeśli raport jest zbyt szeroki, podaj markę/model i parametry liczbowe albo własne zapytania. Seria błędów parsera i komunikat o zmianie selektorów oznacza, że układ OLX prawdopodobnie się zmienił; sprawdź logi i `RUN_SUMMARY.json`. Kod 403/429 oznacza ograniczenie dostępu — Actor nie używa przeglądarki do obchodzenia blokady. Skonfiguruj legalny proxy Apify i ogranicz częstotliwość uruchomień.

Podawane ceny są **cenami ofertowymi, nie cenami zakończonych transakcji**. Rekomendacje mają poziom pewności zależny od liczby i jakości ofert.

## FAQ, odpowiedzialne użycie i wsparcie

Actor redaguje numery telefonów i adresy e-mail z opisów. Pobiera wyłącznie publicznie widoczne informacje potrzebne do analizy konkurencji. Używaj go zgodnie z regulaminem OLX, prawem autorskim, RODO/GDPR i rozsądnymi limitami zapytań. Nie kopiuj opisów konkurencji — pakiet ChatGPT wymaga stworzenia oryginalnej treści.

Publiczne dane mogą nadal stanowić dane osobowe. Nie przetwarzaj ich bez uzasadnionego celu; w razie wątpliwości skonsultuj prawnika. Problemy zgłaszaj w karcie Issues, a automatyzację znajdziesz w karcie API Actora.
