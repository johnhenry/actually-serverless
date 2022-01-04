import * as Utils from "./utils.js";

let hostName = ""; // name of host folder, e.g. "host", "host2"...
let swScope = ""; // scope of Service Worker
let folderHandle = null; // File system API handle (or polyfill) of folder to serve
let funcHandle = null; // File system function API

let folderName = "";

// Collections of hosts
const hosts = {};
const funcs = {};
const pickFolderButton = document.getElementById("pickfolder");
const createFunctionButton = document.getElementById("createfunction");
const inputFolderElem = document.getElementById("inputfolder");
const hostNamePattern = document.getElementById("hostNamePattern");

// const handler = async (request) => {
//   return new Response("OKAY");
// };

const handler = async (request) => {
  if (request.method === "GET") {
    return new Response(request.url);
  }
  const body = await request.text();
  return new Response(
    prompt(
      body,
      `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Human Powered Response</title>
</head>
<body>
</body>
</html>`
    ),
    { headers: { "Content-Type": "text/html" } }
  );
};

const createFunctionHandle = async (str = handler.toString()) => {
  const handler = (
    await import(
      URL.createObjectURL(
        new Blob([`export default ${str}`], {
          type: "application/javascript",
        })
      )
    )
  ).default;
  return async (request) => {
    const response = await handler(request);
    const n = {};
    for (const [k, v] of response.headers.entries()) {
      if (n[k]) {
        n[k] += `, ${v}`;
      } else {
        n[k] = v;
      }
    }
    return {
      body: response.body,
      headers: n,
      status: response.status,
      statusText: response.statusText,
    };
  };
};

async function InitFunctionHandle(funcText) {
  funcHandle = await createFunctionHandle(funcText);
  // Ensure SW ready then tell it to start hosting for this client
  await Utils.WaitForSWReady();

  Utils.PostToSW({
    type: "host-start-func",
    hostNamePattern: hostNamePattern.value,
  });
}

createFunctionButton.addEventListener("click", async () => {
  const funcText = window
    .prompt("Enter function text:", handler.toString())
    .trim();
  if (funcText && funcText.trim()) {
    await InitFunctionHandle(funcText);
  }
});
// Use File System API if available
if (window.showDirectoryPicker) {
  async function InitFolderHandle() {
    folderName = folderHandle.name;

    // Ensure SW ready then tell it to start hosting for this client
    await Utils.WaitForSWReady();

    Utils.PostToSW({
      type: "host-start",
      hostNamePattern: hostNamePattern.value,
    });
  }

  pickFolderButton.removeAttribute("hidden");
  pickFolderButton.addEventListener("click", async () => {
    try {
      // Pick folder
      folderHandle = await window.showDirectoryPicker();
    } catch (err) {
      console.log("Exception picking folder: ", err);
    }

    if (!folderHandle) return;

    await InitFolderHandle();

    // Write this folder handle to storage so it can be re-used next time
    await Utils.storageSet("folder", folderHandle);
  });

  // Check if a folder handle is in storage. If so show a button to re-use it,
  // since it will require a gesture to request permission to read from it.
  const savedFolderHandle = await Utils.storageGet("folder");
  if (savedFolderHandle) {
    const useLastFolderButton = document.getElementById("uselastfolder");
    useLastFolderButton.textContent = `Use last folder (${savedFolderHandle.name})`;
    useLastFolderButton.removeAttribute("hidden");
    useLastFolderButton.addEventListener("click", async () => {
      const permission = await savedFolderHandle.requestPermission({
        mode: "read",
      });

      if (permission === "granted") {
        useLastFolderButton.setAttribute("hidden", "");
        folderHandle = savedFolderHandle;
        await InitFolderHandle();
      }
    });
  }
} else {
  // If File System API not supported, fall back to file input with webkitdirectory attribute
  async function InitFileList() {
    // Use a polyfill to make these files look like the File System Access API
    folderName = "";
    folderHandle = new Utils.FakeDirectory("");

    for (const file of inputFolderElem.files) {
      let pathStr = file.webkitRelativePath;

      // Every path begins with the folder name. Parse off the folder name from
      // the first path, and always remove the folder name from the path.
      let i = pathStr.indexOf("/");
      if (i !== -1) {
        if (!folderName) folderName = pathStr.substr(0, i);

        pathStr = pathStr.substr(i + 1);
      }

      // Add this file to the folder structure
      folderHandle.AddFile(pathStr, file);
    }

    // Ensure SW ready then tell it to start hosting for this client
    await Utils.WaitForSWReady();

    Utils.PostToSW({
      type: "host-start",
    });
  }

  inputFolderElem.removeAttribute("hidden");
  inputFolderElem.addEventListener("change", InitFileList);

  // If browser has remembered file list, e.g. Firefox reloading page, init immediately
  if (inputFolderElem.files.length > 0) InitFileList();
}

Utils.RegisterSW(window.location.pathname);
await Utils.WaitForSWReady();

