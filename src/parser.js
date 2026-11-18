/* Copyright (c) 2026 Daniel Pett / MicroPasts
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

export const NODE_COLORS = {
  HumanMadeObject: '#f59e0b',
  Production: '#a855f7',
  Encounter: '#9333ea',
  Activity: '#8b5cf6',
  Event: '#7c3aed',
  Creation: '#9333ea',
  Modification: '#8b5cf6',
  Period: '#6d28d9',
  TimeSpan: '#818cf8',
  Person: '#3b82f6',
  Group: '#0284c7',
  Place: '#10b981',
  Type: '#ec4899',
  Material: '#fb923c',
  Dimension: '#06b6d4',
  MeasurementUnit: '#22d3ee',
  Identifier: '#8b5cf6',
  Name: '#6366f1',
  LinguisticObject: '#14b8a6',
  VisualItem: '#f43f5e',
  DigitalObject: '#fb7185',
  InformationObject: '#38bdf8',
  Set: '#eab308',
};

export function getNodeColor(type) {
  return NODE_COLORS[type] || '#94a3b8';
}

export function isEventType(type) {
  return [
    'Event',
    'Activity',
    'Production',
    'Encounter',
    'Move',
    'TransferOfTitle',
    'Modification',
    'Creation',
    'Period',
  ].includes(type);
}

export function getMapUrl(wktPoint) {
  if (!wktPoint || !wktPoint.includes('POINT')) return null;
  const match = wktPoint.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
  if (!match) return null;
  const [, lon, lat] = match;
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=14/${lat}/${lon}`;
}

function extractImageUrl(item) {
  if (!item || typeof item !== 'object') return null;

  if (item.access_point) {
    const aps = Array.isArray(item.access_point) ? item.access_point : [item.access_point];
    for (const ap of aps) {
      if (ap?.id && typeof ap.id === 'string' && ap.id.match(/\.(jpeg|jpg|gif|png|webp|svg)(\?.*)?$/i)) {
        return ap.id;
      }
      if (ap?.format?.startsWith('image/') && ap.id) {
        return ap.id;
      }
    }
  }

  if (item.digitally_shown_by) {
    const dsb = Array.isArray(item.digitally_shown_by) ? item.digitally_shown_by : [item.digitally_shown_by];
    for (const entry of dsb) {
      const found = extractImageUrl(entry);
      if (found) return found;
    }
  }

  if (item.id && typeof item.id === 'string' && item.id.match(/\.(jpeg|jpg|gif|png|webp|svg)(\?.*)?$/i)) {
    return item.id;
  }

  return null;
}

function extractTimeSpan(item) {
  if (!item || typeof item !== 'object') return null;
  const ts = item.timespan || (item.type === 'TimeSpan' ? item : null);
  if (!ts) return null;

  return {
    label: ts._label || ts.label || null,
    begin: ts.begin_of_the_begin || ts.begin || null,
    end: ts.end_of_the_end || ts.end || null,
    duration: ts.duration?.value || null,
  };
}

export function parseLinkedArtGraph(root) {
  const nodes = [];
  const links = [];
  const seenNodes = new Map();

  const addOrUpdateNode = (
    id,
    type,
    label,
    content = null,
    value = null,
    defined_by = null,
    assignmentProvenance = null,
    extra = {}
  ) => {
    if (seenNodes.has(id)) {
      const existing = seenNodes.get(id);
      if (!existing.defined_by && defined_by) existing.defined_by = defined_by;
      if (!existing.content && content) existing.content = content;
      if (!existing.value && value) existing.value = value;
      if (!existing.assignmentProvenance && assignmentProvenance) existing.assignmentProvenance = assignmentProvenance;
      if (!existing.imageUrl && extra.imageUrl) existing.imageUrl = extra.imageUrl;
      if (!existing.isIiif && extra.isIiif) existing.isIiif = extra.isIiif;
      if (!existing.manifestUrl && extra.manifestUrl) existing.manifestUrl = extra.manifestUrl;
      if (!existing.format && extra.format) existing.format = extra.format;
      if (!existing.timeSpan && extra.timeSpan) existing.timeSpan = extra.timeSpan;
      if (extra.actors?.length) {
        existing.actors = Array.from(new Set([...(existing.actors || []), ...extra.actors]));
      }
      if (extra.places?.length) {
        existing.places = Array.from(new Set([...(existing.places || []), ...extra.places]));
      }
      return;
    }

    const nodeObj = {
      id,
      type: type || 'Resource',
      label: label || id,
      content,
      value,
      defined_by,
      assignmentProvenance,
      imageUrl: extra.imageUrl || null,
      isIiif: extra.isIiif || false,
      manifestUrl: extra.manifestUrl || null,
      format: extra.format || null,
      timeSpan: extra.timeSpan || null,
      actors: extra.actors || [],
      places: extra.places || [],
    };

    seenNodes.set(id, nodeObj);
    nodes.push(nodeObj);
  };

  const traverse = (parent, parentId, inheritedManifestUrl = null) => {
    if (!parent || typeof parent !== 'object') return;

    for (const [key, value] of Object.entries(parent)) {
      if (key === '@context') continue;
      const items = Array.isArray(value) ? value : [value];

      items.forEach((child) => {
        if (!child || typeof child !== 'object') return;

        if (child.type === 'AttributeAssignment') {
          const target = child.assigned || child.assigned_attribute || child.assigned_property;
          const carriedOutBy = child.carried_out_by
            ? Array.isArray(child.carried_out_by)
              ? child.carried_out_by[0]
              : child.carried_out_by
            : null;

          const provenanceMeta = {
            assigned_by: carriedOutBy?._label || carriedOutBy?.label || null,
            technique: child.technique?._label || child.technique?.label || null,
            rationale: child.rationale || null,
          };

          const targetItems = Array.isArray(target) ? target : [target];
          targetItems.forEach((targetChild) => {
            if (targetChild && typeof targetChild === 'object') {
              const targetId = targetChild.id || `node_${parentId}_att_${Math.random().toString(36).substring(2, 7)}`;
              const targetType = targetChild.type || 'Type';
              const targetLabel = targetChild._label || targetChild.value || targetId;

              addOrUpdateNode(
                targetId,
                targetType,
                targetLabel,
                targetChild.content || null,
                targetChild.value || null,
                targetChild.defined_by || null,
                provenanceMeta
              );

              links.push({
                source: parentId,
                target: targetId,
                label: child.assigned_property ? child.assigned_property.replace(/_/g, ' ') : 'attributed as',
              });

              traverse(targetChild, targetId, inheritedManifestUrl);
            }
          });
          return;
        }

        let eventActors = [];
        if (child.carried_out_by) {
          const acts = Array.isArray(child.carried_out_by) ? child.carried_out_by : [child.carried_out_by];
          eventActors = acts.map((a) => a?._label || a?.label || a?.id).filter(Boolean);
        }

        let eventPlaces = [];
        if (child.took_place_at) {
          const pls = Array.isArray(child.took_place_at) ? child.took_place_at : [child.took_place_at];
          eventPlaces = pls.map((p) => p?._label || p?.label || p?.id).filter(Boolean);
        }

        const isCurrentChildManifest =
          child.type === 'DigitalObject' &&
          ((child.format && child.format.includes('iiif')) ||
            (child.id && child.id.endsWith('/manifest')) ||
            (child.conforms_to && JSON.stringify(child.conforms_to).includes('iiif')) ||
            (child.classified_as && JSON.stringify(child.classified_as).includes('300444105')));

        const currentManifestUrl = isCurrentChildManifest ? child.id : inheritedManifestUrl;
        const isIiif = isCurrentChildManifest || Boolean(currentManifestUrl);
        const imageUrl = extractImageUrl(child);
        const timeSpan = extractTimeSpan(child);

        const childId = child.id || `node_${parentId}_${key}_${Math.random().toString(36).substring(2, 7)}`;
        const childType = child.type || key;

        let childLabel = child._label;
        if (!childLabel && child.content) {
          childLabel = child.content.length > 25 ? child.content.substring(0, 22) + '...' : child.content;
        }
        if (!childLabel && child.value) childLabel = String(child.value);
        if (!childLabel && timeSpan?.label) childLabel = timeSpan.label;
        if (!childLabel) childLabel = child.type ? `${child.type}` : childId;

        addOrUpdateNode(
          childId,
          childType,
          childLabel,
          child.content || null,
          child.value || null,
          child.defined_by || null,
          null,
          {
            imageUrl,
            isIiif,
            manifestUrl: currentManifestUrl,
            format: child.format || null,
            timeSpan,
            actors: eventActors,
            places: eventPlaces,
          }
        );

        links.push({
          source: parentId,
          target: childId,
          label: key.replace(/_/g, ' '),
        });

        traverse(child, childId, currentManifestUrl);
      });
    }
  };

  const rootId = root.id || 'root_object';
  const rootType = root.type || 'HumanMadeObject';
  const rootLabel = root._label || 'Object';

  addOrUpdateNode(rootId, rootType, rootLabel, null, null, root.defined_by || null, null, {
    imageUrl: extractImageUrl(root),
    timeSpan: extractTimeSpan(root),
  });

  traverse(root, rootId);
  return { nodes, links };
}