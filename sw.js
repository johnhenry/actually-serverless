// Storage methods using idb-keyval
importScripts("idb-keyval.js");

const idbkvStore = IDBKeyVal.createStore(
  "service-worker-db",
  "service-worker-store"
);

function storageSet(key, val) {
  return IDBKeyVal.set(key, val, idbkvStore);
}

function storageGet(key) {
  return IDBKeyVal.get(key, idbkvStore);
}

function storageDelete(key) {
  return IDBKeyVal.del(key, idbkvStore);
}

function storageKeys() {
  return IDBKeyVal.keys(idbkvStore);
}

function storageClear() {
  return IDBKeyVal.clear(idbkvStore);
}

// Install & activate
self.addEventListener("install", (e) => {
  console.log("[SW] install");
  // Skip waiting to ensure files can be served on first run
  e.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  console.log("[SW] activate");
  // On activation, claim all clients so we can start serving files on first run
  event.waitUntil(clients.claim());
});

const postToClients = async (messsage) => {
  const clients = (await storageGet("clients")) || [];
  for (const id of clients) {
    const client = await self.clients.get(id);
    client.postMessage(messsage);
  }
};
const addClient = async (event) => {
  const clients = (await storageGet("clients")) || [];
  let index = -1;
  for (const value of clients) {
    if (value === null) {
      break;
    }
    index++;
  }
  index++;
  clients[index] = event.source.id;
  storageSet("clients", clients);
  const backup = [];
  const strategies = (await storageGet("strategies")) || {};

  for (const [key, value] of Object.entries(strategies)) {
    const data = await storageGet(`backup/${key}/${index}`, event.data.data);
    if (data) {
      backup.push([key, data]);
    }
  }
  event.source.postMessage({
    type: "client-added",
    index,
    backup,
    strategies,
  });
};
const removeClient = async (event) => {
  const clients = (await storageGet("clients")) || [];
  clients[clients.indexOf(event.source.id)] = null;
  storageSet("clients", clients);
};

const claimHost = async (event) => {
  console.log("[SW] claimHost", event);
  // // If there is only 1 client, clear the SW storage, as a simple garbage collection
  // // mechanism so we don't risk clogging up storage with dead hosts
  // const allClients = await self.clients.matchAll();
  // if (allClients.length <= 1) await storageClear();
  const { host } = event.data;
  // Tell client it's now hosting.
  const strategies = (await storageGet("strategies")) || {};
  strategies[host] = strategies[host] || "first";
  storageSet("strategies", strategies);
  const clients = (await storageGet("clients")) || [];
  const index = clients.indexOf(event.source.id);
  const hosts = (await storageGet("hosts")) || {};
  hosts[host] = hosts[host] || [];
  if (!hosts[host].includes(index)) {
    hosts[host].push(index);
  }
  storageSet("hosts", hosts);
  event.source.postMessage({
    type: "hosts-updated",
    strategies,
  });
};
const releaseHost = async (event) => {
  console.log("[SW] releaseHost", event);
  const { host } = event.data;
  const clients = (await storageGet("clients")) || [];
  const index = clients.indexOf(event.source.id);
  const hosts = (await storageGet("hosts")) || {};
  hosts[host] = hosts[host] || [];
  const deleteIndex = hosts[host].indexOf(index);
  if (deleteIndex !== -1) {
    hosts[host].splice(deleteIndex, 1);
  }
  const strategies = (await storageGet("strategies")) || {};
  if (!host.length) {
    delete strategies[host];
    await storageSet("strategies");
  }
  event.source.postMessage({
    type: "hosts-updated",
    strategies,
  });
};
const setStrategy = async (event) => {
  const { host, kind = "first" } = event.data;
  // Tell client it's now hosting.
  const strategies = (await storageGet("strategies")) || {};
  strategies[host] = kind;
  storageSet("strategies", strategies);
  postToClients({
    type: "hosts-updated",
    strategies,
  });
};
const backupClient = async (event) => {
  const clients = (await storageGet("clients")) || [];
  await storageSet(
    `backup/${event.data.host}/${clients.indexOf(event.source.id)}`,
    event.data.data
  );
};

