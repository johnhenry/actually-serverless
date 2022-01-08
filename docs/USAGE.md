# Usage

- [Usage](#usage)
  - [Adding a host](#adding-a-host)
    - [Dynamic Endpoint](#dynamic-endpoint)
      - [Endpoint exports](#endpoint-exports)
      - [Context Object](#context-object)
      - [Browser APIs.](#browser-apis)
    - [Hosting a Static Folder](#hosting-a-static-folder)
    - [Proxy URL](#proxy-url)
    - [Remove a Host](#remove-a-host)
    - [Load Balancer](#load-balancer)
    - [Save and Restore](#save-and-restore)
  - [Other Tabs](#other-tabs)
    - [Environment](#environment)
    - [Requests](#requests)
    - [Logs](#logs)
    - [Settings](#settings)
    - [About](#about)

## Adding a host

Add a new host by clicking [<button>Add Host</button>].

Visit this host by clicking its name in the list of hosts next to "→".

### Dynamic Endpoint

A newly added endpoint returns "not implemented" by default.

𝑓:

```javascript
export default () =>
new Response("not implemented", {
status: 501,
statusText: "Not Implemented",
});
};
```

Edit the textarea directly, or load a javascript file using [<button>𝑓</button>].

#### Endpoint exports

Define dynamic endpoints as ecmascript modules.

Export a defult function that returns a [Response](https://developer.mozilla.org/en-US/docs/Web/API/Response) to handle requests.

𝑓:

```javascript
export default () => new Response(...)
```

The handler may be named "onRequest" instead of the "default".

𝑓:

```javascript
export const onRequest () => new Response(...)
```

Additonally, exported functions may correspond to request methods.

- GET - `export const onRequestGet = () => new Response(...)`
- POST - `export const onRequestPost = () => new Response(...)`
- PUT - `export const onRequestPut = () => new Response(...)`
- DELETE - `export const onRequestDelete = () => new Response(...)`
- etc.

#### Context Object

The handler can take a context object as an argument with the following properties:

- `context.request` - the [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) object
- `context.env` - object containing variables defined in the Environment section
- `context.fileHandler` - file handler used to access folder defined with [<button>📁</button>]

𝑓:

```javascript
export const onRequestGet ({request}) => {
return new Response(`GET request sent to ${request.url}`);
}
export const onRequestPost ({request}) => {
return new Response(`POST request sent to ${request.url}`);
}
export const onRequest ({request}) => {
return new Response(`${request.method} request sent to ${request.url}`);
}
```

#### Browser APIs.

Endpoint functions have access to everything available in your browser window (fetch, alert -- just to name a few). These can all be used to process and handle HTTP requests.

You are only limited by your imagination. Here are some ideas:

- Use [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) for persistant storage.
- Access other resources using [fetch](https://developer.mozilla.org/en-US/docs/Web/API/fetch), [web sockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket), and [WebRTC](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API).
- Access the [console](https://developer.mozilla.org/en-US/docs/Web/API/console) for logging.
- Access [alert](https://developer.mozilla.org/en-US/docs/Web/API/Window/alert),
  [confirm](https://developer.mozilla.org/en-US/docs/Web/API/Window/alert),
  and [prompt](https://developer.mozilla.org/en-US/docs/Web/API/Window/alert) dialogs to handle requests in real time. (note: the handler may need to be asnychronous)
- Access Browser extensions like [ipfs](https://chrome.google.com/webstore/detail/ipfs-companion/nibjojkomfdiaoajekhjakgkdhaomnch?hl=en) to pull in data from other sources.

### Hosting a Static Folder

Select a folder using [<button>📁</button>]
and remove all text from the textarea
to serve that directory at the endpoint.

𝑓:

```javascript

```

Instead of leaving it empty, you may replace the text with "fs:".

𝑓:

```javascript
fs:

```

You can also manually access the fileHandler object to access files
in a custom endpoint.

𝑓:

```javascript
// Only return .html files
export default async ({ request, fileHandler }) => {
  if (!request.url.endsWith(".html")) {
    return new Response("forbidden", {
      status: 404,
    });
  }
  return fileHandler(request.url);
};
```

### Proxy URL

Replace the text in the textarea with "proxy: <url>" to direct requests to that URL.

𝑓:

```
proxy:https://...
```

### Remove a Host

Remove host from node by clicking [<button>✖</button>]. If the host still exists on other node, it will still be visible; but less functional.

### Load Balancer

Clicking [<button>+</button>] duplicates a host on a new node (browser tabs). The new node shares handling of requests to that host.

Update the strategy used to shared handling of hosts by
clicking the dots (● ● ● ●) next to the host name.

- <i style="color:Crimson">○</i> ● ● ● First -- Use the first active node defined
- ● <i style="color:GoldenRod">○</i> ● ● Last Used - Use previously active node
- ● ● <i style="color:ForestGreen">○</i> ● Round Robin -- Sequentially cycle through nodes
- ● ● ● <i style="color:DeepSkyBlue">○</i> Random -- Randomly cycle through nodes

When a host does not exist on a node,
it can be "claimed" on that node
by clicking [<button>▼</button>].

### Save and Restore

Save and restore the cluster using
[<button>save</button>] and [<button>restore</button>], respectively.

## Other Tabs

Most work happens on the Host, but other tabs in the application provide various functionality.

### Environment

Define variables used in endpoints here.

They are available in both the context.env object that's passed to the request handler, as well as globally within the endpoint's closure.

Enviromnemt:

```
x=1
y=2
```

𝑓:

```javascript
export default ({ env }) => {
  return new Response(`${env.x} + ${y} = ${env.x + y}`);
};
```

### Requests

Send HTTP requests to locally defined hosts.

A few known file types -- html, images, etc. -- are rendered directly in the history of responses.

Download the response body by clicking content-type header value.

The history is ephemeral and will disappear when the tab is closed or reloaded.

### Logs

View logs for request sent to the current tab.
These are ephemeral and will disappear when the tab is closed or reloaded.

### Settings

Update local settings for the app.

### About

Learn about this app.
