/* Copyright (c) 2026 Daniel Pett / MicroPasts
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { escapeHtml } from './views.js';

export function renderModalWrapper(buttonText) {
  return `
    <button type="button" data-action="open-modal" class="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md shadow-xs hover:bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 dark:text-slate-300 dark:border-slate-800/60 dark:hover:bg-slate-800/60 dark:focus:ring-indigo-400 dark:bg-slate-900">
      <svg class="w-4 h-4 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8 8.009 8.009 0 0 1-8 8Zm-1-13h2v6h-2Zm0 8h2v2h-2Z"/>
      </svg>
      ${escapeHtml(buttonText)}
    </button>
    <div data-el="modal-backdrop" class="hidden fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      <div data-action="close-modal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity dark:bg-slate-950/70"></div>
      <div class="flex min-h-full items-center justify-center p-4">
        <div data-el="viewer-shell" style="height: 85vh; min-height: 540px;" class="relative w-full max-w-6xl rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col overflow-hidden"></div>
      </div>
    </div>
  `;
}

export function renderInlineWrapper(height) {
  return `
    <div data-el="viewer-shell" style="height: ${escapeHtml(height)}; min-height: 520px;" class="relative w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 shadow-lg flex flex-col overflow-hidden"></div>
  `;
}

export function renderViewerShell({ showUrlInput, currentUrl, modal }) {
  const urlInputHtml = showUrlInput
    ? `
      <form data-el="url-form" class="flex items-center gap-1.5 flex-1 max-w-md mx-2">
        <input
          type="url"
          data-el="url-input"
          value="${escapeHtml(currentUrl)}"
          placeholder="https://linked.art/example/object/0.json"
          class="w-full px-2.5 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
        />
        <button type="submit" class="px-2.5 py-1 text-xs font-medium rounded bg-indigo-600 hover:bg-indigo-500 text-white transition shrink-0">
          Load
        </button>
      </form>
    `
    : '';

  const closeBtnHtml = modal
    ? `
      <button type="button" data-action="close-modal" class="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition ml-1" title="Close">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    `
    : '';

  return `
    <!-- Header -->
    <div class="shrink-0 flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/90">
      <div class="flex items-center gap-2.5">
        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
          Linked Art Graph
        </span>
        <span data-el="context-url" class="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px] hidden lg:inline"></span>
      </div>

      ${urlInputHtml}

      <!-- Actions & Toggles -->
      <div class="flex items-center gap-2">
        <div class="inline-flex rounded-md bg-slate-200/80 dark:bg-slate-900 p-0.5 border border-slate-300 dark:border-slate-700">
          <button type="button" data-mode="graph" class="px-2.5 py-1 text-xs font-medium rounded transition flex items-center gap-1">Graph</button>
          <button type="button" data-mode="tree" class="px-2.5 py-1 text-xs font-medium rounded transition">Tree</button>
          <button type="button" data-mode="raw" class="px-2.5 py-1 text-xs font-medium rounded transition">JSON</button>
          <button type="button" data-mode="triples" class="px-2.5 py-1 text-xs font-medium rounded transition">N-Quads</button>
        </div>

        <button type="button" data-action="copy" class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded transition">
          Copy JSON
        </button>

        <!-- Light / Dark Theme Toggle -->
        <button type="button" data-action="toggle-theme" title="Toggle Light/Dark Mode" class="p-1.5 rounded text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 transition">
          <svg data-el="icon-sun" class="w-4 h-4 hidden dark:block text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <svg data-el="icon-moon" class="w-4 h-4 block dark:hidden text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        </button>

        ${closeBtnHtml}
      </div>
    </div>

    <!-- Legend -->
    <div data-el="legend-bar" class="shrink-0 flex flex-wrap items-center gap-3 px-4 py-2 bg-slate-100/70 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800/60 text-[11px] text-slate-600 dark:text-slate-400">
      <span class="font-semibold text-slate-800 dark:text-slate-300">Legend:</span>
      <span class="inline-flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Object</span>
      <span class="inline-flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-purple-500"></span> Event / Activity</span>
      <span class="inline-flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-indigo-400"></span> TimeSpan</span>
      <span class="inline-flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Actor</span>
      <span class="inline-flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Place</span>
      <span class="inline-flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-pink-500"></span> Type</span>
      <span class="inline-flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-orange-400"></span> Material</span>
      <span class="inline-flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-cyan-500"></span> Dimension</span>
      <span class="inline-flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-teal-400"></span> Text</span>
      <span class="inline-flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Visual</span>
      <span class="ml-auto text-slate-500 text-[10px] hidden sm:inline">Click node to inspect &bull; Green dot = Coordinates</span>
    </div>

    <!-- Body -->
    <div class="relative flex-1 min-h-0 overflow-hidden bg-slate-50 dark:bg-slate-900">
      <!-- Loading Overlay -->
      <div data-el="loading-overlay" class="hidden absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 text-slate-700 dark:text-slate-300 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs">
        <svg class="animate-spin h-8 w-8 text-indigo-600 dark:text-indigo-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span data-el="loading-text" class="text-sm font-medium">Resolving Linked Art data...</span>
      </div>

      <!-- Empty State -->
      <div data-el="empty-state" class="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400 text-sm p-6 text-center">
        <p class="font-medium">No Linked Art JSON-LD loaded</p>
        <p class="text-xs mt-1">Enter a Linked Art URL above or pass data programmatically via <code class="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800">setData()</code>.</p>
      </div>

      <!-- Error State -->
      <div data-el="error-box" class="hidden m-6 p-4 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300">
        <p class="font-bold text-sm">Error loading Linked Art payload</p>
        <p data-el="error-text" class="text-xs mt-1"></p>
      </div>

      <!-- Graph Canvas -->
      <div data-el="view-graph" class="hidden w-full h-full cursor-grab active:cursor-grabbing"></div>

      <!-- Node Inspector Drawer -->
      <div data-el="inspector" class="hidden lav-scroll absolute right-4 top-4 z-10 w-96 max-w-[calc(100%-2rem)] max-h-[85%] overflow-y-auto bg-white/95 dark:bg-slate-950/95 border border-slate-200 dark:border-slate-700/80 rounded-lg p-5 shadow-2xl backdrop-blur-xs text-xs leading-relaxed"></div>

      <!-- Raw JSON View -->
      <div data-el="view-raw" class="hidden lav-scroll h-full overflow-auto p-6 font-mono text-xs text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-950">
        <pre data-el="raw-pre"></pre>
      </div>

      <!-- Tree View -->
      <div data-el="view-tree" class="hidden lav-scroll h-full overflow-auto p-6 font-mono text-xs bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 select-text">
        <div class="pb-3 mb-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <div class="flex items-center gap-2">
            <button type="button" data-action="expand-tree" class="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition">Expand All</button>
            <button type="button" data-action="collapse-tree" class="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition">Collapse All</button>
          </div>
          <span>Click chevrons or item badges to toggle nodes</span>
        </div>
        <div data-el="tree-root" class="space-y-0.5 font-mono"></div>
      </div>

      <!-- N-Quads View -->
      <div data-el="view-triples" class="hidden lav-scroll h-full overflow-auto p-6 font-mono text-xs bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200">
        <div data-el="triples-content"></div>
      </div>
    </div>
  `;
}