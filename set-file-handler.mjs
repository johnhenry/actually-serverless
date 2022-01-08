import createFileSystemHandler from "./createFileSystemHandler.mjs";
import * as Utils from "./utils.js";

export default async (host, hosts) => {
  const { name, fetch } = await createFileSystemHandler();
  const item = hosts[host.id];
  item.fileHandler = fetch;
  Utils.PostToSW({
    type: "backup-client",
    host: host.id,
    data: {
      funcText: item.funcText,
    },
  });
};
