# Wdrożenie na Cloudflare Pages

1. Wrzuć zawartość tego folderu na główny poziom repozytorium GitHub (index.html ma leżeć w katalogu głównym, nie w podfolderze).
2. Cloudflare > Workers & Pages > Create > Pages > Connect to Git > wybierz repozytorium.
3. Build command: zostaw puste. Build output directory: `/` (lub puste).
4. Po wdrożeniu w ustawieniach domeny włącz "Always Use HTTPS".
5. Plik `_headers` ustawia nagłówki bezpieczeństwa automatycznie.

Pliki: index.html, 3 podstrony prawne, hero.mp4, poster.jpg, assets/ (czcionki, animacje i style lokalnie, bez zewnętrznych serwerów).
