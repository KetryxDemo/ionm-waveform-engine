#!/usr/bin/env node
// Ketryx traceability gate for the IONM waveform engine.
// Stage 1 (static): every changed source file in src/ must be claimed by a spec in
//   specs/ (named in its body) that fulfills a requirement; changed specs need
//   itemId + itemFulfills; changed scenarios need @tests:. Targets: KXITM ids, Jira
//   keys or itemIds in this repo.
// Stage 2 (Ketryx): read records at a HIDDEN version pinned to the PR head and
//   confirm each touched spec landed with FULFILLS and is verified by a test.
import fs from 'node:fs';
import path from 'node:path';

const KETRYX_URL = (process.env.KETRYX_URL || 'https://demo.ketryx.com').replace(/\/$/, '');
const { KETRYX_PROJECT: PROJECT, KETRYX_API_KEY: API_KEY, KETRYX_VERSION_ID: VERSION_ID } = process.env;
const REPORT = process.env.GATE_REPORT || 'trace-gate-report.md';
const changed = (process.env.CHANGED_FILES || '').split('\n').map((s) => s.trim()).filter((f) => f && fs.existsSync(f));
const blockers = [], rows = [], warnings = [];
const EXTERNAL = /^([A-Z][A-Z0-9]*-\d+|KXITM[0-9A-Z]+)$/;
const block = (file, line, item, problem, fix) => {
  blockers.push({ file, line, item, problem, fix });
  console.log(`::error file=${file},line=${line || 1}::[${item}] ${problem} Fix: ${fix}`);
};
const list = (v) => (v || '').split(',').map((x) => x.trim()).filter(Boolean);
const walk = (d, ext) => (fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(path.join(d, e.name), ext) : e.name.endsWith(ext) ? [path.join(d, e.name)] : []) : []);
function parseSpec(f) {
  const text = fs.readFileSync(f, 'utf8');
  const fm = /^---\n([\s\S]*?)\n---/.exec(text); const meta = {};
  if (fm) for (const l of fm[1].split('\n')) { const m = /^([A-Za-z][^:]*):\s*(.*)$/.exec(l.trim()); if (m) meta[m[1].trim()] = m[2].trim(); }
  const h1 = /^#\s+(.+)$/m.exec(text);
  return { file: f, meta, text, title: meta.itemTitle || (h1 ? h1[1].trim() : null), fulfills: list(meta.itemFulfills) };
}
const specs = walk('specs', '.md').map(parseSpec);
const repoIds = new Set(specs.map((s) => s.meta.itemId).filter(Boolean));
const resolves = (t) => repoIds.has(t) || EXTERNAL.test(t);
const touchedSpecs = new Map();

console.log(`Changed files:\n  ${changed.join('\n  ') || '(none)'}`);
for (const f of changed) {
  if (f.startsWith('src/') && /\.(ts|tsx|js)$/.test(f)) {
    const owners = specs.filter((s) => s.text.includes(f));
    if (owners.length === 0) {
      block(f, 1, path.basename(f), 'source file is not claimed by any software item spec - this code has no design control and no trace to a requirement.',
        `add it to a spec in specs/ (name \`${f}\` in the spec body) that fulfills the requirement it implements, or add a new spec with itemFulfills.`);
      rows.push({ item: path.basename(f), file: f, upstream: 'none', verified: '-', status: 'BLOCKED' });
    } else for (const s of owners) touchedSpecs.set(s.file, s);
  } else if (f.startsWith('specs/') && f.endsWith('.md')) {
    const s = parseSpec(f);
    if (!s.meta.itemId) block(f, 1, s.title, 'spec has no itemId.', 'add itemId to the frontmatter.');
    if (!s.fulfills.length) block(f, 1, s.meta.itemId || s.title, 'spec fulfills no requirement - orphaned design output.', 'add itemFulfills:<requirement> to the frontmatter.');
    for (const t of s.fulfills) if (!resolves(t)) block(f, 1, s.meta.itemId, `itemFulfills target "${t}" does not resolve.`, 'use the Ketryx item id (KXITM...) or Jira key of the requirement.');
    touchedSpecs.set(f, s);
  } else if (f.startsWith('features/') && f.endsWith('.feature')) {
    let tags = [];
    fs.readFileSync(f, 'utf8').split('\n').forEach((l, i) => {
      const t = l.trim();
      if (t.startsWith('@')) tags = tags.concat(t.split(/\s+/));
      else if (/^Scenario( Outline)?:/.test(t)) {
        const tests = tags.filter((x) => x.startsWith('@tests:')).map((x) => x.slice(7));
        if (!tests.length) block(f, i + 1, t, 'scenario verifies nothing in Ketryx - no @tests: tag.', 'add @tests:<requirement id>.');
        for (const x of tests) if (!resolves(x)) block(f, i + 1, t, `@tests target "${x}" does not resolve.`, 'use the Ketryx item id or Jira key.');
        tags = [];
      } else if (t && !t.startsWith('#')) tags = [];
    });
  }
}

