// SPDX-License-Identifier: Apache-2.0
//
// Phase 1 (static) redesign: there is no runtime behavior on the page yet.
// The #playground region (terminal + verification axes) currently shows a
// static, captured Blackbox CLI run. A later phase will mount the real
// in-browser Blackbox verifier here, built from this repo's browser bundle.
//
// When that lands, its output must come only from the real bundle running in
// the browser — no simulated or pre-rendered results. This file intentionally
// does nothing until then.
(function () {
  var playground = document.getElementById("playground");
  if (!playground) return;
  // Phase 2 mount point. No-op for the static redesign.
})();
