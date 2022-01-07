import createFunctionHandler from "./createFunctionHandler.mjs";
import { defaultExportStr as fsString } from "./fs-handler.mjs";
import { defaultExportStr as proxyString } from "./createProxyHandler.mjs";
import * as Utils from "./utils.js";

export default async (host, hosts, varstext) => {
  const rawText = host.querySelector(".update-function").value;
  const item = hosts[host.id];
  item.funcText = rawText;
  let funcText = item.funcText.trim();
  if (!funcText || funcText.startsWith("fs:")) {
    funcText = fsString;
  } else if (funcText.startsWith("proxy:")) {
    const [_, url, defaultPage] = /proxy:(.+) ?(.+)?/.exec(funcText);
    funcText = proxyString
      .replace("PROXY_URL", url)
      .replace("PROXY_DEFAULT_PAGE", defaultPage || "");
  }

  item.fetch = await createFunctionHandler(funcText, varstext);
  Utils.PostToSW({
    type: "backup-client",
    host: host.id,
    data: {
      funcText: item.funcText,
      fs: item.fs,
    },
  });
};
