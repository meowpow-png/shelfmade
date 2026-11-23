# Note: Disabled button steals focus on mousedown before click

## Context

I was chasing a bug in the chapter nav's add-chapter flow: the add button disabled itself while a newly created chapter's rename input was focused, specifically to stop a second click from creating a duplicate chapter before the rename committed. Despite that guard, a second click always created a duplicate, reproducible every time including with a ten-second gap between clicks, which ruled out double-click timing from the start. Two earlier fix attempts, deferring chapter selection and adding a mousedown guard directly on the button, had already failed to change the outcome.

## Observations

- The button's disabled condition read from the same component state that the rename input's blur handler cleared when it committed the rename.
- Every captured blur event had a null relatedTarget and body as the resulting active element, the signature of focus moving to nothing in particular.
- The mousedown guard added directly on the button in the earlier fix attempt never fired at all. A real devtools breakpoint confirmed independently that disabled buttons do not dispatch mousedown.
- A debugger breakpoint at the top of the rename-commit function, triggered by the second click, caught this call stack with nothing above it in JavaScript:

```text
dispatchDiscreteEvent → dispatchEvent → (React synthetic dispatch) → onBlur → commitRename
```

- The rest of the captured stack, further down, pointed at code involved in the app's very first mount. Reading the relevant cached state object directly at the breakpoint showed the pieces that initial-mount code would have created were already long since created and cached, which meant that code could not have been running again on this click.

## Analysis

That lower half of the stack was Chrome's async stack stitching: it appends the chain from where a listener was originally registered, not the chain actually invoking it now. Once I ruled that out, the real causal chain was just the browser's native discrete event dispatch calling into the blur handler, with no JavaScript above it. A gap like that above a focus-related native event is the signature of the browser's own focus management running, not application code: mousedown on a target that cannot accept focus, like a disabled button, blurs whatever element currently holds focus and moves focus to nothing. That matches the null relatedTarget and body active element I kept seeing.

Because the rename input's blur handler and the button's disabled condition shared the same state, the full sequence inside one click gesture was: mousedown on the disabled button triggers the browser's focus-management blur of the rename input, the blur handler commits the rename and clears the renaming state synchronously, the button's disabled condition re-evaluates to false as part of that same update, and only then does the click event of that same gesture fire, now against a button that is no longer disabled. This also explains why the earlier mousedown guard on the button could never have worked: the browser never dispatches mousedown to a disabled element in the first place, so there was no handler on it to intercept anything.

## Conclusions

Confirmed: the duplicate chapter was created because the button's own disabled state flipped to enabled mid-gesture, inside the same mousedown-to-click sequence that was supposed to be blocked by it. Confirmed: the mechanism was the browser's native mousedown-triggered focus blur on a non-focusable target, independent of and prior to any JavaScript.

Ruled out: HMR remounting, double-click timing, and the ref-based commit flag from the second fix attempt, none of which were backed by direct evidence and none of which addressed the actual ordering problem.

Fix: stop using a native disabled attribute for a button whose enabling condition is coupled to a blur handler's side effects. Keep the button focusable, guard the handler directly, and suppress focus theft explicitly instead of relying on disabled to do it implicitly:

```tsx
// before
<button disabled={creating || renamingSlug !== undefined} onClick={createChapter}>

// after
<button
  aria-disabled={creating || renamingSlug !== undefined}
  onMouseDown={(event) => event.preventDefault()}
  onClick={createChapter}
>
```

```tsx
function createChapter() {
  if (creating || renamingSlug !== undefined) return
  // ...
}
```

Visual disabled styling moved to an aria-attribute selector in CSS, which carries no native focus-management side effects.

The general shape worth watching for again: any disabled control whose disabled condition depends on whether some other element is currently focused or active, placed where a user might click it while that element is focused. If blurring that element is itself a side effect that clears the gating condition, the same race applies. Likely places this resurfaces: inline-rename or inline-edit fields that commit on blur next to a toolbar button gated on edit state, a disabled submit button next to a field that validates or commits on blur, or any other commit-on-blur pattern paired with a disabled affordance nearby.
