/* Copyright (c) 2026 Daniel Pett / MicroPasts
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import * as d3 from 'd3';
import jsonld from 'jsonld';
import './style.css';
import { parseLinkedArtGraph, getNodeColor, isEventType, getMapUrl } from './parser.js';
import { renderTreeHtml, formatNQuads, escapeHtml } from './views.js';
import { renderModalWrapper, renderInlineWrapper, renderViewerShell } from './template.js';

export class LinkedArtViewer {
  constructor(target, options = {}) {
    this.container = typeof target === 'string' ? document.querySelector(target) : target;
    if (!this.container) {
      throw new Error('LinkedArtViewer: Target container element not found.');
    }

    this.options = {
      url: options.url || '',
      data: options.data || null,
      theme: options.theme || 'dark', // 'light' | 'dark'
      modal: options.modal ?? false,
      buttonText: options.buttonText || 'View Linked Art JSON-LD',
      showUrlInput: options.showUrlInput ?? true,
      fetchOptions: options.fetchOptions || {},
      height: options.height || '680px',
    };

    this.state = {
      open: !this.options.modal,
      loading: false,
      loadingStatus: '',
      error: null,
      data: null,
      rawJson: '',
      viewMode: 'graph',
      selectedNode: null,
      nquadsText: '',
      nquadsLineCount: 0,
      theme: this.options.theme,
      currentUrl: this.options.url,
    };

    this.mount();

    if (this.options.data) {
      this.setData(this.options.data);
    } else if (this.options.url && !this.options.modal) {
      this.loadUrl(this.options.url);
    }
  }

  mount() {
    this.wrapper = document.createElement('div');
    this.wrapper.className = this.state.theme === 'dark' ? 'dark' : '';
    this.container.innerHTML = '';
    this.container.appendChild(this.wrapper);

    this.wrapper.innerHTML = this.options.modal
      ? renderModalWrapper(this.options.buttonText)
      : renderInlineWrapper(this.options.height);

    this.shell = this.wrapper.querySelector('[data-el="viewer-shell"]');
    this.renderShell();
    this.bindEvents();
  }

  renderShell() {
    this.shell.innerHTML = renderViewerShell({
      showUrlInput: this.options.showUrlInput,
      currentUrl: this.state.currentUrl,
      modal: this.options.modal,
    });

    this.updateModeButtons();
  }

  bindEvents() {
    this.wrapper.addEventListener('click', (e) => {
      const actionEl = e.target.closest('[data-action]');
      if (actionEl) {
        const action = actionEl.dataset.action;
        if (action === 'open-modal') this.openModal();
        if (action === 'close-modal') this.closeModal();
        if (action === 'toggle-theme') this.toggleTheme();
        if (action === 'copy') this.copyToClipboard(actionEl);
        if (action === 'close-inspector') {
          this.state.selectedNode = null;
          this.renderInspector();
        }
        if (action === 'expand-tree') {
          const root = this.shell.querySelector('[data-el="tree-root"]');
          root.querySelectorAll('.tree-children').forEach((el) => (el.style.display = ''));
          root.querySelectorAll('.tree-icon').forEach((el) => (el.textContent = '▼'));
        }
        if (action === 'collapse-tree') {
          const root = this.shell.querySelector('[data-el="tree-root"]');
          root.querySelectorAll('.tree-children').forEach((el) => (el.style.display = 'none'));
          root.querySelectorAll('.tree-icon').forEach((el) => (el.textContent = '▶'));
        }
        return;
      }

      const modeEl = e.target.closest('[data-mode]');
      if (modeEl) {
        this.setMode(modeEl.dataset.mode);
        return;
      }

      const treeToggle = e.target.closest('.tree-toggle');
      if (treeToggle) {
        const node = treeToggle.closest('.tree-node');
        const children = node?.querySelector(':scope > .tree-children');
        const icon = treeToggle.querySelector('.tree-icon');
        if (children) {
          const isHidden = children.style.display === 'none';
          children.style.display = isHidden ? '' : 'none';
          if (icon) icon.textContent = isHidden ? '▼' : '▶';
        }
      }
    });

    const urlForm = this.shell.querySelector('[data-el="url-form"]');
    if (urlForm) {
      urlForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = this.shell.querySelector('[data-el="url-input"]');
        if (input && input.value.trim()) {
          this.loadUrl(input.value.trim());
        }
      });
    }

    if (this.options.modal) {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.state.open) {
          this.closeModal();
        }
      });
    }
  }

  // --- Public API ---

  openModal() {
    if (!this.options.modal) return;
    this.state.open = true;
    const backdrop = this.wrapper.querySelector('[data-el="modal-backdrop"]');
    backdrop?.classList.remove('hidden');

    if (!this.state.data && this.state.currentUrl) {
      this.loadUrl(this.state.currentUrl);
    } else if (this.state.data && this.state.viewMode === 'graph') {
      requestAnimationFrame(() => this.renderGraph());
    }
  }

  closeModal() {
    if (!this.options.modal) return;
    this.state.open = false;
    const backdrop = this.wrapper.querySelector('[data-el="modal-backdrop"]');
    backdrop?.classList.add('hidden');
  }

  setTheme(theme) {
    this.state.theme = theme === 'light' ? 'light' : 'dark';
    this.wrapper.classList.toggle('dark', this.state.theme === 'dark');
    if (this.state.data && this.state.viewMode === 'graph') {
      this.renderGraph();
    }
  }

  toggleTheme() {
    this.setTheme(this.state.theme === 'dark' ? 'light' : 'dark');
  }

  async loadUrl(url) {
    this.state.currentUrl = url;
    const urlInput = this.shell.querySelector('[data-el="url-input"]');
    if (urlInput) urlInput.value = url;

    this.setLoading(true, 'Fetching Linked Art JSON-LD...');
    this.setError(null);

    try {
      const response = await fetch(url, {
        ...this.options.fetchOptions,
        headers: {
          Accept: 'application/ld+json, application/json',
          ...(this.options.fetchOptions.headers || {}),
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();
      this.setData(json);
    } catch (err) {
      this.setError(err.message || 'Failed to fetch Linked Art data.');
    } finally {
      this.setLoading(false);
    }
  }

  setData(jsonOrString) {
    try {
      const parsed = typeof jsonOrString === 'string' ? JSON.parse(jsonOrString) : jsonOrString;
      this.state.data = parsed;
      this.state.rawJson = JSON.stringify(parsed, null, 2);
      this.state.nquadsText = '';
      this.state.selectedNode = null;
      this.setError(null);

      const contextEl = this.shell.querySelector('[data-el="context-url"]');
      if (contextEl) {
        contextEl.textContent = typeof parsed['@context'] === 'string' ? parsed['@context'] : '';
      }

      this.shell.querySelector('[data-el="empty-state"]')?.classList.add('hidden');
      this.renderInspector();
      this.setMode(this.state.viewMode);
    } catch (err) {
      this.setError('Invalid JSON-LD payload provided: ' + err.message);
    }
  }

  // --- Internal Rendering ---

  setLoading(isLoading, status = '') {
    this.state.loading = isLoading;
    const overlay = this.shell.querySelector('[data-el="loading-overlay"]');
    const text = this.shell.querySelector('[data-el="loading-text"]');
    if (overlay) overlay.classList.toggle('hidden', !isLoading);
    if (text && status) text.textContent = status;
  }

  setError(message) {
    this.state.error = message;
    const box = this.shell.querySelector('[data-el="error-box"]');
    const text = this.shell.querySelector('[data-el="error-text"]');
    if (box) box.classList.toggle('hidden', !message);
    if (text) text.textContent = message || '';
  }

  updateModeButtons() {
    this.shell.querySelectorAll('[data-mode]').forEach((btn) => {
      const active = btn.dataset.mode === this.state.viewMode;
      btn.className = active
        ? 'px-2.5 py-1 text-xs font-medium rounded transition flex items-center gap-1 bg-indigo-600 text-white shadow-xs'
        : 'px-2.5 py-1 text-xs font-medium rounded transition flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white';
    });

    const copyBtn = this.shell.querySelector('[data-action="copy"]');
    if (copyBtn) {
      copyBtn.textContent = `Copy ${this.state.viewMode === 'triples' ? 'N-Quads' : 'JSON'}`;
    }

    const legend = this.shell.querySelector('[data-el="legend-bar"]');
    if (legend) {
      legend.classList.toggle('hidden', this.state.viewMode !== 'graph');
    }
  }

  async setMode(mode) {
    this.state.viewMode = mode;
    this.updateModeButtons();

    const views = ['graph', 'tree', 'raw', 'triples'];
    views.forEach((v) => {
      const el = this.shell.querySelector(`[data-el="view-${v}"]`);
      if (el) el.classList.toggle('hidden', v !== mode || !this.state.data);
    });

    if (!this.state.data) return;

    if (mode === 'graph') {
      requestAnimationFrame(() => this.renderGraph());
    } else if (mode === 'raw') {
      this.shell.querySelector('[data-el="raw-pre"]').textContent = this.state.rawJson;
    } else if (mode === 'tree') {
      this.shell.querySelector('[data-el="tree-root"]').innerHTML = renderTreeHtml(this.state.data);
    } else if (mode === 'triples') {
      await this.renderTriples();
    }
  }

  async renderTriples() {
    const container = this.shell.querySelector('[data-el="triples-content"]');
    if (!this.state.nquadsText) {
      container.innerHTML = `<div class="text-indigo-600 dark:text-indigo-400 py-4">Converting JSON-LD graph to RDF N-Quads...</div>`;
      try {
        const nquads = await jsonld.toRDF(this.state.data, { format: 'application/n-quads' });
        this.state.nquadsText = nquads.trim();
        this.state.nquadsLineCount = this.state.nquadsText ? this.state.nquadsText.split('\n').length : 0;
      } catch (err) {
        this.state.nquadsText = `# Conversion Error: ${err.message}`;
        this.state.nquadsLineCount = 0;
      }
    }

    container.innerHTML = `
      <div class="space-y-3">
        <div class="pb-2 border-b border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-slate-700 dark:text-slate-300">RDF N-Quads / Triples</span>
            <span class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">${this.state.nquadsLineCount} statements</span>
          </div>
          <span class="text-[10px]">
            Prefixes: <span class="text-cyan-600 dark:text-cyan-400">crm</span>, <span class="text-cyan-600 dark:text-cyan-400">aat</span>, <span class="text-amber-600 dark:text-amber-400">_:b (blank node)</span>
          </span>
        </div>
        <pre class="whitespace-pre-wrap break-all overflow-x-auto p-2 font-mono leading-relaxed text-[11px] select-all">${formatNQuads(this.state.nquadsText)}</pre>
      </div>
    `;
  }

  copyToClipboard(btn) {
    const content = this.state.viewMode === 'triples' ? this.state.nquadsText : this.state.rawJson;
    if (!content) return;
    navigator.clipboard.writeText(content);
    const prev = btn.textContent;
    btn.textContent = 'Copied!';
    btn.classList.add('text-emerald-600', 'dark:text-emerald-400');
    setTimeout(() => {
      btn.textContent = prev;
      btn.classList.remove('text-emerald-600', 'dark:text-emerald-400');
    }, 2000);
  }

  renderGraph() {
    const container = this.shell.querySelector('[data-el="view-graph"]');
    if (!container || !this.state.data) return;

    container.innerHTML = '';
    const isDark = this.state.theme === 'dark';

    const rect = container.getBoundingClientRect();
    const width = Math.max(Math.floor(rect.width), 800);
    const height = Math.max(Math.floor(rect.height), 480);

    const { nodes, links } = parseLinkedArtGraph(this.state.data);

    const svg = d3
      .select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', [0, 0, width, height])
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .attr('class', 'select-none');

    svg.on('click', () => {
      this.state.selectedNode = null;
      this.renderInspector();
    });

    const g = svg.append('g');
    const zoom = d3.zoom().scaleExtent([0.2, 4]).on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(zoom);

    const markerId = `arrow-${Math.random().toString(36).substring(2, 8)}`;
    svg
      .append('defs')
      .append('marker')
      .attr('id', markerId)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 24)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', isDark ? '#64748b' : '#94a3b8');

    const simulation = d3
      .forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d) => d.id).distance(125))
      .force('charge', d3.forceManyBody().strength(-360))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(48));

    const link = g
      .append('g')
      .attr('stroke', isDark ? '#475569' : '#cbd5e1')
      .attr('stroke-opacity', 0.8)
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke-width', 1.5)
      .attr('marker-end', `url(#${markerId})`);

    const linkText = g
      .append('g')
      .selectAll('text')
      .data(links)
      .join('text')
      .attr('fill', isDark ? '#94a3b8' : '#64748b')
      .attr('font-size', '9px')
      .attr('text-anchor', 'middle')
      .text((d) => d.label);

    const node = g
      .append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', 'cursor-pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        this.state.selectedNode = d;
        this.renderInspector();
      })
      .call(
        d3
          .drag()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    const nodeStrokeBase = isDark ? '#0f172a' : '#ffffff';

    node
      .append('circle')
      .attr('r', (d) => {
        if (d.type === 'HumanMadeObject') return 22;
        if (isEventType(d.type)) return 19;
        if (d.type === 'TimeSpan') return 14;
        return 16;
      })
      .attr('fill', (d) => getNodeColor(d.type))
      .attr('stroke', (d) => {
        if (d.defined_by) return '#10b981';
        if (d.imageUrl) return '#f43f5e';
        if (isEventType(d.type)) return '#c084fc';
        return nodeStrokeBase;
      })
      .attr('stroke-width', (d) => (d.defined_by || d.imageUrl || isEventType(d.type) ? 2.5 : 2));

    node
      .filter((d) => !!d.defined_by)
      .append('circle')
      .attr('r', 5)
      .attr('cx', 12)
      .attr('cy', -12)
      .attr('fill', '#10b981')
      .attr('stroke', nodeStrokeBase)
      .attr('stroke-width', 1.5);

    node
      .filter((d) => !!d.imageUrl)
      .append('circle')
      .attr('r', 5)
      .attr('cx', 12)
      .attr('cy', -12)
      .attr('fill', '#f43f5e')
      .attr('stroke', nodeStrokeBase)
      .attr('stroke-width', 1.5);

    node
      .filter((d) => !!d.timeSpan)
      .append('circle')
      .attr('r', 4.5)
      .attr('cx', -12)
      .attr('cy', -12)
      .attr('fill', '#818cf8')
      .attr('stroke', nodeStrokeBase)
      .attr('stroke-width', 1.5);

    node
      .append('text')
      .attr('y', 28)
      .attr('text-anchor', 'middle')
      .attr('fill', isDark ? '#f1f5f9' : '#1e293b')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .text((d) => (d.label.length > 20 ? d.label.substring(0, 18) + '...' : d.label));

    node
      .append('text')
      .attr('y', 40)
      .attr('text-anchor', 'middle')
      .attr('fill', isDark ? '#94a3b8' : '#64748b')
      .attr('font-size', '8px')
      .text((d) => d.type);

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y);

      linkText
        .attr('x', (d) => (d.source.x + d.target.x) / 2)
        .attr('y', (d) => (d.source.y + d.target.y) / 2 - 3);

      node.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });
  }

  renderInspector() {
    const el = this.shell.querySelector('[data-el="inspector"]');
    const node = this.state.selectedNode;
    if (!el) return;

    if (!node) {
      el.classList.add('hidden');
      el.innerHTML = '';
      return;
    }

    const color = getNodeColor(node.type);
    const mapUrl = getMapUrl(node.defined_by);

    el.classList.remove('hidden');
    el.innerHTML = `
      <div class="flex items-start justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span class="inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase mb-1"
            style="background-color: ${color}22; color: ${color}; border: 1px solid ${color}44">
            ${escapeHtml(node.type)}
          </span>
          <h4 class="text-sm font-semibold text-slate-900 dark:text-slate-100">${escapeHtml(node.label)}</h4>
        </div>
        <button type="button" data-action="close-inspector" class="text-slate-400 hover:text-slate-800 dark:hover:text-white transition p-1">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="space-y-3 text-slate-700 dark:text-slate-300">
        ${
          node.defined_by
            ? `<div class="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/40 rounded-md space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-[10px] font-semibold uppercase text-emerald-700 dark:text-emerald-400 tracking-wider">Geographic Coordinates</span>
                  ${mapUrl ? `<a href="${escapeHtml(mapUrl)}" target="_blank" rel="noopener noreferrer" class="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-semibold">Open Map</a>` : ''}
                </div>
                <div class="p-2 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-500/20 rounded font-mono text-emerald-700 dark:text-emerald-300 select-all break-all text-[11px]">${escapeHtml(node.defined_by)}</div>
              </div>`
            : ''
        }

        ${
          node.timeSpan || node.actors?.length || node.places?.length
            ? `<div class="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-500/30 rounded-lg space-y-2">
                <span class="text-[10px] font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-400 block">Temporal & Event Context</span>
                ${node.timeSpan?.label ? `<p class="font-medium text-purple-900 dark:text-purple-200">${escapeHtml(node.timeSpan.label)}</p>` : ''}
                ${
                  node.timeSpan?.begin || node.timeSpan?.end
                    ? `<div class="font-mono text-[11px] text-purple-800 dark:text-purple-300 bg-white dark:bg-slate-900/60 p-2 rounded border border-purple-200 dark:border-purple-500/20">
                        ${escapeHtml(node.timeSpan.begin || '…')} → ${escapeHtml(node.timeSpan.end || '…')}
                      </div>`
                    : ''
                }
                ${
                  node.actors?.length
                    ? `<div><span class="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 block mb-1">Carried Out By:</span>
                       <div class="flex flex-wrap gap-1">${node.actors.map((a) => `<span class="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 text-[11px]">${escapeHtml(a)}</span>`).join('')}</div></div>`
                    : ''
                }
                ${
                  node.places?.length
                    ? `<div><span class="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 block mb-1">Took Place At:</span>
                       <div class="flex flex-wrap gap-1">${node.places.map((p) => `<span class="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 text-[11px]">${escapeHtml(p)}</span>`).join('')}</div></div>`
                    : ''
                }
              </div>`
            : ''
        }

        ${
          node.imageUrl
            ? `<div class="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-2.5">
                <span class="text-[10px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 block mb-2">Visual Depiction</span>
                <div class="rounded bg-white dark:bg-slate-950 overflow-hidden border border-slate-200 dark:border-slate-800/60 aspect-video flex items-center justify-center">
                  <img src="${escapeHtml(node.imageUrl)}" alt="${escapeHtml(node.label)}" class="max-h-full max-w-full object-contain" loading="lazy" />
                </div>
              </div>`
            : ''
        }

        ${
          node.content
            ? `<div>
                <span class="block text-[10px] font-semibold uppercase text-teal-600 dark:text-teal-400 tracking-wider mb-1">Text / Inscription</span>
                <div class="p-3 bg-slate-50 dark:bg-slate-900 border border-teal-200 dark:border-teal-500/30 rounded-md font-mono text-xs text-teal-800 dark:text-teal-200 whitespace-pre-wrap break-words">${escapeHtml(node.content)}</div>
              </div>`
            : ''
        }

        ${
          node.value && !node.content
            ? `<div>
                <span class="block text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400 tracking-wider mb-1">Measurement Value</span>
                <div class="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded font-mono text-cyan-700 dark:text-cyan-300 font-semibold">${escapeHtml(node.value)}</div>
              </div>`
            : ''
        }

        ${
          node.id && !node.id.startsWith('node_')
            ? `<div>
                <span class="block text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400 tracking-wider mb-1">Linked Data URI</span>
                <a href="${escapeHtml(node.id)}" target="_blank" rel="noopener noreferrer" class="block p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-cyan-700 dark:text-cyan-400 hover:underline break-all">${escapeHtml(node.id)}</a>
              </div>`
            : ''
        }
      </div>
    `;
  }
}

export default LinkedArtViewer;