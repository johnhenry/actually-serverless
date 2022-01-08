import * as Utils from "./utils.js";

export default async (host, hosts) => {
  const item = hosts[host.id];
  delete item.fileHandler;
  delete item.fs;
  Utils.PostToSW({
    type: "backup-client",
    host: host.id,
    data: {
      funcText: item.funcText,
      fs: item.fs,
    },
  });
};
