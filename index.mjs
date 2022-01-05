import randomName from "./random-haloai.mjs";
import * as Utils from "./utils.js";
import defaultHandler, { defaultExportStr } from "./default-handler.mjs";
import setStrategy from "./set-strategy.mjs";
import setFileHandler from "./set-file-handler.mjs";
// import removeFileHandler from "./remove-file-handler.mjs";
import releaseHost from "./release-host.mjs";
import setFunction from "./set-function.mjs";
// import setTakeover from "./set-takeover.mjs";
import createFunctionHandler from "./createFunctionHandler.mjs";
import noFSHandler from "./no-fs-handler.mjs";

const { document, prompt } = globalThis;
// const { log } = globalThis.console;
const template = document.getElementById("template-host").innerHTML;
const hosts = {};
const hostList = document.getElementById("host-list");
const logElement = document.querySelector("#log-box");
const requestHosts = document.getElementById("requests-hosts");
const hostsUpdated = (event) => {
  const { strategies } = event.data;
  let currentHost;
  while ((currentHost = hostList.querySelector(".host"))) {
    hostList.removeChild(currentHost);
  }
  // hostList.innerHTML = "";
  requestHosts.innerHTML = "";
  for (const [host, strategy] of Object.entries(strategies || {})) {
    const div = document.createElement("div");
    const hostOption = document.createElement("option");
    hostOption.value = host;
    hostOption.innerText = host;
    hostOption.selected = true;
    requestHosts.append(hostOption);
    if (hosts[host]) {
      div.innerHTML = template
        .replaceAll("$HOST_ID", host)
        .replaceAll("$FUNCTION_TEXT", hosts[host].funcText ?? defaultExportStr)
        .trim();
      setFunction(
        div.firstChild,
        hosts,
        settings.varglobal && environment.varstring
      );
    } else {
      div.innerHTML = template.replaceAll("$HOST_ID", host).trim();
      div.firstChild.classList.add("unclaimed");
    }
    div.firstChild.querySelector(`.${strategy}`).classList.add("selected");

    hostList.append(div.firstChild);
  }
  stateSet(event);
};
const stateSet = async (event) => {
  const { state } = event.data;
  document
    .getElementById("settings-download-save")
    .setAttribute(
      "href",
      "data:text/plain;charset=utf-8, " +
        encodeURIComponent(JSON.stringify(state || ""))
    );
};

