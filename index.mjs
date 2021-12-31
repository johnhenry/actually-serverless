import randomName from "./random-haloai.mjs";
import * as Utils from "./utils.js";
import defaultHandler, { defaultExportStr } from "./default-handler.mjs";
import setStrategy from "./set-strategy.mjs";
import setFileHandler from "./set-file-handler.mjs";
import removeFileHandler from "./remove-file-handler.mjs";
import setFunction from "./set-function.mjs";
import createFunctionHandler from "./createFunctionHandler.mjs";
import noFSHandler from "./no-fs-handler.mjs";

const { document, prompt } = globalThis;
// const { log } = globalThis.console;
const template = document.getElementById("template-host").innerHTML;
const hosts = {};
const hostList = document.getElementById("host-list");
const logElement = document.querySelector("#logs");
const hostsUpdated = (event) => {
  const { strategies } = event.data;
  let currentHost;
  while ((currentHost = hostList.querySelector(".host"))) {
    hostList.removeChild(currentHost);
  }
  // hostList.innerHTML = "";
  for (const [host, strategy] of Object.entries(strategies || {})) {
    const div = document.createElement("div");
    if (hosts[host]) {
      div.innerHTML = template
        .replaceAll("$HOST_ID", host)
        .replaceAll("$FUNCTION_TEXT", hosts[host].funcText ?? defaultExportStr)
        .trim();
      //TODO set close button to "remove-hose"
    } else {
      div.innerHTML = template.replaceAll("$HOST_ID", host).trim();
      div.firstChild.querySelector(`textarea`).style.display = "none";
      div.firstChild.querySelector(`button`).style.display = "none";
      //TODO set close button to "claim-host"
    }
    div.firstChild.querySelector(`.${strategy}`).classList.add("selected");

    hostList.append(div.firstChild);
  }
};
const hostRemoved = (event) => {};
const clientAdded = async (event) => {
  if (event.data.backup && event.data.backup.length) {
    for (const [host, { fs, funcText }] of event.data.backup) {
      hosts[host] = {
        fs,
        funcText,
        fetch: await createFunctionHandler(funcText ?? defaultExportStr),
      };
    }
  }
  hostsUpdated(event);
};
const logs = [];
const renderLogs = (log, logs, logElement) => {
  if (logs) {
    logs.push(log);
  }
  if (logElement) {
    const div = document.createElement("div");
    div.classList.add(log.kind);
    switch (log.kind) {
      case "request":
        div.innerText += `[${log.date}] ${log.host}: ${log.method} ${log.path}`;
        break;
      case "response":
        if (!log.ok) {
          div.classList.add("notok");
        }
        div.innerText += `[${log.date}] ${log.host}: ${log.path} ${log.status} ${log.statusText}`;
        break;
      case "error":
        div.innerText += `[${log.date}] ${log.host} ${log.path} ${log.message} `;
        break;
      case "log":
        div.innerText += `[${log.date}] ${log.host} ${log.message} `;
        break;
    }
    logElement.append(div);
    logElement.scrollTop = logElement.scrollHeight;
  }
};

const consoleLog =
  (host) =>
  (...items) => {
    renderLogs(
      {
        kind: "log",
        host,
        date: new Date(),
        message: items.join(" "),
      },
      logs,
      logElement
    );
  };

const handleFetch = async (event) => {
  const { id } = event.data;
  try {
    const { url, method, headers, body } = event.data.psuedoRequest;
    const request = new Request(url, {
      method,
      headers: Object.fromEntries(headers),
      //TODO: May need more rhobust handling of converting entries to headers' object
      body,
    });
    // Log Request
    renderLogs(
      {
        kind: "request",
        id,
        host: event.data.host,
        date: new Date(),
        method: request.method,
        path: new URL(request.url).pathname,
      },
      logs,
      logElement
    );
    const host = hosts[event.data.host] || {};
    const { fetch = defaultHandler, fileHandler = noFSHandler } = host;
    const response = await fetch({
      request,
      fileHandler,
      log: consoleLog(event.data.host),
    });
    const { body: resBody, headers: resHeaders, status, statusText } = response;
    // Log Response
    {
      renderLogs(
        {
          kind: "response",
          id,
          host: event.data.host,
          date: new Date(),
          status: response.status,
          ok: response.ok,
          statusText: response.statusText,
          path: new URL(request.url).pathname,
        },
        logs,
        logElement
      );
    }
    event.data.port.postMessage(
      {
        id,
        psuedoResponse: {
          body: resBody,
          headers: [...resHeaders.entries()],
          status,
          statusText,
        },
      },
      [resBody]
    );
  } catch (error) {
    renderLogs(
      {
        kind: "error",
        id,
        host: event.data.host,
        date: new Date(),
        error: error.message,
      },
      logs,
      logElement
    );
    event.data.port.postMessage({
      error,
    });
  }
};

Utils.RegisterSW(window.location.pathname);
await Utils.WaitForSWReady();
console.log("SW ready");
// Handle messages from SW
navigator.serviceWorker.addEventListener("message", (event) => {
  console.log("SW type", event.data.type);
  switch (event.data.type) {
    case "client-added":
      clientAdded(event);
      break;
    case "hosts-updated":
      hostsUpdated(event);
      break;
    case "host-removed":
      hostRemoved(event);
      break;
    case "fetch":
      handleFetch(event);
      break;
    default:
      console.warn(`Unknown message from SW '${event.data.type}'`);
      break;
  }
});
document.body.addEventListener("click", (event) => {
  if (event.target) {
    const { target } = event;
    const host = target.closest(".host");
    if (host) {
      if (target.classList.contains("set-strategy")) {
        setStrategy(host, target.dataset.strategy);
      } else if (target.classList.contains("set-file-handler")) {
        setFileHandler(host, hosts);
      }
    }
  }
});
document.body.addEventListener("dblclick", (event) => {
  if (event.target) {
    const { target } = event;
    const host = target.closest(".host");
    if (host) {
      if (target.classList.contains("set-file-handler")) {
        removeFileHandler(host, hosts);
      }
    }
  }
});
document.body.addEventListener("input", (event) => {
  if (event.target) {
    const { target } = event;
    const host = target.closest(".host");
    if (host) {
      if (target.classList.contains("update-function")) {
        setFunction(host, hosts);
      }
    }
  }
});

document.getElementById("add-host").addEventListener("click", () => {
  const host = prompt("Add Host:", "exuberant-solitude" || randomName());
  if (host) {
    hosts[host] = hosts[host] || { fetch: defaultHandler };
    Utils.PostToSW({
      type: "claim-host",
      host,
    });
  }
});
window.addEventListener("unload", () => {
  Utils.PostToSW({
    type: "remove-client",
  });
});
Utils.PostToSW({
  type: "add-client",
});
