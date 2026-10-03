# Apify Actor do analizy konkurencji na OLX.pl

**Status:** do przeglądu użytkownika  
**Data:** 2026-10-03  
**Platforma:** Apify  
**Rynek:** Polska

## 1. Cel

Zbudować wielokrotnie używany Apify Actor, który dla jednego opisanego przez użytkownika przedmiotu zbiera porównywalne, publicznie dostępne ogłoszenia OLX.pl i przygotowuje materiał potrzebny do podjęcia decyzji o cenie oraz napisania własnej oferty.

Actor nie korzysta z modelu językowego ani z OpenAI API. Zamiast tego generuje uporządkowaną analizę, Dataset i gotowy pakiet tekstowy, który użytkownik może ręcznie wkleić do ChatGPT. Jedno uruchomienie analizuje jeden przedmiot.

## 2. Kryteria sukcesu

Actor jest użyteczny, jeśli użytkownik może:

1. opisać dowolny przedmiot w standardowym formularzu Apify;
2. wybrać odbiór osobisty, wysyłkę albo oba warianty;
3. pozostawić automatyczny dobór zapytań, dodać własne zapytania albo użyć wyłącznie własnych;
4. otrzymać deduplikowaną tabelę ofert wraz z oceną podobieństwa;
5. zobaczyć typowy przedział cen, trzy strategie cenowe i poziom pewności;
6. pobrać raport oraz gotowy materiał do ręcznego użycia w ChatGPT;
7. zrozumieć ograniczenia wyniku, brakujące dane i błędy częściowe.

## 3. Zakres pierwszej wersji

Pierwsza wersja obsługuje wszystkie kategorie przez wspólny mechanizm oraz ma dodatkowe ekstraktory parametrów dla czterech kategorii startowych:

- skrzydła okienne dachowe;
- opony zimowe;
- rowery dziecięce;
- buty dziecięce.

Actor analizuje wyłącznie aktywne, publicznie dostępne ogłoszenia. Nie wystawia ogłoszeń na OLX, nie loguje się do konta, nie kontaktuje się ze sprzedawcami, nie pobiera telefonów ani adresów e-mail i nie próbuje obchodzić CAPTCHA lub innych zabezpieczeń.

Poza zakresem pierwszej wersji pozostają:

- automatyczne publikowanie ogłoszenia;
- analiza zdjęć;
- historia sprzedaży i ceny faktycznie zawartych transakcji;
- harmonogram monitorowania zmian w czasie;
- osobny interaktywny panel WWW;
- automatyczne wywołanie ChatGPT lub innego modelu AI.

## 4. Technologia i struktura

Actor zostanie napisany w TypeScript z użyciem Apify SDK i Crawlee.

Domyślnym mechanizmem będzie lekki crawler HTTP/HTML. Przeglądarka Playwright będzie używana tylko jako kontrolowany mechanizm awaryjny, gdy wymagane dane nie są dostępne w odpowiedzi HTML. Ogranicza to czas uruchomień i zużycie kredytów Apify, zachowując możliwość obsługi stron dynamicznych.

Główne moduły:

1. **Input** — walidacja i normalizacja formularza.
2. **Query Builder** — deterministyczne tworzenie fraz i wariantów wyszukiwania.
3. **Search Collector** — pobieranie stron wyników dla segmentów lokalnych i wysyłkowych.
4. **Listing Collector** — pobieranie oraz parsowanie stron szczegółów.
5. **Normalizer** — wspólny model danych, czyszczenie tekstu i cen.
6. **Category Extractors** — rozpoznawanie parametrów charakterystycznych dla kategorii.
7. **Matcher** — deduplikacja, ocena podobieństwa i uzasadnienie dopasowania.
8. **Analyzer** — statystyki cenowe, słowa kluczowe, jakość próby i rekomendacje.
9. **Reporter** — Dataset, raport Markdown/HTML, podsumowanie JSON i pakiet do ChatGPT.

Moduły mają małe, jawne interfejsy, aby parser OLX można było zmienić bez modyfikowania analizy i raportowania.

## 5. Formularz wejściowy

Standardowy formularz Apify zawiera:

