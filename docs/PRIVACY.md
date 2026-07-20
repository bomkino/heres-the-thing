# Privacy model

Here’s The Thing is deliberately local-first.

## What the live app stores

| Data | Where | How long |
| --- | --- | --- |
| light/dark preference | browser `localStorage` | until cleared by the browser or user |
| current tool answers and plan | browser `sessionStorage` | normally until that browser tab/session closes or the user clears it |
| copied plan | system clipboard | only after the user presses the copy control |

## What the live app does not contain

- account creation or authentication;
- analytics, tracking pixels, ad technology, or session replay;
- cookies;
- remote fonts;
- an upload endpoint;
- a database or object store;
- a runtime AI or third-party API call;
- an email gate.

The hosting worker serves static files. It does not persist answers. The hosting provider may still process ordinary connection logs at the infrastructure layer; this repository neither reads nor augments those logs.

## Threat boundary

Do not paste material into any website that you are not comfortable placing in that browser session. A malicious browser extension, shared computer account, compromised device, or modified fork can change the local-first promise. Inspect the source and deployment you are using.

If you run a fork with analytics, accounts, uploads, or server storage, disclose that plainly. Do not reuse this privacy page unchanged.
