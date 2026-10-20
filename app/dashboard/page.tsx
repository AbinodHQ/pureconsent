"use client";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, ArrowUpRight, Check, ChevronDown, Code2, Copy, Download, FileCheck2, Globe2, LayoutDashboard, Leaf, LogOut, Plus, Settings2, ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/brand";
import type { Receipt, Site, SiteInput } from "@/lib/domain";
type Overview = { sites: Site[]; receipts: Receipt[]; storage: string; local: boolean };
type Tab = "Overview" | "Websites" | "Banner studio" | "Consent records";
const defaults: SiteInput = {
  name: "", origin: "", privacyUrl: "", language: "auto", accent: "#4F46E5", retentionDays: 180,
  analytics: "We use analytics to understand visits and improve this website. See our privacy notice for providers and retention.",
  marketing: "We use marketing services to show relevant advertising. See our privacy notice for providers and retention."
};
async function api(url: string, method = "GET", body?: unknown) {
  const response = await fetch(`/api/${url}`, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.error || "Request failed."), { status: response.status });
  return data;
}
function snippet(site: Site, origin: string) {
  return `<script src="${origin}/consent.js"\n  data-site="${site.id}" defer></script>`;
}
export default function Dashboard() {
  const [tab, setTab] = useState<Tab>("Overview");
  const [data, setData] = useState<Overview | null>(null);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [locked, setLocked] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<SiteInput>(defaults);
  const [editing, setEditing] = useState<string | null>(null);
  const [appOrigin, setAppOrigin] = useState("");
  const [filter, setFilter] = useState("all");
  const [previewLanguage, setPreviewLanguage] = useState("en");
  const [previewKey, setPreviewKey] = useState(0);
  const site = data?.sites.find(s => s.id === selected) || data?.sites[0];
  async function load() {
    try {
      const result: Overview = await api("overview");
      setData(result); setLocked(false); setError("");
    } catch (e) { if ((e as { status?: number }).status === 401) setLocked(true); else setError((e as Error).message); }
  }
  useEffect(() => { setAppOrigin(location.origin); void load(); }, []);
  useEffect(() => {
    if (!modal) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) setModal(false);
      if (event.key === "Tab") {
        const items = [...document.querySelectorAll<HTMLElement>('.modal button:not(:disabled), .modal input, .modal select, .modal textarea')];
        if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1)?.focus(); }
        else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0]?.focus(); }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [modal, busy]);
  function add() { setEditing(null); setForm(defaults); setError(""); setModal(true); }
  function edit(target: Site) { setEditing(target.id); setForm({ ...target }); setError(""); setModal(true); }
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const saved: Site = await api(editing ? `sites/${editing}` : "sites", editing ? "PATCH" : "POST", form);
      await load(); setSelected(saved.id); setModal(false); setTab("Banner studio");
      setNotice(editing ? "Settings saved. Visitors will be asked again for this new notice version." : "Website added. Your installation snippet is ready.");
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); setNotice("Copied to clipboard."); }
    catch { setError("Clipboard access is unavailable. Select and copy the code directly."); }
  }
  async function login(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { await api("auth/login", "POST", { password }); setPassword(""); await load(); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  const receipts = data?.receipts || [];
  const rows = receipts.filter(r => filter === "all" || r.siteId === filter);
  const accepted = receipts.filter(r => r.choices.analytics || r.choices.marketing).length;
  const preview = new URLSearchParams({ name: site?.name || "Your website", language: previewLanguage, accent: site?.accent || "#4F46E5", analytics: site?.analytics || defaults.analytics, marketing: site?.marketing || defaults.marketing });
  if (locked) return <div className="login-page"><Brand /><form onSubmit={login} className="login-card"><span className="eyebrow">ABINOD WORKSPACE</span><h1>Welcome back.</h1><p>Sign in with your configured operator password.</p><label>Password<input autoFocus required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></label>{error && <p role="alert" className="error">{error}</p>}<button disabled={busy} className="button dark">{busy ? "Signing in…" : "Open workspace"}<ArrowRight size={16} /></button><Link href="/docs#setup">Setup instructions</Link></form></div>;
  return <div className="app-shell">
    <aside className="sidebar"><Brand /><div className="workspace-pill"><span className="avatar">A</span><div>Abinod workspace<small>PureConsent · early access</small></div><ChevronDown size={14} /></div>
      <span className="nav-label">WORKSPACE</span><nav>{([
        ["Overview", LayoutDashboard], ["Websites", Globe2], ["Banner studio", SlidersHorizontal], ["Consent records", FileCheck2]
      ] as const).map(([label, Icon]) => <button key={label} className={tab === label ? "active" : ""} onClick={() => { setTab(label); setNotice(""); }}><Icon size={18} strokeWidth={1.6} />{label}{label === "Websites" && <span className="nav-count">{data?.sites.length || 0}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="care-card"><Leaf size={24} strokeWidth={1.4} /><strong>A little less tracking.<br />A little more trust.</strong><p>Good privacy starts with a real choice.</p><Link href="/docs">Read the integration guide <ArrowUpRight size={14} /></Link></div><div className="powered"><span className="ambiten-mark">a</span><div>Powered by <strong>Ambiten</strong><small>An Abinod product</small></div></div></div>
    </aside>
    <div className="main-shell"><header className="app-header"><span>Workspace <span className="slash">/</span> <strong>{tab}</strong></span><div><span className="environment"><span className="live-dot" />{data?.storage === "ambiten" ? "Ambiten connected" : "Local development"}</span><Link href="/docs" className="header-guide">Help & docs <ArrowUpRight size={13} /></Link>{data && !data.local && <button aria-label="Sign out" className="icon-button" onClick={async () => { await api("auth/logout", "POST"); setLocked(true); }}><LogOut size={17} /></button>}<span className="avatar small-avatar">A</span></div></header>
      <div className="workspace-content">
        <div className="page-heading"><div><span className="eyebrow">PRIVACY, WITH PURPOSE</span><h1>{tab === "Overview" ? "A clearer view of consent." : tab === "Websites" ? "Your corner of the web." : tab === "Banner studio" ? "Make it feel like you." : "Every choice, accounted for."}</h1><p>{tab === "Overview" ? "Your websites, visitor choices, and next steps. All in one quiet place." : tab === "Websites" ? "Manage each website’s notice and installation." : tab === "Banner studio" ? "A considered first impression. Preview your banner before installing." : "Review and export the latest 1,000 retained consent events."}</p></div><button className="button dark" onClick={add}><Plus size={16} />Add website</button></div>
        {!modal && error && <div className="alert error" role="alert">{error}<button onClick={load}>Retry</button></div>}
        {notice && <div className="alert success" role="status"><Check size={16} />{notice}<button aria-label="Dismiss message" onClick={() => setNotice("")}><X size={14} /></button></div>}
        {!data && !error && <div className="panel loading">Opening your workspace…</div>}
        {data && <>
          {tab === "Overview" && <>
            <div className="welcome-banner"><div className="welcome-icon"><Leaf size={32} strokeWidth={1.2} /></div><div><span className="eyebrow">WELCOME TO PURECONSENT</span><h2>Small banner. Better beginnings.</h2><p>{data.sites.length ? "Your workspace is ready. Check your installation before bringing visitors on board." : "Let’s give your first website a privacy experience worth trusting."}</p></div><button className="button light" onClick={data.sites.length ? () => setTab("Banner studio") : add}>{data.sites.length ? "Open banner studio" : "Set up your website"}<ArrowRight size={16} /></button><div className="banner-leaf">◒</div></div>
            <div className="stats"><Stat label="Websites configured" value={String(data.sites.length).padStart(2, "0")} note="Ready for your installation" icon={<Globe2 size={19} />} /><Stat label="Consent records" value={String(receipts.length).padStart(2, "0")} note="Latest retained events · up to 1,000" icon={<FileCheck2 size={19} />} /><Stat label="Optional services allowed" value={receipts.length ? `${Math.round(accepted / receipts.length * 100)}%` : "—"} note="Share of recorded events" icon={<ShieldCheck size={19} />} /></div>
            <div className="overview-grid"><section className="panel"><div className="panel-heading"><div><h2>Your websites</h2><p>A home for every privacy notice.</p></div><button className="text-link" onClick={() => setTab("Websites")}>View all <ArrowRight size={15} /></button></div>{data.sites.length ? data.sites.slice(0, 4).map(s => <button className="site-row" key={s.id} onClick={() => { setSelected(s.id); setTab("Banner studio"); }}><span className="site-icon"><Globe2 size={21} /></span><span><strong>{s.name}</strong><small>{s.origin}</small></span><span className="badge">Configured · v{s.version}</span><ArrowUpRight size={16} /></button>) : <div className="empty"><div className="empty-art"><Globe2 size={32} strokeWidth={1} /><span>+</span></div><h3>Your first website belongs here.</h3><p>Add a domain to create your banner<br />and get your installation snippet.</p><button className="button outline" onClick={add}><Plus size={15} />Add your first website</button></div>}</section>
              <section className="panel checklist"><span className="eyebrow">YOUR QUICK START</span><h2>From setup to a real choice.</h2>{[
                ["Add your website", "Set your origin and privacy notice.", data.sites.length > 0],
                ["Make the banner yours", "Choose a language and category details.", data.sites.length > 0],
                ["Install & verify", "Tag optional scripts and test each choice.", receipts.length > 0]
              ].map(([title, subtitle, done], index) => <div className="check-step" key={String(title)}><span className={done ? "done" : ""}>{done ? <Check size={13} /> : index + 1}</span><div><strong>{title}</strong><p>{subtitle}</p></div></div>)}<Link href="/docs" className="text-link">Follow the installation guide <ArrowUpRight size={15} /></Link><small className="muted">Checklist reflects setup activity, not a compliance certification.</small></section></div>
            <div className="privacy-strip"><ShieldCheck size={21} /><div><strong>Collect the choice. Respect the person.</strong><span>Consent records contain no IP addresses, user agents, or browsing histories.</span></div><Link href="/privacy">Our approach <ArrowUpRight size={14} /></Link></div>
          </>}
          {tab === "Websites" && <section className="panel"><div className="panel-heading"><div><h2>Website directory</h2><p>Origins are matched exactly, including subdomains and ports.</p></div><span className="badge">{data.sites.length} websites</span></div>{!data.sites.length ? <div className="empty"><Globe2 size={32} /><h3>Start with one website.</h3><p>Your settings and records will appear here.</p><button className="button dark" onClick={add}>Add website <Plus size={16} /></button></div> : data.sites.map(s => <div className="site-row" key={s.id}><span className="site-icon"><Globe2 size={22} /></span><span><strong>{s.name}</strong><small>{s.origin}</small></span><span className="badge">Version {s.version}</span><button className="button outline compact" onClick={() => { setSelected(s.id); setTab("Banner studio"); }}>Install</button><button className="icon-button" aria-label={`Edit ${s.name}`} onClick={() => edit(s)}><Settings2 size={17} /></button></div>)}</section>}
          {tab === "Banner studio" && <><div className="studio-toolbar"><label>Website<select value={site?.id || ""} onChange={e => setSelected(e.target.value)}>{!site && <option value="">Example preview</option>}{data.sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><div className="segmented"><button className={previewLanguage === "en" ? "selected" : ""} onClick={() => setPreviewLanguage("en")}>English</button><button className={previewLanguage === "de" ? "selected" : ""} onClick={() => setPreviewLanguage("de")}>Deutsch</button></div><button className="button outline compact" onClick={() => setPreviewKey(v => v + 1)}>Reset preview</button>{site && <button className="button outline compact" onClick={() => edit(site)}><Settings2 size={15} />Edit settings</button>}</div>
            <div className="studio-grid"><section className="studio-preview"><div className="browser-top"><span /><span /><span /><small>{site?.origin || "YOUR WEBSITE"}</small></div><iframe key={`${previewKey}-${preview.toString()}`} title="Interactive banner preview" src={`/demo.html?${preview}`} /><div className="preview-caption">Interactive preview · no consent records are sent</div></section><div className="studio-details"><section className="panel"><span className="eyebrow">THE DETAILS</span><h2>Thoughtful by default.</h2><dl><dt>Appearance</dt><dd><i style={{ background: site?.accent || "#4F46E5" }} />{site?.accent || "#4F46E5"}</dd><dt>Visitor language</dt><dd>{site?.language === "auto" ? "Browser language · EN / DE" : site?.language?.toUpperCase() || "English"}</dd><dt>Optional services</dt><dd>Off until consent</dd><dt>Record retention</dt><dd>{site?.retentionDays || 180} days</dd><dt>Notice version</dt><dd>{site ? `v${site.version}` : "Preview"}</dd></dl></section><section className="panel install-panel"><Code2 size={23} /><h2>Your one-line introduction.</h2><p>Place this in the page head, then tag your optional scripts using the integration guide.</p>{site ? <><pre><code>{snippet(site, appOrigin)}</code></pre><button className="button dark full" onClick={() => copy(snippet(site, appOrigin))}><Copy size={15} />Copy installation snippet</button></> : <button className="button dark full" onClick={add}>Add a website to get your code</button>}<Link href="/docs">See script blocking & withdrawal <ArrowUpRight size={14} /></Link></section></div></div></>}
          {tab === "Consent records" && <section className="panel"><div className="panel-heading"><div><h2>Consent ledger</h2><p>Append-only events with the notice version presented.</p></div><div className="record-tools"><select aria-label="Filter records by website" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All websites</option>{data.sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select><button className="button outline compact" onClick={load}>Refresh</button><a className="button dark compact" href={`/api/receipts?format=csv${filter === "all" ? "" : `&siteId=${filter}`}`}><Download size={14} />Export CSV</a></div></div>{rows.length ? <div className="table-scroll"><table><thead><tr><th>Website / event</th><th>Choice</th><th>Analytics</th><th>Marketing</th><th>Notice</th><th>Received</th></tr></thead><tbody>{rows.map(r => <tr key={r.id}><td><strong>{data.sites.find(s => s.id === r.siteId)?.name || r.siteId}</strong><small>{r.id.slice(0, 8)}</small></td><td><span className="badge">{r.action}</span></td><td>{r.choices.analytics ? "Allowed" : "Off"}</td><td>{r.choices.marketing ? "Allowed" : "Off"}</td><td>v{r.version} · {r.language.toUpperCase()}</td><td>{new Date(r.createdAt).toLocaleString()}</td></tr>)}</tbody></table></div> : <div className="empty"><FileCheck2 size={34} strokeWidth={1.2} /><h3>A clean slate.</h3><p>Real visitor choices will appear after installation.<br />Preview interactions don’t create records.</p><Link href="/docs" className="button outline">View installation guide <ArrowUpRight size={15} /></Link></div>}<div className="table-note">These are browser-submitted events, not independently verified identities. Retention is set per website.</div></section>}
        </>}
        <div className="workspace-footer"><span>PureConsent <span className="brand-dot">/</span> Built with intention by Abinod</span><Link href="/privacy">Privacy & storage <ArrowUpRight size={12} /></Link></div>
      </div>
    </div>
    {modal && <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget && !busy) setModal(false); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="form-title"><div className="modal-heading"><div><span className="eyebrow">A GOOD PLACE TO START</span><h2 id="form-title">{editing ? "Refine your website." : "Meet your next website."}</h2></div><button disabled={busy} aria-label="Close" className="icon-button" onClick={() => setModal(false)}><X size={20} /></button></div><form onSubmit={save}>
      <div className="form-grid"><label className="wide">Website name<input autoFocus required minLength={2} maxLength={80} placeholder="Abinod" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label><label className="wide">Website origin<input required type="url" placeholder="https://example.com" value={form.origin} onChange={e => setForm({ ...form, origin: e.target.value })} /><small>Exact origin. HTTPS required except localhost.</small></label><label className="wide">Privacy notice URL<input required type="url" placeholder="https://example.com/privacy" value={form.privacyUrl} onChange={e => setForm({ ...form, privacyUrl: e.target.value })} /></label><label>Banner language<select value={form.language} onChange={e => setForm({ ...form, language: e.target.value as SiteInput["language"] })}><option value="auto">Browser language (EN / DE)</option><option value="en">English</option><option value="de">Deutsch</option></select></label><label>Record retention<select value={form.retentionDays} onChange={e => setForm({ ...form, retentionDays: Number(e.target.value) })}><option value={30}>30 days</option><option value={90}>90 days</option><option value={180}>180 days</option><option value={365}>365 days</option></select></label><label className="wide color-label">Brand accent<input type="color" value={form.accent} onChange={e => setForm({ ...form, accent: e.target.value })} /><span>{form.accent}</span></label><label className="wide">Analytics purpose & providers<textarea required minLength={5} maxLength={500} rows={2} value={form.analytics} onChange={e => setForm({ ...form, analytics: e.target.value })} /></label><label className="wide">Marketing purpose & providers<textarea required minLength={5} maxLength={500} rows={2} value={form.marketing} onChange={e => setForm({ ...form, marketing: e.target.value })} /><small>Write these descriptions in the language of your visitors. Custom descriptions are not automatically translated.</small></label></div>
      {editing && <p className="form-hint">Saving creates a new notice version and asks visitors to choose again on their next page load. Existing records keep their original retention period.</p>}{error && <div role="alert" className="alert error">{error}</div>}<div className="form-actions"><button type="button" disabled={busy} className="button outline" onClick={() => setModal(false)}>Cancel</button><button disabled={busy} className="button dark">{busy ? "Saving…" : editing ? "Save new version" : "Create website"}<ArrowRight size={16} /></button></div>
    </form></section></div>}
  </div>;
}
function Stat({ label, value, note, icon }: { label: string; value: string; note: string; icon: React.ReactNode }) {
  return <section className="stat"><div><span>{label}</span>{icon}</div><strong>{value}</strong><small>{note}</small></section>;
}
