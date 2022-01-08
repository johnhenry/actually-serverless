# Actually Serverless

Hosted <a href="https://johnhenry.github.io/actually-serverless" target="_blank">here</a>.

- [Actually Serverless](#actually-serverless)
  - [Quick Start:](#quick-start)
  - [Detailed Guide](#detailed-guide)
  - [Why is it useful?](#why-is-it-useful)
    - [Secure origin](#secure-origin)
    - [Testing Cloud Functions](#testing-cloud-functions)
  - [Limitations](#limitations)
  - [Trouble Shooting](#trouble-shooting)
  - [Comparison to Serevefolder.dev](#comparison-to-serevefolderdev)

Simarly to other "serverless" platforms, this allows you to host dynamic HTTP endpoints and static files.

Unlinke most of these platforms, no servers are necessary beyond the initial application load.
Everyting is hosted locally within the browser using a service worker.

This is not _actually_ serverless, but it's about as close as your can theoretically get.

## Quick Start:

- Click [<button>Add Host</button>] to add a host.
- Edit textbox to update endpoint.
- Visit endpoint to see result.

## Detailed Guide

- More complete guide [here](./USAGE.md).

## Why is it useful?

A few use cases:

### Secure origin

It is nearly impossible to do web development without a server.
Many browser APIs fail when a site is opened via a local file system.

This allows you to serve any number of local directories sites without installing a server.
Since this is served on a secure origin, these have access to most of the browser APIs[^1].

[^1]: Because this relies on service workers, service workers are not available; but all other browser APIS should work.

### Testing Cloud Functions

This service allows one to test cloud functions without the need to run a server locally. It aims to be compatible with [worker environments](https://workers.js.org/).

## Limitations

- While custom endpoints are saved, static directores must be re-loaded after refresh and cannot be saved. This is due to limitations of the current [window.showDirectoryPicker API](https://developer.mozilla.org/en-US/docs/Web/API/Window/showDirectoryPicker)/
- This is only accessible from inside the browser. External tools like curl, wget and insomnia are unavailable.

## Trouble Shooting

It is possible to get the application into a _weird_ state and it stops working properly.

If this should happen, save the cluster's data using the [<button>save</button>] button and try the following in the given order:

- First, try [<button>reload</button>]. This will reload all open nodes in the cluster.

- If that does not work, try [<button>reset</button>]. This will clear all saved data and reload all open nodes in the cluster. Use the [<button>restore</button>] button to load the saved data.

- If that does not work, try [<button>reset + close nodes</button>]. This will clear all saved data and close all open nodes in the cluster (except the currently focused node, which whill be reloaded). Use [<button>restore</button>] to load the saved data. Re-open nodes manually.

- If nothing else works:
  1. Close all other tabs for the current site.
  2. Open the developer tools on the site
  3. Navigate to Application tab
  4. Navigate to he Storage sub-tab
  5. Click "Clear site data"
  6. With the developer tools still open,
     1. right-click the browser's reload button (⟳)
     2. select "Empty Cache and hard reload"

## Comparison to Serevefolder.dev

This is a fork of <a href="https://github.com/AshleyScirra/servefolder.dev" target="_blank" >servefolder.dev</a>, so comparisons are welcome.

| Feature               | ServeFolder.dev     | Actually Serverless |
| --------------------- | ------------------- | ------------------- |
| Static Directories    | ✓                   | ✓                   |
| HTTP Endpoints        | 𐄂                   | ✓                   |
| Browser Compatibility | All Major Browsers  | Chromium Browsers   |
| Host/Tab Topology     | ✓                   | ✓                   |
| Save on Refresh       | Some Settings Saved | Some Settings Saved |
| Export/Import         | 𐄂                   | ✓                   |
