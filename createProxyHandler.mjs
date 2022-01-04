const url = "http://localhost:8080/host/proxied-page/"; // End with "/"
const defaultPage = "";
export default async ({ request: oldRequest }) => {
  const newURL = url + new URL(oldRequest.url).pathname;
  const { headers, method, body } = oldRequest;
  const newRequest = new Request(newURL, { headers, method, body });
  const firstResponse = await fetch(newRequest);
  if (firstResponse.ok) {
    return firstResponse;
  }
  if (newURL.endsWith("/") && defaultPage) {
    const newerURL = newURL + defaultPage;
    const newerRequest = new Request(newerURL, oldRequest);
    const secondResponse = await fetch(newerRequest);
    if (secondResponse.ok) {
      return secondResponse;
    }
  }
  return firstResponse;
};
