export async function onRequest({ request }) {
  const base = "https://body-metrics-relay.bodymetricstracker.workers.dev";
  const url = new URL(request.url);
  const path = url.searchParams.get("path") || "";
  const target = new URL(base);
  if (path) {
    target.pathname = path.startsWith("/") ? path : `/${path}`;
  }
  for (const [key, value] of url.searchParams.entries()) {
    if (key === "path") {
      continue;
    }
    target.searchParams.append(key, value);
  }

  const init = {
    method: request.method,
    headers: new Headers(request.headers),
    redirect: "manual",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
  }

  const proxyRequest = new Request(target.toString(), init);
  return fetch(proxyRequest);
}
