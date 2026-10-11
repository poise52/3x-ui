# Transport settings forms

Scope: technical administration inside the existing React/Ant Design panel. Character: compact, explicit, consistent. Direction: existing panel theme and field layout.

Use FormField labels and errors, existing Input/Select/Button/Collapse components, and the shared JsonEditor. ThemeProvider owns typography, colors, spacing, radius, dark mode and focus states. Do not introduce local theme overrides.

XDRIVE groups storage selection, shared folder and credentials before a collapsed timing section. The Yandex preset fills an editable HTTP template and preserves the folder. Keep provider-specific credentials labeled; incomplete templates and credentials must block submission.

Audit: controls use the existing keyboard/focus behavior and theme, labels bind to inputs, advanced timing stays collapsed, and the form adds no decorative layout. Alerts and the timing block span the form width with standard Form.Item spacing; numeric fields fill their control column. TLS uses client controls without server certificate rows.

Verified the dark inbound form locally in the browser: full-width hint, expanded timing controls aligned in one column, and selectable TLS client fields. Functional tests cover TLS saving and retain certificate validation for other transports.

Client TLS fields follow the existing TLS form order and layout, without a separate advanced section. Trusted CA rows expose public certificate path/content, one-time loading and removal; no private key fields. Certificate rows use the existing add/remove icon buttons and omit inline explanatory text. Labels and tooltips reuse the panel's TLS terminology.
