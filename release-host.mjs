import * as Utils from "./utils.js";

export default (host, hosts) => {
  delete hosts[host.id];
  Utils.PostToSW({
    type: "release-host",
    host: host.id,
  });
};
