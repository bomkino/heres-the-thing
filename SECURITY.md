# Security policy

## Supported version

Security fixes target the latest version on `main` and the current public deployment.

## Report privately

Please do not open a public issue for a vulnerability. Use GitHub’s private vulnerability reporting for this repository. If that control is unavailable, use the private contact route on [pitch.dog](https://pitch.dog/) and include:

- the affected route, file, and version or commit;
- clear reproduction steps;
- the realistic impact;
- a minimal proof of concept, with private user material removed;
- whether you believe the issue is already being exploited.

Do not test against other people’s sessions, attempt denial of service, or retain data you encounter accidentally.

## Scope worth reporting

- script injection through user-controlled slide or plan text;
- session data escaping the browser or crossing between users;
- unsafe clipboard or import/export handling;
- deployment configuration exposing secrets or private source;
- dependency compromise affecting the production build;
- a privacy claim in this repository that is materially false.

The app intentionally stores working state in browser storage. Access by another person using the same browser profile is a device/account boundary, not a server data leak, though a practical mitigation is still welcome.
