# Note: Vite Dev-Server CSS Serving Gotchas

## Context

While migrating Shelfmade's dev-time serving onto a single Vite+React dev server, two separate CSS-related bugs surfaced during manual verification of the new index page and live book preview, plus a handful of smaller environment gotchas hit along the way.

## Observations

**Index page cascade bug:** the index page imported its font, layout, and token stylesheets in an order where two of them declared the same top-level selector at equal specificity, so import order decided the winner. With the token stylesheet last, its book-preview-oriented values (a dark backdrop, a flex-centered body) clobbered the index page's actual chrome styles, showing a black background with a visually collapsed topbar.

**Book stylesheet content-type bug:** the pagination engine re-fetches every book stylesheet itself via a plain XHR request, with no `Accept: text/css` header, to reprocess it for pagination. The dev server negotiates between serving CSS as raw text versus as a JS module based on that header. A real stylesheet `<link>` gets raw CSS; the engine's own XHR doesn't. Since the book's stylesheet path happened to share a URL with a real file under the dev server's root, the server's own middleware answered the XHR first and served a JS module wrapper, so the engine silently failed to parse any book-authored CSS, while engine-level CSS served through our own middleware kept working regardless of path.

## Analysis

The cascade bug was a straightforward import-order fix: the static build already used the correct order, so the dev-mode entry point was changed to match.

The content-type bug needed a dev-server plugin that intercepts requests before Vite's own static and transform middleware runs, rather than one registered after server startup. The first attempt scoped the plugin to every asset under a book's path, which broke loading the book's own component files, since those share the same URL-collision problem but actually need Vite's transform, unlike CSS. Narrowing the plugin to CSS requests only fixed the regression:

```js
configureServer(server) {
  server.middlewares.use((req, res, next) => {
    if (req.url?.endsWith('.css')) {
      // serve raw, bypassing Vite's module-wrapper negotiation
    }
    next()
  })
}
```

Separately, the CLI binary runs from a compiled build output, not live source. Unlike the client-side code (which Vite transforms live from source), changes to the dev server's own source require a rebuild before they take effect in a running dev session. Retesting against a stale build cost real time before this was caught.

## Conclusions

**Confirmed root causes:** the cascade bug was pure CSS import order; the content-type bug was a URL collision between a real on-disk path and the dev server's content-negotiation-by-header behavior, which only affects requests that don't set the header the pagination engine happens to omit.

**Fix pattern worth reusing:** when a dev-server middleware needs to intercept a request type before Vite's own static or transform handling, register it at server configuration time rather than after startup, and scope it as narrowly as possible to the specific file type that needs the override. A broad path-based scope will catch files that need Vite's normal transform and break them.

**Other environment gotchas hit during the same migration, worth checking first if something looks wrong:**

- The dev server's default host resolution did not bind a reachable socket in this sandbox despite startup logs reporting success. Pinning the host to `127.0.0.1` fixed it, matching what the previous dev server already did for the same reason.
- The sample book's dependency on Shelfmade itself is a linked local install. Vite treats linked packages as local source by default and tried to transform Shelfmade's pre-built CJS output as ESM, crashing on `exports` being undefined. Fixed by marking the package as external for server-side rendering, which is also the correct behavior for real npm consumers, not just a workaround for this test setup.
- The client-side source directories must ship as real source in the npm package, since Vite transforms that source at the consumer's machine and can't point at compiled output for this UI.
- The unused-code checker reports some client-side files and one loader function as unused. False positives: they're only reachable through dynamic module loading and virtual file-system paths that static analysis can't trace.
