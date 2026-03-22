// main.tsx — Thin entry that dynamically imports bootstrap.
// This indirection is required by Module Federation: shared dependencies
// (react, react-dom, etc.) must be negotiated before any module that
// imports them is evaluated. The dynamic import() boundary gives the
// federation runtime a chance to resolve shared singletons first.

import('./bootstrap');
