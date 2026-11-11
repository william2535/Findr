import OpenFindr from './open-findr';
import {APP_VERSION,APK_VERSION} from '../public/app/version.mjs';
import devices from '../public/app/data/devices.json';
import devicePacks from '../public/app/data/device-packs.json';
import panels from '../public/app/data/panels.json';
import panelPacks from '../public/app/data/packs.json';

const apkUrl = '/releases/FINDR-' + APK_VERSION + '.apk';

function Arrow({download = false}:{download?:boolean}) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={download ? 'M12 3v12m-5-5 5 5 5-5M5 17v4h14v-4' : 'M4 12h16m-6-6 6 6-6 6'} />
  </svg>;
}

function FeatureIcon({kind}:{kind:'panels'|'faults'|'practice'}) {
  const paths = {
    panels: 'M4 3h16v18H4zM7 7h10v5H7zM7 16h1m3 0h1m3 0h1',
    faults: 'M5 4h8v6H5zM9 10v4m0 0H4v6h5m0-6h10v6h-5M4 17h5m5 0h5',
    practice: 'M5 2h14v20H5zM8 6h8v4H8zM8 14h.1m3.9 0h.1m3.9 0h.1M8 18h.1m3.9 0h.1m3.9 0h.1',
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[kind]} /></svg>;
}

