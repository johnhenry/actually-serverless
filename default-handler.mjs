const defaultHandler = () =>
  new Response("not implemented", {
    status: 501,
    statusText: "Not Implemented",
  });

export const defaultExportStr = `export default ${defaultHandler.toString()}`;

export default defaultHandler;