| Pole | Typ | Wymagane | Wartość domyślna / zachowanie |
|---|---|---:|---|
| `itemName` | tekst | tak | Nazwa przedmiotu |
| `category` | tekst / wybór | nie | Kategoria ogólna albo wartość własna |
| `brandModel` | tekst | nie | Marka, model lub oznaczenie produktu |
| `condition` | wybór | tak | nowy, jak nowy, bardzo dobry, używany, uszkodzony |
| `attributes` | dłuższy tekst | nie | Parametry, wymiary, rozmiar, materiał, rok itp. |
| `defects` | dłuższy tekst | nie | Wady i ślady użytkowania |
| `expectedPrice` | liczba PLN | nie | Cena rozważana przez użytkownika |
| `deliveryMode` | wybór | tak | odbiór osobisty, wysyłka, oba |
| `postalCode` | tekst | warunkowo | `55-002` |
| `radiusKm` | wybór/liczba | warunkowo | `50` |
| `manualQueries` | lista tekstów | nie | Dodatkowe lub zastępujące zapytania |
| `manualSearchUrls` | lista URL | nie | Bezpośrednie publiczne adresy wyszukiwania OLX |
| `queryMode` | wybór | nie | `merge`; alternatywa: `manual-only` |
| `maxResults` | liczba | nie | `100`, zakres 10–300 |
| `includePromoted` | boolean | nie | `true`, ale oferty są oznaczane i analizowane osobno |

Kod i promień są wymagane tylko dla odbioru osobistego lub trybu mieszanego. Formularz nie zawiera danych logowania do OLX ani klucza OpenAI.

## 6. Generowanie zapytań

Query Builder działa bez AI. Tworzy maksymalnie pięć precyzyjnych wariantów z:

- nazwy przedmiotu;
- marki i modelu;
- najważniejszych parametrów liczbowych;
- rozpoznanych synonimów kategorii;
- form liczby pojedynczej i mnogiej, gdy jest to użyteczne.

Zapytania zbyt ogólne są odrzucane. W trybie `merge` zapytania ręczne i automatyczne są łączone. W trybie `manual-only` Actor używa wyłącznie wartości użytkownika. Wykorzystane zapytania i adresy są zapisywane w raporcie, aby można je było ocenić i poprawić przy kolejnym uruchomieniu.

Standardowy formularz Apify nie pokazuje dynamicznie wygenerowanych zapytań przed rozpoczęciem runu. Pierwsza wersja nie dodaje osobnego interfejsu tylko w tym celu.

## 7. Pobieranie danych

Actor używa publicznych stron wyszukiwania i stron ogłoszeń OLX.pl. Nie korzysta z obszarów konta, stron kontaktowych ani niedozwolonych ścieżek API.

Proces:

1. utworzenie osobnego segmentu dla odbioru osobistego i/lub wysyłki;
2. zastosowanie filtra lokalizacji OLX dla kodu i promienia w segmencie lokalnym;
3. zastosowanie zasięgu ogólnopolskiego i dostępności wysyłki w segmencie wysyłkowym;
4. zebranie kandydatów ze stron wyników;
5. pobranie stron szczegółowych do osiągnięcia limitu lub wyczerpania wyników;
6. deduplikacja po identyfikatorze ogłoszenia, a następnie po kanonicznym URL;
7. zapis częściowego wyniku po każdej poprawnie przetworzonej ofercie.

Domyślna współbieżność jest konserwatywna. Actor reaguje na `429`, `403` i błędy przejściowe przez ograniczone ponowienia z narastającym opóźnieniem. Powtarzająca się blokada kończy pobieranie zamiast uruchamiać mechanizmy obchodzenia zabezpieczeń.

## 8. Model danych oferty

Każdy rekord Dataset zawiera, jeśli dane są dostępne:

- `listingId`;
- `url` i `canonicalUrl`;
- `title`;
- `price`, `currency`, `priceNegotiable`;
- `categoryPath`;
- `condition`;
- `attributesRaw` i `attributesNormalized`;
- `locationName`, `voivodeship`, `distanceKm`;
- `locationFilterMatched`;
- `shippingAvailable`;
- `sellerType` bez nazwy i danych kontaktowych;
- `publishedAt` lub `refreshedAt`;
- `descriptionClean`;
- `photoCount`;
- `isPromoted`;
- `matchedQueries`;
- `relevanceScore` w zakresie 0–1;
- `matchReasons` i `exclusionReasons`;
- `segment` (`local`, `shipping` albo oba);
- `scrapedAt`;
- `dataCompleteness`.

Brakujące wartości mają wartość `null`; Actor nie zgaduje danych. Opisy są czyszczone z numerów telefonu, adresów e-mail i innych wykrytych danych kontaktowych. Pełne zdjęcia nie są pobierane; zapisywana jest liczba zdjęć, a URL miniatury może być zachowany wyłącznie jako pomocniczy publiczny odnośnik.

