# Linked Art Viewer (`linked-art-viewer`)

A standalone, framework-agnostic network graph, collapsible tree, JSON, and RDF N-Quads viewer for [Linked Art](https://linked.art/) JSON-LD cultural heritage records.

Built with D3.js, `jsonld.js`, and bundled Tailwind CSS v4—requiring zero runtime CDN dependencies or host-framework CSS setup.

* **Live Demo:** https://micropasts.github.io/linked-art-viewer/
* **Repository:** https://github.com/micropasts/linked-art-viewer

---

## Features

* **Four Synchronized Inspection Views:**
  * **Interactive Network Graph:** Force-directed D3 graph with pan, zoom, node dragging, directional relationship labels, and semantic color coding across CIDOC-CRM / Linked Art classes (`HumanMadeObject`, `Production`, `Activity`, `Person`, `Group`, `Place`, `TimeSpan`, `Type`, `Material`, `Dimension`, `LinguisticObject`, `VisualItem`, `InformationObject`, and `Set`).
  * **Node Inspector Drawer:** Click any node to view its Linked Data URI, WKT geographic coordinates (with direct OpenStreetMap links), temporal spans, actors, places, inscriptions, measurements, visual depictions, and IIIF Presentation manifests.
  * **Collapsible JSON Tree:** Interactive syntax-highlighted tree with Expand All / Collapse All controls and inline entity type/label badges.
  * **Raw JSON & RDF N-Quads:** Formatted JSON-LD source view and live client-side RDF N-Quads serialization with prefix shortening (`crm:`, `aat:`, `la:`, `nomisma:`, `rdf:`, `rdfs:`) and one-click clipboard copy.
* **Flexible Data Input:** Load Linked Art JSON-LD directly from a remote/local endpoint URL, via the built-in interactive URL bar, or programmatically from a JavaScript object or JSON string.
* **Inline & Modal Modes:** Embed directly into a page container or render as a compact trigger button that opens a full-screen modal dialog.
* **Scoped Light & Dark Mode:** Bundled Tailwind CSS with a built-in header theme toggle scoped to the viewer wrapper so it never conflicts with your host application's theme.

---

## Installation

Install the package via npm:

```bash
npm install @micropasts/linked-art-viewer
```
---

## Quick Start

Import both the `LinkedArtViewer` class and its bundled stylesheet:

```javascript
import { LinkedArtViewer } from '@micropasts/linked-art-viewer';
import '@micropasts/linked-art-viewer/style.css';

// Initialize an inline viewer from a Linked Art endpoint URL
const viewer = new LinkedArtViewer('#viewer', {
  url: 'https://data.getty.edu/museum/collection/object/cbeb7d35-e11e-426c-b48d-f028a7c3e056',
  theme: 'dark',
  showUrlInput: true,
  height: '680px',
});
```

Ensure your HTML contains the target mount element:

```html
<div id="viewer"></div>
```

---

## Usage Patterns

### 1. Parse from a JavaScript Variable (Object or JSON String)

Pass a pre-loaded JSON-LD object or raw JSON string via the `data` option at initialization, or update an existing viewer instance at any time with `setData()`:

```javascript
import { LinkedArtViewer } from 'linked-art-viewer';
import 'linked-art-viewer/style.css';

const linkedArtRecord = {
  '@context': 'https://linked.art/ns/v1/linked-art.json',
  id: 'https://example.org/object/1',
  type: 'HumanMadeObject',
  _label: 'Marble Bust',
  produced_by: {
    type: 'Production',
    _label: 'Carving of Marble Bust',
    carried_out_by: [
      {
        id: 'https://example.org/person/1',
        type: 'Person',
        _label: 'Unknown Sculptor',
      },
    ],
  },
};

const viewer = new LinkedArtViewer('#viewer', {
  data: linkedArtRecord,
  showUrlInput: false, // Hide the URL input bar when using local data only
});

// Later, swap in a different record
viewer.setData(anotherRecord);
```

### 2. Modal Trigger Mode

Set `modal: true` to render a trigger button that fetches and displays the Linked Art viewer inside an accessible modal overlay (supports `Escape` key and backdrop click to close):

```javascript
import { LinkedArtViewer } from 'linked-art-viewer';
import 'linked-art-viewer/style.css';

const modalViewer = new LinkedArtViewer('#linked-art-button', {
  modal: true,
  buttonText: 'View Linked Art JSON-LD',
  url: '/api/objects/42/linked-art',
  theme: 'dark',
});
```

### 3. Custom Fetch Headers & Authentication

Pass standard `fetch()` options (such as credentials or authorization headers) via `fetchOptions`:

```javascript
const viewer = new LinkedArtViewer('#viewer', {
  url: '/api/private/linked-art/123',
  fetchOptions: {
    credentials: 'same-origin',
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
    },
  },
});
```

### 4. Framework Integration Examples

#### Vanilla HTML / UMD Script Tag

If you are not using a bundler, load the UMD build and stylesheet directly from `node_modules` or a CDN:

```html
<link rel="stylesheet" href="./node_modules/linked-art-viewer/dist/linked-art-viewer.css" />
<div id="viewer"></div>

<script src="./node_modules/linked-art-viewer/dist/linked-art-viewer.umd.cjs"></script>
<script>
  const viewer = new LinkedArtViewer.LinkedArtViewer('#viewer', {
    url: 'https://data.getty.edu/museum/collection/object/cbeb7d35-e11e-426c-b48d-f028a7c3e056',
  });
</script>
```

#### React

```jsx
import { useEffect, useRef } from 'react';
import { LinkedArtViewer } from 'linked-art-viewer';
import 'linked-art-viewer/style.css';

export function LinkedArtPanel({ url, data, theme = 'dark' }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    viewerRef.current = new LinkedArtViewer(containerRef.current, {
      url,
      data,
      theme,
    });
  }, []);

  useEffect(() => {
    if (viewerRef.current && data) {
      viewerRef.current.setData(data);
    }
  }, [data]);

  useEffect(() => {
    if (viewerRef.current) {
      viewerRef.current.setTheme(theme);
    }
  }, [theme]);

  return <div ref={containerRef} />;
}
```

#### Vue 3

```vue
<script setup>
import { onMounted, ref, watch } from 'vue';
import { LinkedArtViewer } from 'linked-art-viewer';
import 'linked-art-viewer/style.css';

const props = defineProps({
  url: String,
  data: Object,
  theme: { type: String, default: 'dark' },
});

const container = ref(null);
let viewer = null;

onMounted(() => {
  viewer = new LinkedArtViewer(container.value, {
    url: props.url,
    data: props.data,
    theme: props.theme,
  });
});

watch(() => props.data, (newData) => {
  if (viewer && newData) viewer.setData(newData);
});

watch(() => props.theme, (newTheme) => {
  if (viewer) viewer.setTheme(newTheme);
});
</script>

<template>
  <div ref="container" />
</template>
```

---

## Configuration Options

Pass these options as the second argument to `new LinkedArtViewer(target, options)`:

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `url` | `string` | `''` | Linked Art JSON-LD endpoint URL to fetch. In inline mode, loads immediately on mount; in modal mode, lazy-loads when the modal opens. |
| `data` | `object \| string \| null` | `null` | Pre-loaded Linked Art JSON-LD object or JSON string. Takes precedence over `url` on initial render. |
| `theme` | `'light' \| 'dark'` | `'dark'` | Initial color theme of the viewer UI and D3 graph canvas. Users can switch themes via the header toggle button. |
| `modal` | `boolean` | `false` | When `true`, mounts a trigger button that opens the viewer inside a modal dialog. When `false`, renders inline. |
| `buttonText` | `string` | `'View Linked Art JSON-LD'` | Label text for the modal trigger button (used when `modal: true`). |
| `showUrlInput` | `boolean` | `true` | Displays an interactive URL input bar and Load button in the viewer header. |
| `height` | `string` | `'680px'` | CSS height of the inline viewer container (minimum `520px`). Ignored when `modal: true` (uses `85vh`). |
| `fetchOptions` | `RequestInit` | `{}` | Additional options passed to `fetch()` when requesting `url` (e.g., `headers`, `credentials`). |

---

## Instance Methods

Once instantiated (`const viewer = new LinkedArtViewer(...)`), the following methods are available:

| Method | Signature | Description |
| :--- | :--- | :--- |
| `loadUrl(url)` | `(url: string) => Promise<void>` | Fetches Linked Art JSON-LD from `url` and renders the active view. |
| `setData(json)` | `(json: object \| string) => void` | Parses and renders a JSON-LD object or JSON string immediately. |
| `setMode(mode)` | `(mode: 'graph' \| 'tree' \| 'raw' \| 'triples') => Promise<void>` | Switches the active tab (`graph`, `tree`, `raw` JSON, or `triples` N-Quads). |
| `setTheme(theme)` | `(theme: 'light' \| 'dark') => void` | Sets the viewer theme and re-renders graph node/edge colors to match. |
| `toggleTheme()` | `() => void` | Toggles between `'light'` and `'dark'` themes. |
| `openModal()` | `() => void` | Opens the modal dialog (when `modal: true`). |
| `closeModal()` | `() => void` | Closes the modal dialog (when `modal: true`). |

---

## Visual Indicators & Node Legend

In **Graph** mode, nodes are styled by their Linked Art / CIDOC-CRM `type` and annotated with status badges:

* **Node Colors:**
  * **Amber (`#f59e0b`):** `HumanMadeObject`
  * **Purple (`#a855f7` – `#6d28d9`):** `Production`, `Encounter`, `Activity`, `Event`, `Creation`, `Modification`, `Period`
  * **Indigo (`#818cf8`):** `TimeSpan`
  * **Blue (`#3b82f6` / `#0284c7`):** `Person`, `Group`
  * **Emerald (`#10b981`):** `Place`
  * **Pink (`#ec4899`):** `Type`
  * **Orange (`#fb923c`):** `Material`
  * **Cyan (`#06b6d4` / `#22d3ee`):** `Dimension`, `MeasurementUnit`
  * **Teal (`#14b8a6`):** `LinguisticObject`
  * **Rose (`#f43f5e` / `#fb7185`):** `VisualItem`, `DigitalObject`
  * **Sky (`#38bdf8`):** `InformationObject`
  * **Yellow (`#eab308`):** `Set`
* **Corner Dots on Nodes:**
  * **Green dot (top-right):** Node has WKT geographic coordinates (`defined_by`) with an OpenStreetMap link in the inspector.
  * **Rose dot (top-right):** Node has an associated image preview (`access_point` / `digitally_shown_by`).
  * **Indigo dot (top-left):** Event or activity node has an attached `TimeSpan`.

---

## Development & Building

```bash
# Install dependencies
npm install

# Start local dev sandbox (serves index.html)
npm run dev

# Build npm library bundle (outputs to dist/)
npm run build

# Build static GitHub Pages demo site (outputs to docs/)
npm run build:docs
```

---

## License

This project is licensed under the **Mozilla Public License Version 2.0 (MPL-2.0)** — see the [LICENSE.md](./LICENSE.md) file for details.