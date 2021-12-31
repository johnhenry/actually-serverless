import createFunctionHandler from "./createFunctionHandler.mjs";
import { defaultExportStr } from "./fs-handler.mjs";
import * as Utils from "./utils.js";

export default async (host, hosts) => {
  const funcText = host.querySelector(".update-function").value.trim();
  const item = hosts[host.id];
  item.funcText = funcText;
  item.fetch = await createFunctionHandler(funcText || defaultExportStr);
  Utils.PostToSW({
    type: "backup-client",
    host: host.id,
    data: {
      funcText: item.funcText,
      fs: item.fs,
    },
  });
};
