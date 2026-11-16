# Page Cloner — instalacja na Simply.com

Archiwum zawiera kompletną aplikację: frontend, API, schemat bazy PostgreSQL oraz konfigurację Docker.

## Najprostsza instalacja na VPS lub serwerze z Dockerem

1. Rozpakuj archiwum na serwerze.
2. Przejdź do katalogu aplikacji.
3. Utwórz plik konfiguracyjny:

   ```bash
   cp .env.example .env
   ```

4. Otwórz `.env` i ustaw własne wartości:

   ```env
   POSTGRES_PASSWORD=dlugie_wlasne_haslo
   SESSION_SECRET=dlugi_losowy_ciag_znakow
   HOST_PORT=80
   ```

5. Uruchom aplikację:

   ```bash
   docker compose up -d --build
   ```

6. Sprawdź logi:

   ```bash
   docker compose logs -f
   ```

Aplikacja będzie dostępna pod adresem domeny przypisanej do serwera. Jeśli port 80 jest zajęty,
ustaw inny `HOST_PORT` w pliku `.env`, na przykład `8080`.

## Ważne dla zwykłego hostingu WWW

Zwykły hosting plików WWW nie uruchomi samodzielnie kontenerów Docker, serwera Node.js
ani PostgreSQL. W takim wariancie potrzebne są:

- VPS lub usługa Simply.com obsługująca Docker dla całej aplikacji, albo
- osobny serwer dla API i PostgreSQL.

Sam frontend znajduje się w `artifacts/page-cloner/dist/public`, ale bez działającego API
funkcja klonowania stron, historia i pobieranie zasobów nie będą działać.

## Zawartość archiwum

- `artifacts/page-cloner` — aplikacja frontendowa i gotowy build
- `artifacts/api-server` — serwer API i gotowy build
- `lib` — wspólne typy API, walidacja i schemat bazy
- `docker-compose.yml` — uruchomienie PostgreSQL, API i frontendu
- `artifacts/*/Dockerfile` — obrazy produkcyjne
- `artifacts/page-cloner/nginx.conf` — frontend oraz przekierowanie `/api/` do API
- `.env.example` — szablon konfiguracji

Nie umieszczaj prawdziwego pliku `.env` w publicznym katalogu strony ani w repozytorium.