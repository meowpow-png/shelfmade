# Note: Flex Centering Clips Overflowing Preview Content

## Context

The book editor page shell lays out its topbar, editor pane, and preview pane as a chain of flex containers, with the preview pane's content centered inside its container. Books taller than the viewport are the common case, not the exception, so the preview needed to scroll internally instead of growing the page.

With a plain `align-items: center` on the centering container, tall preview content showed up clipped at the top. Scrolling the pane did nothing to reach the missing part. The content was there in the DOM, just visually cut off and unreachable.

## Observations

`align-items: center` centers a flex item by giving it equal overflow on both sides of the container when the item is larger than the container. The browser renders a scrollable area only on the end side (bottom), so the equal overflow on the start side (top) has nowhere to scroll to. It is clipped, not scrollable, from the start edge.

Fixing the alignment alone did not fully fix scrolling either. A flex item's default `min-height` is `auto`, which lets it grow to its content's height rather than respect the height its container is trying to constrain it to. Any one container in the chain left at the default would let its child grow past the available space instead of scrolling, which pushed the overflow problem up to the next container instead of solving it.

## Analysis

Two separate flex behaviors were stacking on top of each other:

- Centering with overflow present clips the overflow on the start side, since the equal split has no scroll affordance on that edge
- A flex child's default `min-height: auto` overrides an ancestor's fixed height, so a height constraint placed higher in the tree does not reach the pane that actually needs to scroll unless every container in between gives up its auto minimum

Neither behavior is specific to this preview pane. Both apply to any flex chain that centers content and expects an inner pane to scroll independently of the page.

## Conclusions

Fix shipped in `src/runtime/book-editor.css`:

```css
align-items: safe center;
```

`safe center` keeps the centering behavior when content fits, and falls back to start alignment when it does not, so the overflow lands on the scrollable end side instead of being split across both edges.

The second half of the fix threads `overflow-y: auto` and `min-height: 0` down every container between the page root and the scrolling pane, not just the pane itself:

```css
overflow-y: auto;
min-height: 0;
```

Skipping a container partway down the chain reintroduces the growth problem at that level, even with `safe center` and the leaf pane's own overflow rules already correct.

**Fix pattern worth reusing:** any flex layout in Shelfmade that centers a pane and expects it to scroll internally needs both pieces together, applied at every level of the chain: `safe center` for the alignment, and `overflow-y: auto` plus `min-height: 0` reset at each intermediate container. Either one alone leaves content clipped or the page growing instead of scrolling.