// Listen for messages from clients
self.addEventListener("message", (e) => {
  console.log("[SW] got message", e);
  switch (e.data.type) {
    case "add-client":
      e.waitUntil(addClient(e));
      break;
    case "claim-host":
      e.waitUntil(claimHost(e));
      break;
    case "release-host":
      e.waitUntil(releaseHost(e));
      break;
    case "remove-client":
      e.waitUntil(removeClient(e));
      break;
    case "set-strategy":
      e.waitUntil(setStrategy(e));
      break;
    case "backup-client":
      e.waitUntil(backupClient(e));
      break;
    default:
      console.log("[SW] unknown message type", e.data.type);
  }
});

const getClient = async (host) => {
  const hosts = (await storageGet("hosts")) || {};
  const registeredClients = hosts[host];
  if (!registeredClients) {
    throw new Error(`host not recognized: "${host}"`);
  }
  const clients = (await storageGet("clients")) || [];
  if (!clients) {
    throw new Error(`No clients registered for host: ${host}`);
  }
  const clientIds = registeredClients.map((index) => clients[index]);
  const ids = clientIds.filter((id) => id !== null);
  const strategies = (await storageGet("strategies")) || {};
  const strategy = strategies[host];
  let id;
  switch (strategy) {
    case "random":
      {
        id = ids[Math.floor(Math.random() * ids.length)];
      }
      break;
    case "round-robin":
      {
        const index = (await storageGet(`round-robin-index-for-${host}`)) || 0;
        id = ids[index];
        storageSet(`round-robin-index-for-${host}`, (index + 1) % ids.length);
      }
      break;
    case "first":
    default: {
      id = ids[0];
    }
  }
  const client = await self.clients.get(id);
  return client;
};

const HostFetch = async (host, url, request) => {
  try {
    const client = await getClient(host);
    if (!client) {
      return new Response("Bad Gateway", {
        status: 502,
        statusText: "Bad Gateway",
      });
    }
    const { method, headers } = request;
    const body = await request.arrayBuffer();
    // Request.body not available. Use request.arrayBuffer() instead.
    // see: https://bugs.chromium.org/p/chromium/issues/detail?id=688906

    // Create a MessageChannel for the client to send a reply.
    // Wrap it in a promise so the response can be awaited.
    const messageChannel = new MessageChannel();
    const responsePromise = new Promise((resolve, reject) => {
      messageChannel.port1.onmessage = ({
        data: { psuedoResponse, error },
      }) => {
        if (psuedoResponse) {
          const { body, status, statusText, headers } = psuedoResponse;
          resolve(
            new Response(body, {
              status,
              statusText,
              headers: Object.fromEntries(
                headers.concat([["Via", `HTTP/1.1 ${host}`]])
              ),
            })
          );
        } else {
          reject(error);
        }
      };
    });
    // Post to the client to ask it to provide this file.
    const psuedoRequest = {
      url,
      method,
      headers: [...headers.entries()].concat([["Via", `HTTP/1.1 ${host}`]]),
    };
    const objs = [messageChannel.port2];
    if (body.byteLength) {
      psuedoRequest.body = body;
      objs.push(body);
    }
    client.postMessage(
      {
        type: "fetch",
        host,
        port: messageChannel.port2,
        id: Math.floor(1000000 * Math.random()),
        psuedoRequest,
      },
      objs
    );
    return responsePromise;
  } catch (error) {
    console.error(error);
    return new Response(error, {
      status: 500,
      statusText: "Internal Server Error",
      headers: { "Content-Type": "text/plain" },
    });
  }
};

// Main fetch event
self.addEventListener("fetch", async (e) => {
  //TODO: Need to handle trailing shash after "host".
  // Request to different origin: pass-through
  if (new URL(e.request.url).origin !== location.origin) {
    return;
  }
  // Check request in SW scope - should always be the case but check anyway
  const swScope = self.registration.scope;
  if (!e.request.url.startsWith(swScope)) {
    return;
  }

  const scopeRelativeUrl = e.request.url.substr(swScope.length);
  const scopeURLMatch = /host\/([^\/]+)\/?(.*)/.exec(scopeRelativeUrl);
  if (!scopeURLMatch) {
    return;
  } // not part of a host URL
  // Strip host name from URL and get the URL within the host
  const host = scopeURLMatch[1];
  const hostRelativeUrl = scopeURLMatch[2];
  //TODO e.data.url is just the first letter?
  // Likely getting messed up within here or around host fetch.
  e.respondWith(HostFetch(host, hostRelativeUrl, e.request));
});
