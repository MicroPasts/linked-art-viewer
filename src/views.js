/* Copyright (c) 2026 Daniel Pett / MicroPasts
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
 export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderTreeHtml(val, depth = 0) {
  if (val === null || val === undefined) {
    return `<span class="text-slate-400 dark:text-slate-500 italic">null</span>`;
  }
  if (typeof val === 'boolean') {
    return `<span class="text-amber-600 dark:text-amber-400 font-semibold">${val}</span>`;
  }
  if (typeof val === 'number') {
    return `<span class="text-sky-600 dark:text-sky-300 font-semibold">${val}</span>`;
  }
  if (typeof val === 'string') {
    if (val.startsWith('http://') || val.startsWith('https://')) {
      return `"<a href="${escapeHtml(val)}" target="_blank" rel="noopener noreferrer" class="text-cyan-600 dark:text-cyan-400 hover:underline break-all">${escapeHtml(val)}</a>"`;
    }
    return `<span class="text-emerald-700 dark:text-emerald-300 break-words">"${escapeHtml(val)}"</span>`;
  }

  const isCollapsed = depth >= 2;
  const toggleIcon = isCollapsed ? '▶' : '▼';
  const bodyStyle = isCollapsed ? 'display: none;' : '';

  if (Array.isArray(val)) {
    if (val.length === 0) return `<span class="text-slate-500">[]</span>`;
    const badge = `<span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700/60 ml-1.5 cursor-pointer">${val.length} ${val.length === 1 ? 'item' : 'items'}</span>`;

    const itemsHtml = val
      .map(
        (item, i) => `
        <div class="flex items-start gap-2 py-0.5">
          <span class="text-slate-400 dark:text-slate-500 select-none shrink-0 font-mono text-[11px]">${i}:</span>
          <div class="flex-1 min-w-0">${renderTreeHtml(item, depth + 1)}</div>
        </div>`
      )
      .join('');

    return `
      <div class="tree-node inline-block w-full">
        <span class="tree-toggle cursor-pointer select-none text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white inline-flex items-center gap-1">
          <span class="tree-icon text-[10px] w-3 text-center inline-block">${toggleIcon}</span>
          <span class="font-bold">[</span>
          ${badge}
        </span>
        <div class="tree-children ml-4 pl-2 border-l border-slate-200 dark:border-slate-800/80 my-1" style="${bodyStyle}">
          ${itemsHtml}
        </div>
        <span class="text-slate-500 dark:text-slate-400 font-bold block">]</span>
      </div>`;
  }

  if (typeof val === 'object') {
    const keys = Object.keys(val);
    if (keys.length === 0) return `<span class="text-slate-500">{}</span>`;

    const labelHint = val._label
      ? `<span class="text-slate-500 dark:text-slate-400 text-[11px] italic ml-1">"${escapeHtml(val._label.length > 35 ? val._label.substring(0, 32) + '...' : val._label)}"</span>`
      : '';
    const typeHint = val.type
      ? `<span class="text-[10px] px-1 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700/40 ml-1">${escapeHtml(val.type)}</span>`
      : '';
    const badge = `<span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700/60 ml-1.5 cursor-pointer">${keys.length} keys</span>`;

    const propsHtml = keys
      .map(
        (key) => `
        <div class="flex items-start gap-2 py-0.5">
          <span class="text-purple-700 dark:text-purple-300 shrink-0 font-semibold select-none font-mono text-[11px]">${escapeHtml(key)}:</span>
          <div class="flex-1 min-w-0">${renderTreeHtml(val[key], depth + 1)}</div>
        </div>`
      )
      .join('');

    return `
      <div class="tree-node inline-block w-full">
        <span class="tree-toggle cursor-pointer select-none text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white inline-flex items-center gap-1">
          <span class="tree-icon text-[10px] w-3 text-center inline-block">${toggleIcon}</span>
          <span class="font-bold">{</span>
          ${typeHint}
          ${labelHint}
          ${badge}
        </span>
        <div class="tree-children ml-4 pl-2 border-l border-slate-200 dark:border-slate-800/80 my-1" style="${bodyStyle}">
          ${propsHtml}
        </div>
        <span class="text-slate-500 dark:text-slate-400 font-bold block">}</span>
      </div>`;
  }

  return escapeHtml(String(val));
}

export function formatNQuads(text) {
  if (!text) return '';

  const prefixes = [
    { prefix: 'crm:', uri: 'http://www.cidoc-crm.org/cidoc-crm/' },
    { prefix: 'crmsci:', uri: 'http://www.ics.forth.gr/isl/CRMsci/' },
    { prefix: 'crmdig:', uri: 'http://www.ics.forth.gr/isl/CRMdig/' },
    { prefix: 'la:', uri: 'https://linked.art/ns/terms/' },
    { prefix: 'aat:', uri: 'http://vocab.getty.edu/aat/' },
    { prefix: 'nomisma:', uri: 'http://nomisma.org/id/' },
    { prefix: 'os:', uri: 'http://data.ordnancesurvey.co.uk/doc/' },
    { prefix: 'rdf:', uri: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#' },
    { prefix: 'rdfs:', uri: 'http://www.w3.org/2000/01/rdf-schema#' },
    { prefix: 'xsd:', uri: 'http://www.w3.org/2001/XMLSchema#' },
    { prefix: 'dc:', uri: 'http://purl.org/dc/elements/1.1/' },
    { prefix: 'dcterms:', uri: 'http://purl.org/dc/terms/' },
  ];

  const bnodeLabels = {};
  const lines = text.split('\n');
  lines.forEach((l) => {
    const m = l.match(/^(_:b\w+)\s+<http:\/\/www\.w3\.org\/2000\/01\/rdf-schema#label>\s+"([^"]+)"/);
    if (m) bnodeLabels[m[1]] = m[2];
  });

  const shortenIri = (rawIri) => {
    for (const p of prefixes) {
      if (rawIri.startsWith(p.uri)) {
        const term = rawIri.substring(p.uri.length);
        return `<span class="text-slate-400 opacity-70">${p.prefix}</span><span class="font-semibold text-cyan-700 dark:text-cyan-400">${escapeHtml(term)}</span>`;
      }
    }
    return `<span class="text-sky-600 dark:text-sky-400">${escapeHtml(rawIri)}</span>`;
  };

  const formatTerm = (term) => {
    if (!term) return '';

    if (term.startsWith('<') && term.endsWith('>')) {
      const raw = term.slice(1, -1);
      if (raw === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') {
        return '<span class="text-indigo-600 dark:text-indigo-400 font-bold font-mono">a (rdf:type)</span>';
      }
      return `&lt;${shortenIri(raw)}&gt;`;
    }

    if (term.startsWith('_:')) {
      const label = bnodeLabels[term]
        ? ` <span class="text-[10px] font-normal text-amber-700/80 dark:text-amber-200/70">(${escapeHtml(bnodeLabels[term])})</span>`
        : '';
      return `<span class="text-amber-600 dark:text-amber-300 font-bold">${escapeHtml(term)}</span>${label}`;
    }

    if (term.startsWith('"')) {
      const literalRegex = /^(".*")(?:\^\^<([^>]+)>|(@[a-zA-Z-]+))?$/s;
      const litMatch = term.match(literalRegex);

      if (litMatch) {
        const [, val, datatype, lang] = litMatch;
        let out = `<span class="text-emerald-700 dark:text-emerald-400">${escapeHtml(val)}</span>`;
        if (datatype) {
          out += `<span class="text-pink-600 dark:text-pink-400 text-[10px]">^^&lt;${shortenIri(datatype)}&gt;</span>`;
        } else if (lang) {
          out += `<span class="text-amber-600 dark:text-amber-300 text-[10px]">${escapeHtml(lang)}</span>`;
        }
        return out;
      }
      return `<span class="text-emerald-700 dark:text-emerald-400">${escapeHtml(term)}</span>`;
    }

    return escapeHtml(term);
  };

  const statementRegex =
    /^\s*(<[^>]+>|_:\S+)\s+(<[^>]+>)\s+("(?:\\[\s\S]|[^"\\])*"(?:\^\^<[^>]+>|@[a-zA-Z-]+)?|<[^>]+>|_:\S+)(?:\s+(<[^>]+>|_:\S+))?\s*\.\s*$/;

  return lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        return `<span class="text-slate-400 dark:text-slate-500 italic">${escapeHtml(trimmed)}</span>`;
      }
      const match = trimmed.match(statementRegex);
      if (!match) return escapeHtml(trimmed);

      const [, subj, pred, obj, graph] = match;
      let result = `${formatTerm(subj)} ${formatTerm(pred)} ${formatTerm(obj)}`;
      if (graph) result += ` ${formatTerm(graph)}`;
      result += ` <span class="text-slate-400 dark:text-slate-600 font-bold">.</span>`;
      return result;
    })
    .join('\n');
}