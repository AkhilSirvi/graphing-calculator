# Third-Party Libraries and Licenses

This project bundles and uses several third-party libraries. The project itself is
released under the MIT License; third-party components retain their original
licenses as described below.

- jQuery
  - License: MIT
  - Upstream: https://jquery.org/
  - License text: included in the header of `lib/jquery.js` (see file top)
  - Bundled file in this repo: `lib/jquery.js`

- MathQuill
  - License: Mozilla Public License (MPL) 2.0
  - Upstream: https://mathquill.com/ and https://github.com/mathquill/mathquill
  - License text: referenced in the header of `lib/mathquill.js` (see file top)
  - Bundled files in this repo: `lib/mathquill.js` and `lib/mathquill.css`
  - Modifications: `lib/mathquill.css` has been modified in this repository to
    adjust visual styles (remove borders, make editable fields full-width,
    and clean unused/commented rules). Additionally, `lib/mathquill.js` has
    also been modified in this repository. The original MathQuill license
    header is retained in the JavaScript file; see the repository history or
    file diffs for details of the changes.

- Nerdamer
  - License: MIT
  - Upstream: https://nerdamer.com/ and https://github.com/jiggzson/nerdamer
  - License text: the project is released under the MIT License. The bundled
    file in this repository (`lib/nerdamer.core.js`) contains author/source
    headers; include the full MIT license text alongside the library if you
    redistribute.
  - Bundled file in this repo: `lib/nerdamer.core.js`

Notes

- If you redistribute this project or portions of it, you must comply with the
  terms of each component's license. In particular, retain copyright and
  license notices as required by those licenses (for example, the MPL requires
  that source files under the MPL keep notice headers and that any distributed
  modifications comply with the MPL's source-availability obligations).

- The project-wide license for project code that is not part of third-party
  components is in `LICENSE` (MIT).

If you want, I can also:
- Add the full license texts of the bundled libraries into `lib/` (e.g.,
  `lib/LICENSE.jquery.md`, `lib/LICENSE.mathquill.md`).
- Add inline header comments to the modified `lib/mathquill.css` noting that it
  was modified and pointing to this file.
