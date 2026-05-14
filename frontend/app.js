const API_BASE_URL = window.LABSTAT_API_BASE_URL || 'https://your-render-app.onrender.com';
const POLL_INTERVAL_MS = 5000;

const { useEffect, useMemo, useState } = React;

function normalizeStatus(value) {
  if (typeof value !== 'string') {
    return 'unknown';
  }

  const normalized = value.toLowerCase();
  if (normalized === 'up' || normalized === 'down' || normalized === 'partial' || normalized === 'unknown') {
    return normalized;
  }

  return 'unknown';
}

function formatTimestamp(value) {
  if (!value) {
    return 'No telemetry received yet';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Timestamp unavailable';
  }

  return date.toLocaleString();
}

function StatusCard({ label, value, detail }) {
  return React.createElement(
    'section',
    { className: `status-card status-${value}` },
    React.createElement('div', { className: 'status-label' }, label),
    React.createElement('div', { className: 'status-pill' }, value.toUpperCase()),
    React.createElement('div', { className: 'status-detail' }, detail)
  );
}

function App() {
  const [state, setState] = useState({
    node: 'ran_ric',
    status: {
      core: 'unknown',
      ocudu: 'unknown',
      ric: 'unknown',
    },
    lastUpdated: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function fetchStatus() {
      try {
        const response = await fetch(`${API_BASE_URL}/network-status`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Backend returned ${response.status}`);
        }

        const data = await response.json();
        if (cancelled) {
          return;
        }

        setState({
          node: typeof data.node === 'string' ? data.node : 'ran_ric',
          status: {
            core: normalizeStatus(data?.status?.core),
            ocudu: normalizeStatus(data?.status?.ocudu),
            ric: normalizeStatus(data?.status?.ric),
          },
          lastUpdated: data?.lastUpdated || null,
        });
        setError('');
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError.message || 'Unable to reach backend');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchStatus();
    const intervalId = window.setInterval(fetchStatus, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const cards = useMemo(
    () => [
      {
        label: 'Core',
        value: state.status.core,
        detail: 'Open5GS services on Laptop 2',
      },
      {
        label: 'RAN',
        value: state.status.ocudu,
        detail: 'SRS OCUDU / gNB process on Laptop 1',
      },
      {
        label: 'RIC',
        value: state.status.ric,
        detail: 'Near-RT RIC Docker services on Laptop 1',
      },
    ],
    [state]
  );

  return React.createElement(
    'main',
    { className: 'dashboard-shell' },
    React.createElement(
      'header',
      { className: 'hero' },
      React.createElement('p', { className: 'eyebrow' }, '5G O-RAN Security Lab'),
      React.createElement('h1', null, 'Monitoring Dashboard'),
      React.createElement(
        'p',
        { className: 'subtitle' },
        'Outbound-only telemetry bridge for a live 5G testbed.'
      )
    ),
    React.createElement(
      'section',
      { className: 'meta-panel' },
      React.createElement('div', null, React.createElement('strong', null, 'Node: '), state.node),
      React.createElement(
        'div',
        null,
        React.createElement('strong', null, 'Last update: '),
        formatTimestamp(state.lastUpdated)
      ),
      React.createElement(
        'div',
        { className: loading ? 'meta-loading' : 'meta-live' },
        loading ? 'Loading telemetry…' : 'Polling every 5 seconds'
      )
    ),
    error
      ? React.createElement('section', { className: 'error-banner' }, `Backend error: ${error}`)
      : null,
    React.createElement(
      'section',
      { className: 'card-grid' },
      cards.map((card) =>
        React.createElement(StatusCard, {
          key: card.label,
          label: card.label,
          value: card.value,
          detail: card.detail,
        })
      )
    )
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
