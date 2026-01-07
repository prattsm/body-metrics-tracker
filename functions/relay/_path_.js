export async function onRequest({ request, params }) {
  const base = "https://body-metrics-relay.bodymetricstracker.workers.dev";
  const url = new URL(request.url);
  const rest = params.path ? params.path.split("/") : [];
  const target = new URL(base);
  if (rest.length) {
    target.pathname = `/v1/${rest.join("/")}`.replace(/\/+/g, "/");
  }
  target.search = url.search;

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