## 9. Parametry kategorii

Wspólny parser zachowuje wszystkie jawne atrybuty OLX. Dodatkowe ekstraktory rozpoznają:

- **opony:** szerokość, profil, średnicę felgi, markę, liczbę sztuk, rok produkcji/DOT, głębokość bieżnika, run-flat;
- **rowery dziecięce:** rozmiar koła, sugerowany wzrost lub wiek, rozmiar ramy, liczbę biegów, rodzaj hamulców;
- **buty dziecięce:** markę, rozmiar, długość wkładki, sezon, materiał i deklarowany stan;
- **skrzydła okienne dachowe:** markę/system, szerokość, wysokość, materiał, rodzaj szyby i widoczne oznaczenia modelu.

Dla innych kategorii Actor stosuje parser ogólny i zachowuje nierozpoznane pary klucz–wartość. Dodanie kolejnej kategorii nie wymaga zmiany wspólnego modelu danych.

## 10. Ocena podobieństwa

Matcher używa jawnego, deterministycznego wyniku. Wagi są dobierane do dostępnych danych, ale obowiązuje następująca hierarchia:

1. kategoria i typ przedmiotu;
2. marka/model lub inne silne oznaczenie;
3. parametry liczbowe istotne dla kategorii;
4. stan;
5. podobieństwo tytułu i opisu;
6. zgodność segmentu dostawy/lokalizacji.

Oferty oczywiście innego rodzaju, akcesoria do produktu, poszukiwane przedmioty i zestawy nieporównywalne z pojedynczym produktem są odrzucane. Każdy wynik zawiera krótkie powody dopasowania lub wykluczenia.

Oferty promowane nie są automatycznie odrzucane, ale raport pokazuje je osobno. Identyczne ogłoszenia znalezione przez kilka zapytań są liczone tylko raz.

## 11. Analiza ceny

Analiza cenowa używa ofert o dostatecznej zgodności, z ceną liczbową i bez wykrytych duplikatów. Skrajne wartości są oznaczane metodą IQR; raport pokazuje statystyki zarówno przed, jak i po ich wyłączeniu.

Dla każdego segmentu obliczane są:

- liczba kandydatów i liczba ofert porównywalnych;
- minimum, maksimum, średnia i mediana;
- kwartyl dolny i górny;
- ważona mediana z wagą zależną od podobieństwa;
- rozkład cen według stanu, typu sprzedawcy i dostępności wysyłki, gdy próba jest wystarczająca.

Trzy strategie cenowe:

- **szybka sprzedaż:** okolice ważonego dolnego kwartyla;
- **cena rynkowa:** okolice ważonej mediany;
- **cena ambitna:** okolice ważonego górnego kwartyla, tylko gdy stan i parametry produktu użytkownika to uzasadniają.

Actor nie udaje znajomości ceny transakcyjnej — analizuje ceny ofertowe. Jeśli stan produktu użytkownika nie daje się wiarygodnie zestawić z próbką, raport nie stosuje automatycznej korekty i wyjaśnia ograniczenie.

Poziom pewności:

- **niski:** 1–9 porównywalnych ofert;
- **średni:** 10–24 porównywalne oferty;
- **wysoki:** co najmniej 25 porównywalnych ofert i odpowiednia kompletność danych.

Brak ofert porównywalnych nie generuje rekomendacji liczbowej.

## 12. Analiza treści ofert

Bez użycia AI Actor wyodrębnia:

- najczęściej występujące istotne słowa i frazy;
- często podawane parametry;
- cechy obecne w ofertach droższych i tańszych;
- typową długość tytułu i opisu;
- liczbę zdjęć;
- informacje często pomijane w słabszych lub niekompletnych ofertach.

Actor nie skleja opisów konkurencji i nie sugeruje kopiowania cudzej treści. Raport używa agregatów oraz krótkich, niezbędnych fragmentów do uzasadnienia analizy.

## 13. Wyniki

Domyślny Dataset zawiera jeden rekord na ogłoszenie i może być eksportowany przez mechanizmy Apify. Key-value store runu zawiera:

- `REPORT.md` — czytelny raport tekstowy;
- `REPORT.html` — raport do wygodnego otwarcia;
- `CHATGPT_PROMPT.md` — gotowy materiał do skopiowania;
- `RUN_SUMMARY.json` — wejście, zapytania, statystyki i diagnostyka;
- `EXCLUDED.json` — ograniczona lista odrzuconych kandydatów wraz z powodami.

