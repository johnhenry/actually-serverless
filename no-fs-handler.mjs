export default () => {
  return new Response("No fileHandler Selected", {
    status: 503,
    statusText: "Not Implemented",
  });
};
