import noFSHandler from "./no-fs-handler.mjs";

const fsHandler = ({ request, fileHandler = noFSHandler }) => {
  if (fileHandler) {
    return fileHandler(request);
  }
  return new Response("No fileHandler Selected", {
    status: 503,
    statusText: "Not Implemented",
  });
};

export const defaultExportStr = `export default ${fsHandler.toString()}`;

export default fsHandler;
