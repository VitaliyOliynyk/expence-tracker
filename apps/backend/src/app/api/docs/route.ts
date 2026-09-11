// Swagger UI jako route handler zwracajacy HTML - backend nie ma stron ani layoutu,
// wiec nie dokladamy ich tylko dla dokumentacji. Wersja przypieta, CDN jsdelivr.
const SWAGGER_UI_URL = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.32.15";

const HTML = `<!doctype html>
<html lang="pl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Expence Tracker API</title>
    <link rel="stylesheet" href="${SWAGGER_UI_URL}/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="${SWAGGER_UI_URL}/swagger-ui-bundle.js" crossorigin></script>
    <script>
      window.ui = SwaggerUIBundle({ url: "/api/openapi.json", dom_id: "#swagger-ui" });
    </script>
  </body>
</html>`;

/**
 * Publiczna strona Swagger UI czytajaca specyfikacje z /api/openapi.json.
 *
 * Nie rzuca wyjatkow - HTML jest stalym tekstem.
 *
 * @returns 200 z dokumentem HTML.
 */
export function GET() {
  return new Response(HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