const clientsUpdated = async (event) => {
  await settingsSet(event);
  if (event.data.backups && event.data.backups.length) {
    for (const [host, { fs, funcText }] of event.data.backups) {
      hosts[host] = {
        fs,
        funcText,
      };
    }
  }

  const { index, total } = event.data;
  document.getElementById("client-index").innerText = `${index} [${total}]`;
  hostsUpdated(event);
};
const logs = [];
const renderLogs = (log, logs, logElement) => {
  if (logs) {
    logs.push(log);
  }
  const date = new Date().toISOString();
  if (logElement) {
    const div = document.createElement("div");
    div.classList.add(log.kind);
    switch (log.kind) {
      case "request":
        div.innerText += `[${date}][${log.host}] ${log.method} ${log.path}`;
        break;
      case "response":
        if (!log.ok) {
          div.classList.add("notok");
        }
        div.innerText += `[${date}][${log.host}] ${log.path} ${log.status} ${log.statusText}`;
        break;
      case "error":
        div.innerText += `[${date}][${log.host}] ${log.path} ${log.message}`;
        break;
      case "log":
        div.innerText += `[${date}][${log.host}] ${log.message}`;
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
    request.headers.append("x-reqid", `${event.data.host}`);
    request.headers.append("x-reqid", `${id}`);
    // Log Request
    renderLogs(
      {
        kind: "request",
        id,
        host: event.data.host,
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
      env: (settings.varcontext && environment.vars) || {},
      log: consoleLog(event.data.host),
    });
    try {
      //TODO: This may fail if the response is proxied through fetch, i think?
      response.headers.append("x-resid", request.headers.get("x-reqid"));
    } catch {}

    const { body: resBody, headers: resHeaders, status, statusText } = response;
    // Log Response
    {
      renderLogs(
        {
          kind: "response",
          id,
          host: event.data.host,
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
const environmentElement = document.getElementById("environment-variables");
const settings = {};
const environment = {};

const environmentSet = async (event) => {
  const {
    environment: { varstext = "", vars = {}, varserrormessage, varstring },
  } = event.data;
  environment.vars = vars;
  environment.varstring = varstring;
  if (environmentElement.value !== varstext) {
    environmentElement.value = varstext;
  }
  if (varserrormessage) {
    environmentElement.classList.add("error");
    environmentElement.setAttribute("title", varserrormessage);
  } else {
    environmentElement.classList.remove("error");
    environmentElement.removeAttribute("title");
  }
  for (const [host, { fs, funcText }] of Object.entries(hosts)) {
    hosts[host].fetch = await createFunctionHandler(
      funcText ?? defaultExportStr,
      settings.varglobal && environment.varstring
    );
  }
};

const settingsSet = async (event) => {
  const { settings: newSettings = {} } = event.data;
  for (const [key, value] of Object.entries(newSettings)) {
    settings[key] = value;
  }
  document.getElementById("settings-variables-inject-context").checked =
    settings.varcontext;
  document.getElementById("settings-variables-inject-global").checked =
    settings.varglobal;
  document.querySelector(
    `input[name="settings-theme"][value="${settings.theme}"]`
  ).checked = true;

  document.getElementById("settings-random-hostname").checked =
    settings.randomHostName;
  document.body.classList.remove("auto", "dark", "light");
  document.body.classList.add(settings.theme);
};
Utils.RegisterSW(window.location.pathname);
await Utils.WaitForSWReady();
// Handle messages from SW
navigator.serviceWorker.addEventListener("message", (event) => {
  switch (event.data.type) {
    case "clients-updated":
      clientsUpdated(event);
      break;
    case "hosts-updated":
      hostsUpdated(event);
      break;
    case "environment-set":
      environmentSet(event);
    case "settings-set":
      settingsSet(event);
      break;
    case "state-set":
      stateSet(event);
      break;
    case "fetch":
      handleFetch(event);
      break;
    case "reload-window":
      globalThis.location.reload();
      break;
    case "close-window":
      globalThis.close();
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
      } else if (target.classList.contains("release-host")) {
        releaseHost(host, hosts);
      } else if (target.classList.contains("claim-host")) {
        const hostName = prompt("Add Host:", host.id);
        if (hostName) {
          hosts[hostName] = hosts[hostName] || { fetch: defaultHandler };
          Utils.PostToSW({
            type: "claim-host",
            host: hostName,
          });
        }
      } else if (target.classList.contains("load-function-file")) {
        const fileSelector = document.getElementById("select-file");
        const onFileSelected = async (event) => {
          fileSelector.removeEventListener("change", onFileSelected);
          const { files } = event.target;
          host.querySelector(".update-function").value = await files[
            files.length - 1
          ].text();
          setFunction(host, hosts, settings.varglobal && environment.varstring);
        };
        fileSelector.addEventListener("change", onFileSelected);
        fileSelector.click();
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
        setFunction(host, hosts, settings.varglobal && environment.varstring);
      }
    }
  }
});

document.getElementById("add-host").addEventListener("click", () => {
  const host = document.getElementById("settings-random-hostname").checked
    ? randomName()
    : prompt("Add Host:");
  if (host) {
    hosts[host] = hosts[host] || { fetch: defaultHandler };
    Utils.PostToSW({
      type: "claim-host",
      host,
    });
  }
});
let abortController;
const responseElement = document.getElementById("responses");
document.getElementById("requests-send").addEventListener("click", async () => {
  const method = document.getElementById("requests-method").value.toLowerCase();
  const host = document.getElementById("requests-hosts").value;
  const path = document.getElementById("requests-path").value;
  const protoHeaders = document.getElementById("requests-headers").value.trim();
  const headers = Object.fromEntries(
    protoHeaders
      .split("\n")
      .map((h) => {
        const [key] = h.split(":", 1);
        const value = h.substring(key.length + 1);
        return [key, value];
      })
      .filter(([key, value]) => key && value)
  );

  const body = document.getElementById("requests-body").value;
  let { pathname } = window.location;
  if (!pathname.startsWith("/")) {
    pathname = "/" + pathname;
  }
  if (!pathname.endsWith("/")) {
    pathname += "/";
  }
  if (pathname.startsWith(window.location.pathname)) {
    pathname = pathname.replace(window.location.pathname, "/");
  }
  const sendBody = method === "get" || method === "head" ? undefined : body;
  const url = `${pathname}${host}/${path}`;
  const request = new Request(`./host${url}`, {
    method,
    headers,
    body: sendBody,
  });
  const requestDiv = document.createElement("div");
  requestDiv.classList.add("request");
  const preambleDiv = document.createElement("div");
  preambleDiv.innerText = `${method.toUpperCase()} ${url} HTTP/1.1`;
  preambleDiv.classList.add("preamble");
  const requestHeadersDiv = document.createElement("div");
  requestHeadersDiv.classList.add("headers");
  requestHeadersDiv.innerText = protoHeaders;
  const requestBodyDiv = document.createElement("div");
  requestBodyDiv.classList.add("body");
  requestBodyDiv.innerText = body;
  requestDiv.appendChild(preambleDiv);
  requestDiv.appendChild(requestHeadersDiv);
  requestDiv.appendChild(requestBodyDiv);
  responseElement.appendChild(requestDiv);
  responseElement.scrollTop = responseElement.scrollHeight;
  abortController = new AbortController();
  try {
    document.getElementById("requests-abort").removeAttribute("disabled");
    const response = await globalThis.fetch(request, {
      signal: abortController.signal,
    });
    const responseDiv = document.createElement("div");
    responseDiv.classList.add("response");
    if (!response.ok) {
      responseDiv.classList.add("notok");
    }
    const responsePreambleDiv = document.createElement("div");
    responsePreambleDiv.innerText = `HTTP/1.1 ${response.status} ${response.statusText}`;
    responsePreambleDiv.classList.add("preamble");
    const responseHeadersDiv = document.createElement("div");
    responseHeadersDiv.classList.add("headers");
    const blob = await response.blob();
    let dataURL;
    for (const [key, value] of response.headers.entries()) {
      const header = document.createElement("div");
      const headerKey = document.createElement("span");
      headerKey.innerText = key;
      headerKey.classList.add("key");
      let headerValue;
      if (key === "content-type") {
        headerValue = document.createElement("a");
        headerValue.setAttribute("download", "");
        dataURL = URL.createObjectURL(blob);
        headerValue.href = dataURL;
        headerValue.download = "response.bin";
      } else {
        headerValue = document.createElement("span");
      }
      headerValue.innerText = value;
      headerValue.classList.add("value");
      header.appendChild(headerKey);
      header.appendChild(headerValue);
      responseHeadersDiv.appendChild(header);
    }

    let responsePreview;
    const contentType = response.headers.get("content-type");

    if (
      contentType.startsWith("text/html") ||
      contentType.startsWith("application/html")
    ) {
      responsePreview = document.createElement("iframe");
      responsePreview.srcdoc = await blob.text();
    }
    if (contentType.startsWith("text/")) {
      responsePreview = document.createElement("div");
      responsePreview.innerText = await blob.text();
    } else if (contentType.startsWith("image/")) {
      responsePreview = document.createElement("img");
      responsePreview.src = dataURL;
    } else if (contentType.startsWith("audio/")) {
      responsePreview = document.createElement("audio");
      responsePreview.src = dataURL;
    } else if (contentType.startsWith("video/")) {
      responsePreview = document.createElement("video");
      responsePreview.src = dataURL;
    } else {
      responsePreview = document.createElement("div");
      responsePreview.innerText = "no preview available";
    }

    responsePreview.classList.add("preview");
    responsePreview.classList.add(encodeURI(contentType));

    responseDiv.appendChild(responsePreambleDiv);
    responseDiv.appendChild(responseHeadersDiv);
    responseDiv.appendChild(responsePreview);
    requestDiv.insertAdjacentHTML("afterend", responseDiv.outerHTML);
    responseElement.scrollTop = responseElement.scrollHeight;
  } catch (e) {
  } finally {
    document.getElementById("requests-abort").setAttribute("disabled", "");
    abortController = undefined;
  }
});

document.getElementById("requests-abort").addEventListener("click", () => {
  if (abortController) {
    abortController.abort();
    abortController = undefined;
  }
});
document.getElementById("requests-clear").addEventListener("click", () => {
  responseElement.innerHTML = "";
});

environmentElement.addEventListener("input", () => {
  Utils.PostToSW({
    type: "set-environment",
    environment: environmentElement.value,
  });
});

const updateSettings = (event) => {
  const settings = {};
  settings.varcontext = document.getElementById(
    "settings-variables-inject-context"
  ).checked;
  settings.varglobal = document.getElementById(
    "settings-variables-inject-global"
  ).checked;
  settings.theme = document.querySelector(
    'input[name="settings-theme"]:checked'
  )?.value;
  settings.randomHostName = document.getElementById(
    "settings-random-hostname"
  ).checked;

  Utils.PostToSW({
    type: "set-settings",
    settings,
  });
};
const settingsElement = document.getElementById("settings");
settingsElement.addEventListener("input", updateSettings);
document
  .getElementById("settings-random-hostname")
  .addEventListener("input", updateSettings);

document
  .getElementById("settings-reload-cluster")
  .addEventListener("click", () => {
    if (
      confirm("Reload cluster? Data may be lost or shuffeled between windows.")
    ) {
      Utils.PostToSW({
        type: "reload-cluster",
      });
    }
  });

document
  .getElementById("settings-reset-cluster")
  .addEventListener("click", () => {
    if (confirm("Reset cluster? Data WILL be lost!")) {
      Utils.PostToSW({
        type: "reload-cluster",
        reset: true,
        preserveSettings: true,
      });
    }
  });

document
  .getElementById("settings-reset-cluster-and-close")
  .addEventListener("click", () => {
    if (confirm("Reset and close cluster? Data WILL be lost!!!")) {
      Utils.PostToSW({
        type: "reload-cluster",
        reset: true,
        preserveSettings: true,
        closeOthers: true,
      });
    }
  });

document
  .getElementById("settings-upload-save")
  .addEventListener("click", () => {
    const fileSelector = document.getElementById("select-file");
    const onFileSelected = async (event) => {
      fileSelector.removeEventListener("change", onFileSelected);
      const { files } = event.target;
      const reset = await files[files.length - 1].text();
      Utils.PostToSW({
        type: "reload-cluster",
        reset,
        preserveSettings: true,
        closeOthers: false,
        reopenOthers: true,
      });
    };
    fileSelector.addEventListener("change", onFileSelected);
    fileSelector.click();
  });

// TODO: I don't think this always unloas properly -- especially when refreshing... possibly before sw is ready? Maybe use "beforeunload" instead?
window.addEventListener("unload", (event) => {
  Utils.PostToSW({
    type: "remove-client",
  });
});

// window.onbeforeunload = (e) => {
//   // e.preventDefault();
//   // e.returnValue = "";
//   Utils.PostToSW({
//     type: "remove-client",
//   });
//   return "Are you sure you want to leave this page? This will abandon any progress on changes to document preferences";
// };
Utils.PostToSW({
  type: "add-client",
});
