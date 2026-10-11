# XDRIVE in 3x-ui

Select **XDRIVE** in the inbound or outbound transport selector. Both peers need an Xray build with XDRIVE, access to the same storage folder, and matching storage settings.

- **Google Drive:** supply a folder ID and three secrets in order: Client ID, Client Secret, Refresh Token.
- **HTTP template:** supply the shared folder, secrets, and HTTP definitions for put/get/list/delete. The list operation needs a Go-compatible `namesRegex` with a capture group containing object names.
- **Local filesystem:** point both peers at the same shared filesystem directory. A normal directory on two different machines is not shared storage.

For Yandex Disk, choose HTTP template and apply **Use Yandex Disk WebDAV template**. Create the folder on Disk first. Supply your Yandex login and a WebDAV app password as the first and second secret. This preset follows the Xray-core WebDAV test; live Yandex access depends on account permissions and service limits and was not tested against a user account.

Yandex Docs collaboration over WebSocket requires a different backend; this preset uses Disk storage, not the Docs channel used by OpenFlux.

Distribute an **Xray JSON subscription/configuration**. Portable VLESS share URIs do not encode the storage template and secrets, and the panel omits incomplete XDRIVE URIs. Clients must support XDRIVE in their core and preserve its JSON settings. Clash exports omit unsupported transports.

HTTPS encrypts storage API requests. Enable VLESS Encryption to protect the bytes stored in the shared folder. XTLS Vision flow is unavailable for XDRIVE in this panel. Treat storage credentials in a client configuration as access to that shared folder.

Select TLS in Security to customize the storage API's SNI, uTLS, ALPN, ECH, certificate verification and pins on either peer. These are client TLS settings; no inbound server certificate is required. With Security set to None, HTTPS storage URLs still use TLS automatically. Xray v26.10.10 rejects REALITY for XDRIVE.

TLS settings include cipher suites, minimum/maximum TLS versions, curves, root trust, session resumption and key logging. Trusted CA entries use `usage: verify` and require only the public certificate, either as inline PEM or a file path. Inline PEM travels with JSON subscriptions; file paths must exist independently on every peer. Leave root trust and negotiation defaults unchanged for normal public storage APIs.

Timing fields are optional; leaving them empty uses Xray defaults. The Yandex preset uses 256 KiB segments, 100 ms flush, 300–1500 ms polling, concurrency 8, and a 120 s session TTL.

The panel migrates old XDNS finalmask fields to the v26.10.10 layout, including saved inbounds, host overrides, Xray templates, subscription masks, and cached outbounds. TLS now uses the core's built-in root certificates by default; services requiring a private CA need explicit trust configuration.

## First remote test

Use Xray v26.10.10 on both peers. Updating the panel binary does not update an already installed external Xray binary. Check the core version in the panel and on the client. Export the client as an Xray JSON configuration; a VLESS URI or Clash profile is insufficient.

Start with one VLESS client, matching UUID, no Vision flow, Security None, and no custom masks, SNI, pins or CA overrides. HTTPS storage URLs still encrypt API requests. This minimal smoke test may use VLESS encryption/decryption `none`; enable matching VLESS Encryption before regular use to protect stored payloads. Only one server should consume a test folder. Both peers require outbound HTTPS access to the storage API; the XDRIVE listener polls storage instead of accepting a public TCP connection.

### Google Drive

1. Create a Google Cloud project, enable Google Drive API, configure the OAuth consent screen, and add your account as a test user if the app is in Testing mode.
2. Create an OAuth client of type Web application. Add `https://developers.google.com/oauthplayground` as an authorized redirect URI.
3. Open [OAuth Playground](https://developers.google.com/oauthplayground/). In its settings enable **Use your own OAuth credentials**, enter that Client ID and Client Secret, and select Offline access.
4. Authorize `https://www.googleapis.com/auth/drive.file` and exchange the authorization code for tokens. Keep the Refresh Token, not the short-lived Access Token.
5. With the same authorized application, use Playground Step 3 to create a dedicated folder: POST `https://www.googleapis.com/drive/v3/files`, Content-Type `application/json`, body `{"name":"xdrive-test","mimeType":"application/vnd.google-apps.folder"}`. Copy the returned `id`. Creating the folder through this app makes it accessible under the limited `drive.file` scope; pasting an arbitrary pre-existing folder ID does not grant access to it.
6. In the inbound select VLESS → XDRIVE → Google Drive. Set Remote folder to that folder ID, and enter Client ID, Client Secret and Refresh Token in their respective fields. Use the same folder and credentials on the client.
7. For a first cloud test, use the core's live-test tuning: segmentBytes 262144, flushIntervalMs 100, pollIntervalMs 500, maxPollIntervalMs 2000, sessionTtlSeconds 120. Leave the remaining tuning fields at defaults.

The Playground's default OAuth client revokes refresh tokens after 24 hours; using your own OAuth client avoids that Playground limit. Google's External/Testing consent mode separately expires Drive refresh tokens after seven days. Account permissions and quotas still apply.

### Yandex Disk

1. Create a dedicated folder named `xdrive-test` at the root of Yandex Disk.
2. In Yandex ID generate an application password of type **Files WebDAV**.
3. Select VLESS → XDRIVE → HTTP template and apply **Use Yandex Disk WebDAV template**.
4. Set Remote folder to `xdrive-test`, not a public share URL. In Secrets put the Yandex login on the first line and the WebDAV application password on the second line.
5. Save and import the Xray JSON configuration on the client. The template, folder and credentials must match. The preset already includes the upstream WebDAV test's tuning.

Google Docs and Yandex Docs collaborative editing channels are not implemented by these backends. Other services need a compatible put/get/list/delete HTTP storage API and a working template, not merely an accessible website or SNI.

## Validation and limits

The pinned core accepts Google Drive and WebDAV-style configs with Security None or TLS. Local VLESS/XDRIVE HTTP end-to-end, panel save/subscription tests, and the pinned core's mocked Drive/template/TLS tests pass locally. Real Google/Yandex account tests still require account credentials and have not been run by the panel project.

XDRIVE's service client supports HTTP/1.1 and HTTP/2; HTTP/3 ALPN is rejected by the panel. Leave ALPN/SNI defaults for the first test. The generic template parser validates required fields, but a custom template also needs valid Go regular expressions, a capture group in namesRegex, and provider-compatible request/response semantics. Startup alone does not prove that remote authentication or file operations succeed.

Sources: [pinned XDRIVE implementation](https://github.com/XTLS/Xray-core/tree/701af60772cd/transport/internet/xdrive), [upstream discussion](https://github.com/XTLS/Xray-core/pull/6748), [Drive scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth), [Google OAuth token expiration](https://developers.google.com/identity/protocols/oauth2), [Yandex WebDAV](https://yandex.ru/support/yandex-360/customers/disk/web/ru/webdav).
