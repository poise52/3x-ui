# Transport settings forms

Scope: technical administration inside the existing React/Ant Design panel. Character: compact, explicit, consistent. Direction: existing panel theme and field layout.

Use FormField labels and errors, existing Input/Select/Button/Collapse components, and the shared JsonEditor. ThemeProvider owns typography, colors, spacing, radius, dark mode and focus states. Do not introduce local theme overrides.

XDRIVE groups storage selection, shared folder and credentials before a collapsed timing section. The Yandex preset fills an editable HTTP template and preserves the folder. Keep provider-specific credentials labeled; incomplete templates and credentials must block submission.

Audit: controls use the existing keyboard/focus behavior and theme, labels bind to inputs, advanced timing stays collapsed, and the form adds no decorative layout. Component validation covers applying the preset and submitting credentials; browser visual verification is still pending.
