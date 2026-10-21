# Contributing assets

1. **Draw it yourself.** Never trace, redraw or "simplify" an existing proprietary icon, and do not use AI output you cannot show to be original. By contributing you license the art under CC0-1.0.
2. **Shape of an asset** (see `src/assets/library.js`): `id` (stable, kebab-case), `name`, `domain`, `topic`, `synonyms`, `tags`, `w`/`h` (design box), `parts` (named colours, at least one), optional `ports` (fractions of the box), and a `render(colors)` function returning SVG markup inside that box.
3. **Style set `core-1`:** flat fills, one outline colour (`#33415c`) at 3 px for the design box, rounded joins, no filters, no scripts, no external references.
4. **Every declared part must be used** in the markup (a test enforces this) and the SVG must be well formed (also tested).
5. **Scientific review:** add a reviewer and date before changing `review` from `unreviewed` to `reviewed`. Schematic is fine; misleading is not. State the species, cell type or state shown, and any scale.
6. **Accessibility:** check the asset in grayscale and with a colour-blind simulator; parts that carry meaning must differ in lightness, not only hue.
