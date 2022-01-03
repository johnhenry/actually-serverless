// clientId:string

// hosts = {[hostname:string]:number?[]}
// hostname:string => number[]

// clients = clientIds:string?[]
// [index]:number => clientId:string?

// strategies
// hostName:string => strategy:string

// import IDBKeyVal from "./idb-keyval.mjs";
importScripts("idb-keyval.js");

// Storage methods using idb-keyval
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

const DEFAULT_STATE = () => ({
  settings: {
    varcontext: true,
    varglobal: true,
    theme: "auto",
    randomHostName: true,
  }, //{varcontext, varglobal, theme, randomHostName}
  nextStrategy: {}, //{[hostname:string]:string}
  hosts: {}, //{[hostname:string]:number?[]}
  clients: [], //[index]:number => clientId:string?
  strategies: {}, //hostName:string => strategy:string
  environment: {}, //{[key:string]:string}
  backup: {}, //{[key:string]:string}
});
const getState = async () => {
  const state = (await storageGet("state")) || DEFAULT_STATE();
  return state;
};
const setState = async (state = DEFAULT_STATE()) => {
  await storageSet("state", state);
};
// Install & activate
self.addEventListener("install", (e) => {
  // Skip waiting to ensure files can be served on first run
  e.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  // On activation, claim all clients so we can start serving files on first run
  event.waitUntil(clients.claim());
});

const postToClients = async (messsage) => {
  const { clients } = await getState();
  let index = 0;
  for (const id of clients) {
    const client = await self.clients.get(id);
    client.postMessage({ ...messsage, index });
    index++;
  }
};
const addClient = async (event) => {
  const state = await getState();
  const { clients, strategies, environment, settings, backup } = state;
  let index = -1;
  for (const value of clients) {
    if (value === null) {
      break;
    }
    index++;
  }
  index++;
  clients[index] = event.source.id;
  const backups = [];
  await setState(state);

  for (const [key, value] of Object.entries(strategies)) {
    const data = backup[key]?.[index];
    if (data) {
      backups.push([key, data]);
    }
  }
  event.source.postMessage({
    type: "clients-updated",
    index,
    total: clients.length,
    state,
    backups,
    environment,
    settings,
    strategies,
  });
  for (let i = 0; i < clients.length; i++) {
    if (i !== index) {
      const client = await self.clients.get(clients[i]);
      client.postMessage({
        type: "clients-updated",
        index: i,
        total: clients.length,
        state,
        environment,
        settings,
        strategies,
      });
    }
  }
};
const removeClient = async (event) => {
  const state = await getState();
  const { clients, hosts, strategies } = state;
  const index = clients.indexOf(event.source.id);

  const entries = [...Object.entries(hosts)].reduce((previous, current) => {
    return previous.concat(current[1]);
  }, []);
  if (entries.indexOf(index) > -1) {
    clients[index] = null;
  } else {
    clients.splice(index, 1);
  }
  await setState(state);
  for (let i = 0; i < clients.length; i++) {
    if (i !== index) {
      const client = await self.clients.get(clients[i]);
      client.postMessage({
        type: "clients-updated",
        index: i,
        total: clients.length,
        strategies,
      });
    }
  }
};

const claimHost = async (event) => {
  // // If there is only 1 client, clear the SW storage, as a simple garbage collection
  // // mechanism so we don't risk clogging up storage with dead hosts
  // const allClients = await self.clients.matchAll();
  // if (allClients.length <= 1) await storageClear();
  const state = await getState();
  const { clients, hosts, strategies } = state;
  const { host } = event.data;
  // Tell client it's now hosting.
  const index = clients.indexOf(event.source.id);

  hosts[host] = hosts[host] || [];
  const hostLength = hosts[host].length;
  if (!hosts[host].includes(index)) {
    hosts[host].push(index);
  }
  strategies[host] = strategies[host] || "first";
  if (
    strategies[host] === "first" &&
    hostLength === 1 &&
    hosts[host].length === 2
  ) {
    strategies[host] = "round-robin";
  }
  await setState(state);
  postToClients({
    type: "hosts-updated",
    state,
    strategies,
  });
};
const releaseHost = async (event) => {
  const state = await getState();
  const { clients, hosts, strategies } = state;
  const { host } = event.data;
  const index = clients.indexOf(event.source.id);
  hosts[host] = hosts[host] || [];
  const deleteIndex = hosts[host].indexOf(index);
  if (deleteIndex !== -1) {
    hosts[host].splice(deleteIndex, 1);
  }
  if (!hosts[host].length) {
    delete strategies[host];
  }
  await setState(state);
  postToClients({
    type: "hosts-updated",
    strategies,
  });
};
const setStrategy = async (event) => {
  const state = await getState();
  const { clients, hosts, strategies } = state;
  const { host, kind = "first" } = event.data;
  // Tell client it's now hosting.
  strategies[host] = kind;
  await setState(state);
  postToClients({
    type: "hosts-updated",
    strategies,
  });
};
const backupClient = async (event) => {
  const state = await getState();
  const { clients, backup } = state;
  const { host } = event.data;
  backup[host] = backup[host] || [];
  const index = clients.indexOf(event.source.id);
  backup[host][index] = event.data.data;
  await setState(state);
  postToClients({
    type: "state-set",
    state,
  });
};
const setEnvironment = async (event) => {
  let vars = {};
  let varserrormessage;
  const { environment: varstext } = event.data;
  const varstringArray = [];
  try {
    varstext
      .trim()
      .split("\n")
      .forEach((rawvar) => {
        const [key, protovalue] = rawvar.split("=").map((v) => v.trim());
        if (!key) return;
        if (protovalue in vars) {
          vars[key] = vars[protovalue];
        } else {
          switch (protovalue) {
            case "undefined":
            case "":
              vars[key] = undefined;
              break;
            default:
              vars[key] = JSON.parse(protovalue);
          }
        }
      });
  } catch (e) {
    console.error("Error Parsing Environment Variables", e);
    varserrormessage = e.message;
    vars = {};
  }
  for (const [key, value] of Object.entries(vars)) {
    varstringArray.push(`const ${key} = ${JSON.stringify(value)};`);
  }
  const varstring = varstringArray.join("\n");
  const environment = {
    varstext,
    vars,
    varstring,
    varserrormessage,
  };
  const state = await getState();
  state.environment = environment;
  await setState(state);
  postToClients({
    type: "environment-set",
    environment,
  });
};

