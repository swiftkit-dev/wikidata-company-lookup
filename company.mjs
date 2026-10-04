#!/usr/bin/env node
// Company name → official website, logo, country, industry, founded, employees, tickers, socials,
// from Wikidata (CC0). No dependencies, Node 18+.
//
//   node company.mjs Stripe "Novo Nordisk" Toyota

const UA = 'wikidata-company-lookup/1.0 (+https://github.com/swiftkit-dev/wikidata-company-lookup)';
const wd = async (params) => {
    const res = await fetch(`https://www.wikidata.org/w/api.php?${new URLSearchParams({ format: 'json', maxlag: '5', ...params })}`, { headers: { 'User-Agent': UA } });
    return res.json();
};
const claims = (e, p) => (e.claims?.[p] || []).filter((c) => c.rank !== 'deprecated' && c.mainsnak?.datavalue);
const best = (e, p) => { const l = claims(e, p); return (l.find((c) => c.rank === 'preferred') || l.at(-1))?.mainsnak.datavalue.value; };
const ids = (e, p) => claims(e, p).map((c) => c.mainsnak.datavalue.value?.id).filter(Boolean);
// Never people or creative works; a company we can use has an official website (P856).
const NOT_ORG = new Set(['Q5', 'Q4167410', 'Q482994', 'Q134556', 'Q7366', 'Q11424', 'Q7725634', 'Q5398426', 'Q7889']);
const isCompany = (e) => !ids(e, 'P31').some((t) => NOT_ORG.has(t)) && !!best(e, 'P856');

// Big brands list dozens of regional social accounts. Take the "preferred" one, else the one with
// the most followers recorded (qualifier P3744), else a handle equal to the company name.
// If none of that works and there are several, return null rather than a random regional account.
const norm = (x) => String(x || '').toLowerCase().replace(/[^a-z0-9]/g, '');
function social(e, p, name) {
    const list = claims(e, p).filter((c) => typeof c.mainsnak.datavalue.value === 'string');
    const v = (c) => c.mainsnak.datavalue.value;
    if (!list.length) return null;
    const pref = list.find((c) => c.rank === 'preferred');
    if (pref) return v(pref);
    const followers = (c) => Math.max(0, ...(c.qualifiers?.P3744 || []).map((q) => Number(q.datavalue?.value?.amount) || 0));
    const top = [...list].sort((a, b) => followers(b) - followers(a))[0];
    if (followers(top) > 0) return v(top);
    if (list.length === 1) return v(list[0]);
    const n = norm(name);
    const exact = list.find((c) => norm(v(c)) === n || /^(global|official|hq|inc|corp)$/.test(norm(v(c)).slice(n.length)) && norm(v(c)).startsWith(n));
    return exact ? v(exact) : list.length <= 2 ? v(list[0]) : null;
}

async function labels(qids) {
    if (!qids.length) return {};
    const j = await wd({ action: 'wbgetentities', ids: [...new Set(qids)].slice(0, 50).join('|'), props: 'labels', languages: 'en|mul' });
    return Object.fromEntries(Object.entries(j.entities || {}).map(([id, e]) => [id, e.labels?.en?.value || e.labels?.mul?.value || null]));
}

async function lookup(name) {
    const s = await wd({ action: 'wbsearchentities', search: name, language: 'en', type: 'item', limit: '7' });
    const qids = (s.search || []).map((x) => x.id);
    if (!qids.length) return { input: name, error: 'not found' };
    const ents = (await wd({ action: 'wbgetentities', ids: qids.join('|'), props: 'claims|labels|descriptions', languages: 'en|mul' })).entities;
    const cands = qids.map((q) => ents[q]).filter((e) => e && isCompany(e));
    const exact = cands.find((e) => (e.labels?.en?.value || '').toLowerCase() === name.toLowerCase());
    const e = exact || cands[0];
    if (!e) return { input: name, error: 'no company with an official website found' };
    const L = await labels([...ids(e, 'P17'), ...ids(e, 'P452'), ...ids(e, 'P414')]);
    const logo = best(e, 'P154');
    const emp = best(e, 'P1128');
    return {
        input: name,
        name: e.labels?.en?.value || e.labels?.mul?.value,
        description: e.descriptions?.en?.value || null,
        website: best(e, 'P856'),
        logo: logo ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(logo.replace(/ /g, '_'))}` : null,
        country: ids(e, 'P17').map((q) => L[q]).filter(Boolean)[0] || null,
        industry: ids(e, 'P452').map((q) => L[q]).filter(Boolean),
        founded: best(e, 'P571')?.time ? Number(best(e, 'P571').time.slice(1, 5)) : null,
        employees: emp?.amount ? Number(emp.amount) : null,
        tickers: claims(e, 'P414').map((c) => ({ exchange: L[c.mainsnak.datavalue.value.id], ticker: c.qualifiers?.P249?.[0]?.datavalue?.value })).filter((t) => t.ticker),
        x: social(e, 'P2002', name) ? `https://x.com/${social(e, 'P2002', name)}` : null,
        linkedin: social(e, 'P4264', name) ? `https://www.linkedin.com/company/${social(e, 'P4264', name)}` : null,
        github: social(e, 'P2037', name) ? `https://github.com/${social(e, 'P2037', name)}` : null,
        wikidata: e.id,
    };
}

const names = process.argv.slice(2);
if (!names.length) { console.error('Usage: node company.mjs "Company name" [...]'); process.exitCode = 1; }
const out = [];
for (const n of names) { out.push(await lookup(n)); await new Promise((r) => setTimeout(r, 300)); } // be gentle with Wikidata
console.log(JSON.stringify(out.length === 1 ? out[0] : out, null, 2));
