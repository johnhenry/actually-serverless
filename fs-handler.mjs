import noFSHandler from "./no-fs-handler.mjs";

const fsHandler = ({ request, fileHandler = noFSHandler }) => {
  return fileHandler ? fileHandler(request) : noFSHandler();
};

export const defaultExportStr = `export default ${fsHandler.toString()}`;

export default fsHandler;