console.log("SW ready");

// When closing this client tell the SW to stop hosting for it
window.addEventListener("unload", () => {
  Utils.PostToSW({
    type: "remove-client",
    hostName,
  });
});

// Handle messages from SW
navigator.serviceWorker.addEventListener("message", (e) => {
  switch (e.data.type) {
    case "start-ok":
      OnHostStarted(e.data);
      break;
    case "fetch":
      HandleFetch(e);
      break;
    default:
      console.warn(`Unknown message from SW '${e.data.type}'`);
      break;
  }
});

// SW indicates hosting started OK: get info and display URL
function OnHostStarted(data) {
  hostName = data.hostName;
  swScope = data.scope;
  let func = data.func;

  if (func) {
    funcs[hostName] = funcHandle;
  } else {
    hosts[hostName] = folderHandle;
  }

  const folderData = document.createElement("td");
  folderData.textContent = folderName;

  const linkData = document.createElement("td");
  const hostLinkElem = document.createElement("a");
  const hostUrl = `${swScope}${hostName}/`;
  hostLinkElem.setAttribute("href", hostUrl);
  hostLinkElem.setAttribute("target", "_blank");
  hostLinkElem.textContent = hostUrl;
  linkData.appendChild(hostLinkElem);

  const hostRow = document.createElement("tr");
  hostRow.appendChild(folderData);
  hostRow.appendChild(linkData);
  document.getElementById("hostinfo").append(hostRow);

  document.title = `Serving '${folderName}' to '${hostName}'`;
}

// Message from SW to read a file for a fetch
async function HandleFetch(e) {
  try {
    const { hostName, headers = {}, body = null, method = "GET" } = e.data;
    if (funcs[hostName]) {
      const funcHandle = funcs[hostName];
      const request = new Request(hostName + e.data.url, {
        headers,
        method,
        body,
      });
      const res = await funcHandle(request);
      e.data.port.postMessage(
        {
          type: "ok",
          ...res,
        },
        [res.body]
      );
      return;
    }
    let relativeUrl = decodeURIComponent(e.data.url);
    // Strip trailing / if any, so the last token is the folder/file name
    if (relativeUrl.endsWith("/"))
      relativeUrl = relativeUrl.substr(0, relativeUrl.length - 1);

    // Strip query string if any, since it will cause file name lookups to fail
    const q = relativeUrl.indexOf("?");
    if (q !== -1) relativeUrl = relativeUrl.substr(0, q);

    // Look up through any subfolders in path.
    // Note this uses File System Access API methods, either the real kind or a mini
    // polyfill when using webkitdirectory fallback.
    const subfolderArr = relativeUrl.split("/");

    let curFolderHandle = hosts[hostName];

    for (
      let i = 0, len = subfolderArr.length - 1 /* skip last */;
      i < len;
      ++i
    ) {
      const subfolder = subfolderArr[i];
      curFolderHandle = await curFolderHandle.getDirectoryHandle(subfolder);
    }

    // Check if the name is a directory or a file
    let file = null;
    const lastName = subfolderArr[subfolderArr.length - 1];
    if (!lastName) {
      // empty name, e.g. for root /, treated as folder
      try {
        // Check for default 'index.html' if empty directory.
        const fileHandle = await curFolderHandle.getFileHandle("index.html");
        file = await fileHandle.getFile();
      } catch {
        // Serve directory listing
        file = await GenerateDirectoryListing(curFolderHandle, relativeUrl);
      }
    } else {
      try {
        const listHandle = await curFolderHandle.getDirectoryHandle(lastName);
        file = await GenerateDirectoryListing(listHandle, relativeUrl);
      } catch {
        const fileHandle = await curFolderHandle.getFileHandle(lastName);
        file = await fileHandle.getFile();
      }
    }

    // Post file content back to SW down MessageChannel it sent for response
    e.data.port.postMessage({
      type: "ok",
      body: file,
    });
  } catch (err) {
    console.error(`Unable to serve file '${e.data.url}': `, err);

    e.data.port.postMessage({
      type: "not-found",
    });
  }
}

// For generating a directory listing page for a folder
async function GenerateDirectoryListing(dirHandle, relativeUrl) {
  // Display folder with / at end
  if (relativeUrl && !relativeUrl.endsWith("/")) relativeUrl += "/";

  let str = `<!DOCTYPE html>
	<html><head>
	<meta charset="utf-8">
	<title>Directory listing for ${relativeUrl || "/"}</title>
	</head><body>
	<h1>Directory listing for ${relativeUrl || "/"}</h1><ul>`;

  for await (const [name, handle] of dirHandle.entries()) {
    // Display folders as "name/", otherwise just use name
    const suffix = handle.kind === "directory" ? "/" : "";
    str += `<li><a href="${relativeUrl}${name}">${name}${suffix}</a></li>`;
  }

  str += `</ul></body></html>`;

  return new Blob([str], { type: "text/html" });
}