const setSettings = async (event) => {
  const { settings } = event.data;
  const state = await getState();
  state.settings = settings;
  await setState(state);
  postToClients({
    type: "settings-set",
    settings,
  });
};

// Listen for messages from clients
self.addEventListener("message", (e) => {
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
    case "set-environment":
      e.waitUntil(setEnvironment(e));
      break;
    case "set-settings":
      e.waitUntil(setSettings(e));
      break;
    case "reload-cluster":
      e.waitUntil(reloadCluster(e));
      break;
    default:
      console.log("[SW] unknown message type", e.data.type);
  }
});

const getClient = async (host) => {
  const state = await getState();
  const { hosts, clients, strategies, nextStrategy } = state;

  if (!clients) {
    throw new Error(`No clients registered.`);
  }
  const registeredClients = hosts[host];
  if (!registeredClients) {
    throw new Error(`host not recognized: "${host}"`);
  }
  const clientIds = registeredClients.map((index) => clients[index]);
  const ids = clientIds.filter((id) => id !== null);
  const strategy = strategies[host];
  let index;
  switch (strategy) {
    case "random":
      {
        index = Math.floor(Math.random() * ids.length);
        nextStrategy[host] = (index + 1) % ids.length;
        await setState(state);
      }
      break;
    case "round-robin":
      {
        index = nextStrategy[host] || 0;
        nextStrategy[host] = (index + 1) % ids.length;
        await setState(state);
      }
      break;
    case "last-used":
      {
        index = (nextStrategy[host] || 0) - 1;
      }
      break;
    case "first":
    default: {
      index = 0;
    }
  }
  const id = ids[index !== -1 ? index : ids.length - 1];
  const client = await self.clients.get(id);
  return client;
};

const HostFetch = async (host, url, request) => {
  const id = `${Math.floor(1000000000 * Math.random())}`;
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
              headers: Object.fromEntries(headers),
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
      headers: [...headers.entries()].concat([["via", `HTTP/1.1 ${host}`]]),
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
        id,
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
      headers: { "Content-Type": "text/plain", "x-resid": id },
    });
  }
};
const resetCluster = async () => {
  const { settings } = await getState();
  const state = DEFAULT_STATE();
  state.settings = settings;
  await setState(state);
  const clients = await self.clients.matchAll();
  for (const client of clients) {
    client.postMessage({ type: "reload" });
  }
};
const reloadCluster = async (event) => {
  const { reset, preserveSettings, closeOthers } = event.data;
  if (reset) {
    const state =
      typeof reset === "string" ? JSON.parse(reset) : DEFAULT_STATE();
    if (preserveSettings) {
      const { settings } = await getState();
      state.settings = settings;
    }
    await setState(state);
  }
  const clients = await self.clients.matchAll();

  if (closeOthers) {
    let me;
    for (const client of clients) {
      console.log({ client });

      if (client.id === event.source.id) {
        me = client;
        console.log("match", client, event.source.id);
        continue;
      }
      client.postMessage({ type: "close-window" });
      client.postMessage({ type: "reload-window" });
    }
    me.postMessage({ type: "reload-window" });
  } else {
    for (const client of clients) {
      client.postMessage({ type: "reload-window" });
    }
  }
};

// Main fetch event
self.addEventListener("fetch", async (event) => {
  //TODO: Need to handle trailing shash after "host".
  // Request to different origin: pass-through
  if (new URL(event.request.url).origin !== location.origin) {
    return;
  }
  // Check request in SW scope - should always be the case but check anyway
  const swScope = self.registration.scope;
  if (!event.request.url.startsWith(swScope)) {
    return;
  }

  const scopeRelativeUrl = event.request.url.substr(swScope.length);
  const scopeURLMatch = /host\/([^\/]+)\/?(.*)/.exec(scopeRelativeUrl);
  if (!scopeURLMatch) {
    return;
  } // not part of a host URL
  const getHost = async () => {
    const scopeRelativeUrl = event.request.url.substr(swScope.length);
    const { strategies } = await getState();
    for (const hostName of Object.keys(strategies).sort(
      (a, b) => b.length - a.length
    )) {
      const beginner = `host/${hostName}/`;
      if (scopeRelativeUrl.startsWith(beginner)) {
        const hostRelativeUrl = scopeRelativeUrl.substr(beginner.length);
        return HostFetch(hostName, hostRelativeUrl, event.request);
      }
    }
  };
  event.respondWith(getHost());
});