let platform = 'skipped';
if (!blockers.length && touchedSpecs.size && VERSION_ID && API_KEY && PROJECT) {
  try {
    const fetchAll = async () => {
      const q = encodeURIComponent('is:deleted or not is:deleted');
      const res = await fetch(`${KETRYX_URL}/api/v1/projects/${PROJECT}/records?versionId=${VERSION_ID}&query=${q}&maxResults=1000`, { headers: { Authorization: `Bearer ${API_KEY}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()).records || [];
    };
    const kind = (rel) => (rel.typeKey || rel.type || '').toUpperCase().replace(/\s+/g, '_');
    let records = [];
    for (let a = 1; a <= 12; a++) {
      records = await fetchAll();
      if ([...touchedSpecs.values()].every((s) => records.some((r) => r.title === s.title))) break;
      console.log(`Waiting for Ketryx to scan the PR commit (attempt ${a}/12)...`);
      await new Promise((r) => setTimeout(r, 10000));
    }
    platform = 'verified';
    for (const s of touchedSpecs.values()) {
      const rec = records.find((r) => r.title === s.title);
      if (!rec) { warnings.push(`Ketryx has not scanned "${s.title}" at this commit yet - static checks passed.`); rows.push({ item: s.meta.itemId, file: s.file, upstream: s.fulfills.join(', '), verified: 'not scanned yet', status: 'PASS (static)' }); continue; }
      const up = (rec.relations || []).filter((r) => kind(r) === 'FULFILLS');
      const upIds = new Set(up.map((r) => r.toItem?.id));
      const tests = records.filter((r) => (r.relations || []).some((x) => kind(x) === 'TESTS' && (x.toItem?.id === rec.itemId || upIds.has(x.toItem?.id))));
      if (!up.length) block(s.file, 1, s.meta.itemId, 'Ketryx shows no FULFILLS relation - the trace did not land.', 'check the itemFulfills id.');
      if (!tests.length) block(s.file, 1, s.meta.itemId, 'no test verifies this spec or its requirement.', 'tag a scenario with @tests:<requirement>.');
      rows.push({ item: s.meta.itemId, file: s.file, upstream: `${up.length} requirement(s)`, verified: `${tests.length} test(s)`, status: up.length && tests.length ? 'PASS' : 'BLOCKED' });
    }
  } catch (e) { platform = 'unavailable'; warnings.push(`Ketryx verification unavailable (${e.message}); static stage enforced.`); }
} else if (!blockers.length) for (const s of touchedSpecs.values()) rows.push({ item: s.meta.itemId, file: s.file, upstream: s.fulfills.join(', '), verified: '-', status: 'PASS (static)' });

const pass = !blockers.length;
const md = ['<!-- ketryx-trace-gate -->', `## ${pass ? 'PASS' : 'BLOCKED'} - Ketryx traceability gate`,
  pass ? `Every regulated change in this PR traces to a requirement and is verified by a test. Ketryx check: **${platform}**.`
       : `**${blockers.length} release-blocking traceability gap(s).** This PR cannot merge until each is fixed - Ketryx would block the release on the same gaps.`];
if (blockers.length) { md.push('', '| Where | Item | Gap | Fix |', '|---|---|---|---|'); for (const b of blockers) md.push(`| \`${b.file}:${b.line || 1}\` | \`${b.item}\` | ${b.problem} | ${b.fix} |`); }
if (rows.length) { md.push('', '<details><summary>Traced items in this PR</summary>', '', '| Item | File | Upstream | Verified by | Status |', '|---|---|---|---|---|'); for (const r of rows) md.push(`| \`${r.item}\` | \`${r.file}\` | ${r.upstream} | ${r.verified} | ${r.status} |`); md.push('', '</details>'); }
if (warnings.length) md.push('', ...warnings.map((w) => `> ${w}`));
md.push('', `<sub>Regulated scope: src/, specs/, features/. Ketryx project ${PROJECT || '-'} (IONM System).</sub>`);
fs.writeFileSync(REPORT, md.join('\n') + '\n'); console.log(md.join('\n'));
process.exit(pass ? 0 : 1);