export default function Page() {
  return <div className="release-page">
    <a className="release-skip" href="#release-main">Skip to FINDR release</a>
    <header className="release-header">
      <a href="/" className="release-brand" aria-label="FINDR release home">
        <img src="/app/icons/icon-512.png" width="42" height="42" alt="" />
        <span aria-hidden="true">findr</span>
      </a>
      <nav aria-label="Release navigation">
        <a href="#updates">What’s new</a>
        <a href="#install">Install</a>
        <OpenFindr className="release-nav-open">Open FINDR <Arrow /></OpenFindr>
      </nav>
    </header>

    <main id="release-main">
      <section className="release-hero" aria-labelledby="release-title">
        <div className="release-hero-copy">
          <div className="release-kicker"><span className="release-status-dot" /> PUBLIC BETA <span className="release-version">{APP_VERSION}</span></div>
          <h1 id="release-title" className="release-hero-wordmark" aria-label="FINDR">findr</h1>
          <h2>Find the manual.<br />Follow the evidence.</h2>
          <p>A free, open-source field kit for fire and security engineers. Panels, manuals and a little less messing about on site.</p>
          <div className="release-actions">
            <OpenFindr className="release-button release-button-solid">Open FINDR <Arrow /></OpenFindr>
            <OpenFindr destination="#helpers/new" className="release-button release-button-outline">Make a helper <Arrow /></OpenFindr>
          </div>
          <div className="release-quick-links"><OpenFindr destination="#downloads/all" className="release-device-link">Find a manual <Arrow /></OpenFindr><OpenFindr destination="#downloads/saved" className="release-device-link">My saved PDFs <Arrow /></OpenFindr><OpenFindr destination="#emulator" className="release-device-link">Emulators <Arrow /></OpenFindr></div>
          <p className="release-platform-note"><strong>{panelPacks.length} panel packs · {devicePacks.length} device packs · UK models first</strong><span>Powered by Manual Archives · iPhone, Android and desktop. Save PDFs online before heading to site.</span></p>
        </div>
        <div className="release-hero-art">
          <div className="release-art-label"><span>YOUR FIELD KIT</span><span>01 / FINDR</span></div>
          <img className="release-hero-icon" src="/app/icons/icon-512.png" width="512" height="512" alt="FINDR manual-search logo" fetchPriority="high" />
          <div className="release-art-caption"><span>Less guessing.</span><strong>More finding.</strong></div>
        </div>
      </section>

      <section className="release-features" aria-labelledby="release-features-title">
        <div className="release-section-head"><p className="release-eyebrow">BUILT AROUND THE JOB</p><h2 id="release-features-title">Three tools. One field kit.</h2></div>
        <div className="release-feature-grid">
          <article className="release-feature">
            <div className="release-feature-top"><FeatureIcon kind="panels" /><span>01</span></div>
            <h3>Find your panel or device.</h3>
            <p>Browse <strong>{panels.length} panel families</strong> and <strong>{devices.length} device families</strong> by picture. Check the model label and manual edition, then save the PDFs you need.</p>
            <OpenFindr destination="#devices" className="release-feature-link">Browse device packs <Arrow /></OpenFindr>
          </article>
          <article className="release-feature">
            <div className="release-feature-top"><FeatureIcon kind="faults" /><span>02</span></div>
            <h3>Keep your system close.</h3>
            <p>Make a helper for your exact system. Save its manuals, ask a question or investigate a fault, and return to the same conversation on the next visit.</p>
            <OpenFindr destination="#helpers" className="release-feature-link">Open Helpers <Arrow /></OpenFindr>
          </article>
          <article className="release-feature">
            <div className="release-feature-top"><FeatureIcon kind="practice" /><span>03</span></div>
            <h3>Know the controls.</h3>
            <p>Explore <strong>GENT Nano and Vigilon</strong> plus nine intruder keypad families. Practise with fictional panels, follow SHOW HINTS and look up documented menu routes.</p>
            <OpenFindr destination="#menus" className="release-feature-link">Explore menu maps <Arrow /></OpenFindr>
          </article>
        </div>
      </section>

      <section id="updates" className="release-updates" aria-labelledby="release-updates-title">
        <div><p className="release-eyebrow">WEB APP UPDATE / {APP_VERSION}</p><h2 id="release-updates-title">Your system.<br />Your saved helper.</h2></div>
        <ul><li><strong>Resume your model download.</strong> Incoming data, saved parts and file checks are shown separately. Interrupted transfers retry automatically; pause and resume keep completed parts.</li><li><strong>Question matrix and test log.</strong> Open a helper and choose “I want to fault find” to work through the original observation questions. Keep readings, checks and handover notes with that job, then return to your conversation.</li><li><strong>Sources when you need them.</strong> Open the Sources dropdown below a helper reply to see its manuals, page links and supporting text. Your conversation stays easy to scan; missing evidence and manual-search fallback remain clearly labelled.</li><li><strong>Prepare before leaving signal.</strong> Choose verified family documents or a smaller selection. Each helper checks its manuals, local model and app resources before showing Ready offline.</li></ul>
      </section>

      <section id="install" className="release-install" aria-labelledby="release-install-title">
        <div className="release-install-intro">
          <p className="release-eyebrow">TAKE IT WITH YOU</p>
          <h2 id="release-install-title">Ready for your<br />next call-out.</h2>
          <p>Open the app online first. Save the manuals you need before heading somewhere with no signal.</p>
          <div className="release-offline-note"><span aria-hidden="true">↘</span><p>Wait for <strong>“Ready offline”</strong> on the helper you need. This checks its selected manuals, the shared local model and app resources. Devices that cannot run the model use clearly labelled manual search.</p></div>
        </div>
        <div className="release-install-options">
          <article className="release-install-card">
            <div className="release-install-card-head"><h3>iPhone &amp; iPad</h3><span>WEB APP</span></div>
            <ol><li>Open FINDR in <strong>Safari</strong>.</li><li>Tap <strong>Share → Add to Home Screen</strong>.</li><li>Open it online and prepare your offline kit.</li></ol>
            <OpenFindr>Open FINDR in your browser <Arrow /></OpenFindr>
          </article>
          <article className="release-install-card">
            <div className="release-install-card-head"><h3>Android</h3><span>APK / WEB APP</span></div>
            <p>Use the web app for the latest features, or install the Android APK with its bundled field kit. Update an existing APK by installing the newer file. Save manual PDFs while online.</p>
            <a href={apkUrl} download={'FINDR-' + APK_VERSION + '.apk'}>Download Android APK <Arrow download /></a>
            <small>APK {APK_VERSION} · Android 8 or later · Web app {APP_VERSION}</small>
          </article>
        </div>
      </section>

      <aside className="release-beta-note"><span>PUBLIC BETA</span><p>FINDR helps you gather observations and explore possible causes. Keypad emulation uses documented menu editions and fictional panel data. Each screen shows its sources and any behaviour still awaiting verification. Use the exact-model manual for site work.</p></aside>
    </main>

    <footer className="release-footer"><div><strong aria-label="FINDR">findr</strong><span>Fire &amp; Security Field Kit</span></div><p>Public beta <strong>{APP_VERSION}</strong></p><OpenFindr>Open FINDR <Arrow /></OpenFindr></footer>
  </div>;
}
