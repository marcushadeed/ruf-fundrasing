import { useRef, useState, type ReactNode } from 'react';
import { readConfig, saveSheetId, type AppConfig } from './data/source';
import { Dashboard } from './ui/Dashboard';
import { MoreIcon, RefreshIcon } from './ui/icons';
import { PAGES, usePage } from './ui/usePage';
import { useWorkbook } from './ui/useWorkbook';

export function App() {
  const [config, setConfig] = useState<AppConfig>(readConfig);

  if (!config.demo && !config.clientId) {
    return (
      <Gate title="Almost there">
        <p>
          This build has no Google client ID. Set <code>VITE_GOOGLE_CLIENT_ID</code> (see <code>docs/SETUP.md</code>)
          and rebuild.
        </p>
      </Gate>
    );
  }
  if (!config.demo && !config.sheetId) {
    return (
      <Gate title="Connect your funding Sheet">
        <SheetPicker onPick={(id) => setConfig({ ...config, sheetId: id })} />
      </Gate>
    );
  }
  return <Loaded config={config} onChangeSheet={() => setConfig({ ...config, sheetId: saveSheetId('') })} />;
}

function Loaded({ config, onChangeSheet }: { config: AppConfig; onChangeSheet: () => void }) {
  const state = useWorkbook(config);
  const { workbook } = state;
  const page = usePage();
  const ready = !!workbook && !state.needsSignIn;

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="#/overview">
            <span className="brand-mark" aria-hidden />
            RUF Support
          </a>

          {ready ? (
            <nav className="nav-pill" aria-label="Pages">
              {PAGES.map((p) => (
                <a key={p.id} href={`#/${p.id}`} aria-current={p.id === page ? 'page' : undefined}>
                  {p.label}
                </a>
              ))}
            </nav>
          ) : (
            <span />
          )}

          <div className="topbar-actions">
            {config.demo && <span className="tag tag-accent">Demo data</span>}
            {state.loadedAt && (
              <span className="updated">
                Updated {state.loadedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </span>
            )}
            {!state.needsSignIn && (
              <button
                type="button"
                className={`icon-btn ${state.loading ? 'spin' : ''}`}
                onClick={() => void state.refresh()}
                disabled={state.loading}
                aria-label="Refresh from Sheet"
                title="Refresh from Sheet"
              >
                <RefreshIcon />
              </button>
            )}
            {!config.demo && (
              <AccountMenu
                title={workbook?.title}
                onChangeSheet={onChangeSheet}
                onSignOut={state.needsSignIn ? undefined : state.signOut}
              />
            )}
          </div>
        </div>
      </header>

      {state.error && <p className="notice notice-error">{state.error}</p>}

      {state.needsSignIn && (
        <div className="gate" style={{ minHeight: '70vh' }}>
          <div className="gate-card">
            <p className="eyebrow">Private dashboard</p>
            <h1>Sign in to see your support raising</h1>
            <p>Use a Google account that has access to the funding Sheet.</p>
            <div>
              <button type="button" className="btn btn-primary" onClick={() => void state.signIn()}>
                Sign in with Google
              </button>
            </div>
            <p className="gate-foot">Read-only access. Nothing is ever written to your Sheet.</p>
          </div>
        </div>
      )}

      {!state.needsSignIn && !workbook && state.loading && <p className="loading">Loading your Sheet…</p>}

      {ready && workbook && <Dashboard workbook={workbook} page={page} scope={config.demo ? 'demo' : config.sheetId} />}
    </>
  );
}

function AccountMenu(props: { title?: string; onChangeSheet: () => void; onSignOut?: () => void }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const close = () => ref.current?.removeAttribute('open');
  return (
    <details className="menu" ref={ref}>
      <summary className="icon-btn" aria-label="Account and Sheet" title="Account and Sheet">
        <MoreIcon />
      </summary>
      <div className="menu-panel">
        {props.title && <div className="menu-meta">Reading “{props.title}”</div>}
        <button
          type="button"
          onClick={() => {
            close();
            props.onChangeSheet();
          }}
        >
          Use a different Sheet
        </button>
        {props.onSignOut && (
          <button
            type="button"
            onClick={() => {
              close();
              props.onSignOut?.();
            }}
          >
            Sign out
          </button>
        )}
      </div>
    </details>
  );
}

function Gate({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="gate">
      <div className="gate-card">
        <p className="eyebrow">
          <span className="brand-mark" style={{ display: 'inline-block', marginRight: 8 }} aria-hidden />
          RUF Support
        </p>
        <h1>{title}</h1>
        {children}
        <p className="gate-foot">
          Or <a href="?demo">explore with demo data</a>.
        </p>
      </div>
    </div>
  );
}

function SheetPicker({ onPick }: { onPick: (id: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const id = saveSheetId(value);
        if (id) onPick(id);
      }}
    >
      <label htmlFor="sheet-url">Paste the link to the funding Google Sheet.</label>
      <input
        id="sheet-url"
        placeholder="https://docs.google.com/spreadsheets/d/…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <div>
        <button type="submit" className="btn btn-primary">
          Open dashboard
        </button>
      </div>
    </form>
  );
}