Pakiet do ChatGPT zawiera:

1. opis produktu użytkownika;
2. zakres i jakość analizy;
3. statystyki ceny;
4. wzorce tytułów, opisów i parametrów;
5. maksymalnie 20 najbardziej podobnych ofert;
6. zagregowane informacje o pozostałych ofertach;
7. polecenie przygotowania oryginalnego tytułu, opisu, ceny i listy zdjęć bez kopiowania konkurencji;
8. polecenie wskazania założeń i brakujących informacji.

## 14. Obsługa błędów i diagnostyka

Actor:

- waliduje formularz przed rozpoczęciem pobierania;
- zapisuje wyniki na bieżąco;
- pomija pojedynczą wadliwą ofertę bez przerywania całego runu;
- ogranicza liczbę ponowień i raportuje ich przyczyny;
- odróżnia brak danych od błędu parsera;
- kończy run wyraźnym błędem, jeśli zmiana struktury OLX uniemożliwia wiarygodne parsowanie większości ofert;
- raportuje liczbę ofert znalezionych, pobranych, zduplikowanych, odrzuconych, niekompletnych i zaakceptowanych;
- zachowuje diagnostyczne metadane bez danych kontaktowych sprzedawców.

Wynik częściowy pozostaje dostępny, gdy nie wszystkie strony udało się pobrać. Raport zaznacza wtedy, że próba jest niepełna.

## 15. Odpowiedzialne pobieranie i prywatność

Actor działa tylko na publicznie dostępnych treściach potrzebnych do osobistego badania rynku. Stosuje konserwatywną współbieżność, opóźnienia i limit ofert. Nie omija logowania, blokad, CAPTCHA ani ograniczeń dostępu.

Dane kontaktowe i identyfikujące sprzedawców nie są celem analizy. Jeśli pojawią się w publicznym opisie, są redagowane przed zapisaniem tekstu i przed utworzeniem pakietu do ChatGPT. Użytkownik odpowiada za zgodne z prawem i regulaminem wykorzystanie wyników.

## 16. Testowanie

Testy jednostkowe obejmują:

- walidację wejścia i pola warunkowe;
- generowanie zapytań w obu trybach;
- normalizację cen, walut, dat i atrybutów;
- redagowanie telefonów i adresów e-mail;
- ekstraktory czterech kategorii startowych;
- deduplikację;
- ocenę podobieństwa i uzasadnienia;
- wykrywanie wartości odstających;
- kwartyle, medianę ważoną i poziom pewności;
- budowanie raportu i pakietu do ChatGPT;
- zgodność rekordów ze schematem Dataset.

Testy integracyjne używają zapisanych, zanonimizowanych fixture HTML dla wyników i szczegółów. Osobny test dymny wykonuje małe, kontrolowane pobranie publicznych stron OLX dla każdej kategorii startowej. Test dymny nie jest wymagany w zwykłym zestawie testów offline.

## 17. Kryteria odbioru pierwszej wersji

Pierwsza wersja jest gotowa, gdy:

1. buduje się lokalnie i na Apify;
2. formularz Apify waliduje wszystkie wymagane pola;
3. każde uruchomienie analizuje dokładnie jeden produkt;
4. wszystkie trzy tryby dostawy działają zgodnie z projektem;
5. automatyczne, łączone i wyłącznie ręczne wyszukiwanie są przetestowane;
6. Actor tworzy Dataset oraz pięć artefaktów raportowych wymienionych w sekcji 13;
7. rekomendacje cenowe zawierają próbę, metodę i poziom pewności;
8. dane kontaktowe nie trafiają do wyników ani pakietu ChatGPT;
9. częściowa awaria daje użyteczny wynik i czytelną diagnostykę;
10. scenariusze dla czterech kategorii startowych przechodzą testy;
11. README wyjaśnia konfigurację, uruchomienie, koszty Apify, ograniczenia i sposób użycia pakietu w ChatGPT.

## 18. Możliwe rozszerzenia

Po działającej pierwszej wersji można osobno zaprojektować:

- zapisywanie historii i monitorowanie zmian ceny;
- harmonogramy oraz powiadomienia;
- analizę wielu produktów w jednym runie;
- dodatkowe ekstraktory kategorii;
- interaktywny panel Standby;
- opcjonalne API modelu językowego;
- pomoc w publikowaniu oferty przez oficjalne, dozwolone integracje OLX.
