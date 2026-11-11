'use client';

import { useEffect, useId, useRef, useState, type AnchorHTMLAttributes, type MouseEvent } from 'react';
import { repairRedirectedAppShells } from '../lib/offline-recovery.mjs';
import { describeAppLaunchError, prepareAppLaunch } from '../lib/app-update.mjs';
import { APP_VERSION } from '../public/app/version.mjs';

const appUrl = '/app/';
type LaunchProgress = {phase: string; percent?: number; completed?: number; total?: number};
type LaunchFailure = {message: string; details: string[]};
let preparation: Promise<unknown> | undefined;
let latestProgress: LaunchProgress = {phase: 'checking'};
const listeners = new Set<(progress: LaunchProgress) => void>();

function reportProgress(progress: LaunchProgress) {
  latestProgress = progress;
  for (const listener of listeners) listener(progress);
}

function prepareExistingApp() {
  if (!preparation) {
    preparation = (async () => {
      reportProgress({phase: 'checking'});
      try {
        await repairRedirectedAppShells({cacheStorage: window.caches, origin: window.location.origin});
      } catch {
        // An unavailable cache does not prevent a fresh network launch.
      }
      return prepareAppLaunch({
        serviceWorker: 'serviceWorker' in navigator ? navigator.serviceWorker : undefined,
        origin: window.location.origin,
        appPath: appUrl,
        expectedVersion: APP_VERSION,
        onProgress: reportProgress,
      });
    })().catch(error => {
      preparation = undefined;
      throw error;
    });
  }
  return preparation;
}

type OpenFindrProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'onClick'> & {
  destination?: '#home' | '#helpers' | '#helpers/new' | '#menus' | '#practice' | '#emulator' | '#gent' | '#nano' | '#devices' | '#downloads/all' | '#downloads/saved' | '#identify' | '#faults';
};

export default function OpenFindr({ children, destination = '#home', ...props }: OpenFindrProps) {
  const [opening, setOpening] = useState(false);
  const [progress, setProgress] = useState<LaunchProgress>(latestProgress);
  const [error, setError] = useState<LaunchFailure | null>(null);
  const openingRef = useRef(false);
  const errorId = useId();
  const targetUrl = appUrl + destination;

  useEffect(() => {
    listeners.add(setProgress);
    // Begin the existing installation's update while the release page is read.
    void prepareExistingApp().catch(() => {});
    const resetOpening = () => {
      openingRef.current = false;
      setOpening(false);
    };
    window.addEventListener('pageshow', resetOpening);
    return () => {
      listeners.delete(setProgress);
      window.removeEventListener('pageshow', resetOpening);
    };
  }, []);

  async function openApp(event: MouseEvent<HTMLAnchorElement>) {
    const target = event.currentTarget.target;
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
      event.shiftKey || event.altKey || (target && target !== '_self') ||
      event.currentTarget.hasAttribute('download')) return;

    event.preventDefault();
    if (openingRef.current) return;
    openingRef.current = true;
    setOpening(true);
    setError(null);
    try {
      await prepareExistingApp();
      window.location.assign(targetUrl);
    } catch (failure) {
      openingRef.current = false;
      setOpening(false);
      setError(describeAppLaunchError(failure));
    }
  }

  const assetCount = progress.completed === undefined || progress.total === undefined ? '' : ` (${progress.completed}/${progress.total})`;
  const openingLabel = progress.phase === 'downloading'
    ? 'Updating…' + (progress.percent === undefined ? '' : ' ' + progress.percent + '%')
      + assetCount
    : progress.phase === 'finishing' ? 'Finishing update…' + assetCount
    : progress.phase === 'activating' ? 'Activating update…'
    : progress.phase === 'verified_waiting' ? 'Update saved · waiting for browser…'
    : progress.phase === 'verifying' ? 'Checking saved update…'
    : progress.phase === 'ready' ? 'Opening…' : 'Checking…';

  return <>
    <a {...props} href={targetUrl} onClick={openApp} aria-busy={opening || undefined} aria-describedby={error ? errorId : undefined}>
      {opening ? openingLabel : children}
    </a>
    {error && <div id={errorId} className="release-launch-error" role="alert">
      <p>{error.message} Your saved files are unchanged.</p>
      {error.details.length > 0 && <details>
        <summary>Update details</summary>
        <p style={{whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'}}>{error.details.join('\n')}</p>
      </details>}
    </div>}
  </>;
}
