# Actually Serverless

Hosted <a href="https://johnhenry.github.io/actually-serverless" target="_blank">here</a>.

This is a platform that allows you to host a cluster HTTP endpoints and static directoreis locally within the browser.

In otherwords, it's a _serverless_ platform that doesn't user servers. (or perthaps the server is in your browser?... Anywho...)

## Usage

### Adding a host

Add a new host by clicking the **[Add Host]** button.

Visit this host by clicking it's name in the list of hosts.

### Defining the host endpoint

A newly added endpoint returns a "not implemented" response by default.

```javascript
export default () =>
  new Response("not implemented", {
    status: 501,
    statusText: "Not Implemented",
  });
```

Edit the textarea, or load a javascript file using the **[𝑓]** button.

#### Endpoint exports

The endpoint must be defined as an ES6 module.

Its default export must be a handler function that returns a [Response](https://developer.mozilla.org/en-US/docs/Web/API/Response) object.

Alternatively, the handler may be named "onRequest".

```javascript
export const onRequest () => ...
```

Additonally, export functions that correspond to request methods.

- GET - `export const onRequestGet = () => ...`
- POST - `export const onRequestPost = () => ...`
- PUT - `export const onRequestPut = () => ...`
- DELETE - `export const onRequestDelete = () => ...`
- etc.

#### Context object

The handler can take a context object as an argument with the following properties:

- `request` - the [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) object
- `env` - object containing variables defined in the Environment section
- `fileHandler` - file handler used to access folder defined with **[📁]** button

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

#### Browser APIS.

Each endpoint exists within the context of the tab where it is defined. This means that you use any browser API. Use them, along wiht your imagination to create cool endpoints. Here are some suggestions:

- Use the [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) API for persistant storage.
- Access other resources using the [fetch](https://developer.mozilla.org/en-US/docs/Web/API/fetch), [web sockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket), and [WebRTC](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API) APIs.
- Access the [console](https://developer.mozilla.org/en-US/docs/Web/API/console) for logging.
- Access [alert](https://developer.mozilla.org/en-US/docs/Web/API/Window/alert),
  [confirm](https://developer.mozilla.org/en-US/docs/Web/API/Window/alert),
  and [prompt](https://developer.mozilla.org/en-US/docs/Web/API/Window/alert) dialogs to handle requests in real time. (note: the handler may need to be asnychronous)

### Static Folder

Select a folder using the **[📁]** button and remove all text from the textarea
to serve that directory at the endpoint.
Instead of leaving it empty, you may replace the text with "fs:".

You can also manually access the fileHandler object to access files
in a custom endpoint.

```javascript
// Only return .html files
export default async ({ request, fileHandler }) => {
  if (request.url.endsWith(".html")) {
    return fileHandler(request.url);
  }
  return new Response("forbidden", {
    status: 404,
  });
};
```

### Proxy

Proxy a URL by replacing the text in the textarea with "proxy: <url>"

```text
proxy: https://localhost:8080
```

### Remove Host

Remove host from node by clicking the **[✖]** button. If the host still exists on other node, it will still be visible; but less functional.

### Load Balancer

A host can be distributed across multiple browser tabs or "nodes".

Click the **[+]** button to duplicate a host on a new node.
This opens a new tab that will share handling of request to that node.

Note that if a host does not exist on a node,
it is visible and can be be "claimed" on that node
by clicking the **[▼]** button.

When a host is shared between multiple nodes,
you can update the strategy used to switch between the
by clicking the dots (● ● ● ●) next to the host name.

- <i style="color:Crimson">●</i> ● ● ● First -- Use the first node defined
- ● <i style="color:GoldenRod">●</i> ● ● -- Last Used - Continue with last used node
- ● ●<i style="color:ForestGreen">●</i> ● Round Robin -- Sequentially cycle through nodes
- ● ● ● <i style="color:DeepSkyBlue">●</i> -- Random -- Randomly cycle through nodes

### Save and Restore

Save and restore the cluster using the **[save]** and **[restore]** buttons.

### Other Tabs:

#### Environment

Define variables used in endpoints here.

They are available in both the context.env object that's passed to the request handler, as well as globally within the endpoint's closure.

```
x=1
y=2
```

```javascript
export default ({ env }) => {
  return new Response(`${env.x} + ${y} = ${env.x + y}`);
};
```

#### Requests

Send HTTP requests to locally defined hosts.

Some file types (html, images, etc.) are rendered.

Download the file by clicking content-type header value.

The history is ephemeral and will disappear when the tab is closed or reloaded.

#### Logs

View logs for request sent to the current tab.
These are ephemeral and will disappear when the tab is closed or reloaded.

#### Settings

Update local settings for the app.

#### About

Learn about this app.

## How does this work?

This uses a service worker as a load balancer
to intercept requests
and routes them to open tabs.

A request matching a given host
(at /host/:hostname/...)
is sent to a tab or "node" where it is handled via worker function or a selected folder.

Workers functions have access to browser APIs including fetch and alerts -- just to name a few -- as well as browser extensions. These can all be used to handle requests.

## Why is it useful?

A few use cases:

### Secure origin

It is nearly impossible to do web development without a server.
Many browser APIs fail when a site is opened via a local file system.

This allows you to serve any number of local sites without installing a server.
Since this is served on a secure origin, these have access to most of the browser APIs[^1].

[^1]: Because this relies on service workers, service workers are not available; but all other browser APIS should work.

### Testing Cloud Functions

This service allows one to easily fire up and test cloud functions. It aims to be largely compatible with offerings like Deno Deploy and Cloudflare Workers.

## Limitations

- While custom endpoints are saved, static directores must be re-loaded after refresh and cannot be saved. This is due to limitations of the current [window.showDirectoryPicker API](https://developer.mozilla.org/en-US/docs/Web/API/Window/showDirectoryPicker).

## Usage

## Trouble Shooting

It's possible to get this into a weird state and things stop working for reasons that are not easily identifable.

If this should happen, save the cluster's data using the **[save]** button.

First, try the **[reload]** button. This will reload all open nodes in the cluster.

If that does not work, try the **[reset]** button. This will clear all saved data and reload all open nodes in the cluster. Use the **[restore]** button to load the saved file.

If that does not work, try the **[reset + close nodes]** button. This will clear all saved data and close all open nodes in the cluster (except the currently focused node, which whill be reloaded). Use the **[restore]** button to load the saved file and re-open nodes manually.

## Comparison to Serevefolder.dev

This is a fork of <a href="https://github.com/AshleyScirra/servefolder.dev" target="_blank" >servefolder.dev</a>, so comparisons are welcome.

| Feature               | ServeFolder.dev     | Actually Serverless |
| --------------------- | ------------------- | ------------------- |
| Static Directories    | ✓                   | ✓                   |
| HTTP Endpoints        | 𐄂                   | ✓                   |
| Browser Compatibility | All Major           | Chrome/Edge/Opera   |
| Host/Tab Topology     | ✓                   | ✓                   |
| Save on Refresh       | Some Settings Saved | Some Settings Saved |
| Export/Import         | 𐄂                   | ✓                   |
