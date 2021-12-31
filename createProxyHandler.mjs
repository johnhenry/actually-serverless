export default (url, defaultPage = "") => {
  if (!url.endsWith("/")) {
    url = url + "/";
  }
  return async (oldRequest) => {
    const newURL = url + new URL(oldRequest.url).pathname;
    const newRequest = new Request(newURL, oldRequest);
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
};
