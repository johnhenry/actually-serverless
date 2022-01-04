import * as Utils from "./utils.js";

export default (host) => {
  Utils.PostToSW({
    type: "set-takeover",
    host: host.id,
  });
};
