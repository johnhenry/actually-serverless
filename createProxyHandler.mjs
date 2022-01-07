const defaultHandler = async ({ request: oldRequest }) => {
  const __url = `PROXY_URL`;
  const __defaultPage = `PROXY_DEFAULT_PAGE`;
  const newURL = __url + new URL(oldRequest.url).pathname;
  const { headers, method, body } = oldRequest;
  const newRequest = new Request(newURL, { headers, method, body });
  const firstResponse = await fetch(newRequest);
  if (firstResponse.ok) {
    return firstResponse;
  }
  if (newURL.endsWith("/") && __defaultPage) {
    const newerURL = newURL + __defaultPage;
    const newerRequest = new Request(newerURL, oldRequest);
    const secondResponse = await fetch(newerRequest);
    if (secondResponse.ok) {
      return secondResponse;
    }
  }
  return firstResponse;
};
export const defaultExportStr = `export default ${defaultHandler.toString()}`;
export default defaultHandler;
