# XDRIVE in 3x-ui

Select **XDRIVE** in the inbound or outbound transport selector. Both peers need an Xray build with XDRIVE, access to the same storage folder, and matching storage settings.

- **Google Drive:** supply a folder ID and three secrets in order: Client ID, Client Secret, Refresh Token.
- **HTTP template:** supply the shared folder, secrets, and HTTP definitions for put/get/list/delete. The list operation needs a Go-compatible `namesRegex` with a capture group containing object names.
- **Local filesystem:** point both peers at the same shared filesystem directory. A normal directory on two different machines is not shared storage.

For Yandex Disk, choose HTTP template and apply **Use Yandex Disk WebDAV template**. Create the folder on Disk first. Supply your Yandex login and a WebDAV app password as the first and second secret. This preset follows the Xray-core WebDAV test; live Yandex access depends on account permissions and service limits and was not tested against a user account.

Yandex Docs collaboration over WebSocket requires a different backend; this preset uses Disk storage, not the Docs channel used by OpenFlux.

Distribute an **Xray JSON subscription/configuration**. Portable VLESS share URIs do not encode the storage template and secrets, and the panel omits incomplete XDRIVE URIs. Clients must support XDRIVE in their core and preserve its JSON settings. Clash exports omit unsupported transports.

HTTPS encrypts storage API requests. Enable VLESS Encryption to protect the bytes stored in the shared folder. XTLS Vision flow is unavailable for XDRIVE in this panel. Treat storage credentials in a client configuration as access to that shared folder.

Timing fields are optional; leaving them empty uses Xray defaults. The Yandex preset uses 256 KiB segments, 100 ms flush, 300–1500 ms polling, concurrency 8, and a 120 s session TTL.

The panel migrates old XDNS finalmask fields to the v26.10.10 layout, including saved inbounds, host overrides, Xray templates, subscription masks, and cached outbounds. TLS now uses the core's built-in root certificates by default; services requiring a private CA need explicit trust configuration.
