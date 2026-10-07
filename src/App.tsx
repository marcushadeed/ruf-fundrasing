import { useState, type ReactNode } from 'react';
import { readConfig, saveSheetId, type AppConfig } from './data/source';
import { Dashboard } from './ui/Dashboard';
import { useWorkbook } from './ui/useWorkbook';

export function App() {
  const [config, setConfig] = useState<AppConfig>(readConfig);

  if (!config.demo && !config.clientId) {
    return (
      <Setup>
        <p>
          This build has no Google client ID. Set <code>VITE_GOOGLE_CLIENT_ID</code> (see <code>docs/SETUP.md</code>)
          and rebuild.
        </p>
      </Setup>
    );
  }
  if (!config.demo && !config.sheetId) {
    return (
      <Setup>
        <SheetPicker onPick={(id) => setConfig({ ...config, sheetId: id })} />
      </Setup>
    );
  }
  return <Loaded config={config} onChangeSheet={() => setConfig({ ...config, sheetId: saveSheetId('') })} />;
}

function Loaded({ config, onChangeSheet }: { config: AppConfig; onChangeSheet: () => void }) {
  const state = useWorkbook(config);
  const { workbook } = state;

  return (
    <>
      <header className="top">
        <h1>RUF Support Dashboard</h1>
        <span className="muted">{config.demo ? <span className="badge">DEMO DATA</span> : workbook?.title}</span>
        <span className="spacer" />
        {state.loadedAt && <span className="muted small">updated {state.loadedAt.toLocaleTimeString()}</span>}
        {!state.needsSignIn && (
          <button type="button" onClick={() => void state.refresh()} disabled={state.loading}>
            {state.loading ? 'Loading…' : 'Refresh'}
          </button>
        )}
        {!config.demo && !state.needsSignIn && (
          <button type="button" onClick={state.signOut}>
            Sign out
          </button>
        )}
        {!config.demo && (
          <button type="button" className="link" onClick={onChangeSheet}>
            change sheet
          </button>
        )}
      </header>

      {state.error && <p className="error">{state.error}</p>}

      {state.needsSignIn && (
        <div className="center">
          <p>Sign in with a Google account that has access to the funding Sheet.</p>
          <button type="button" className="primary" onClick={() => void state.signIn()}>
            Sign in with Google
          </button>
          <p className="muted small">Read-only access. Nothing is ever written to your Sheet.</p>
        </div>
      )}

      {!state.needsSignIn && !workbook && state.loading && <p className="center">Loading Sheet…</p>}

      {workbook && !state.needsSignIn && (
        <Dashboard workbook={workbook} scope={config.demo ? 'demo' : config.sheetId} />
      )}
    </>
  );
}

function Setup({ children }: { children: ReactNode }) {
  return (
    <div className="center setup">
      <h1>RUF Support Dashboard</h1>
      {children}
      <p>
        Or <a href="?demo">explore with demo data</a>.
      </p>
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
      <p>Paste the link to the funding Google Sheet:</p>
      <input
        size={60}
        placeholder="https://docs.google.com/spreadsheets/d/…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />{' '}
      <button type="submit" className="primary">
        Open
      </button>
    </form>
  );
}
