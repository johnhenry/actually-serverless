import * as Utils from "./utils.js";

export default (host, kind) => {
  Utils.PostToSW({
    type: "set-strategy",
    host: host.id,
    kind,
  });
};
