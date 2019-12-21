let source;

function connect() {
  if (source || !window.EventSource) return;

  source = new EventSource(
    `http://${window.location.hostname}:${window.location.port}/__svite`
  );

  source.onopen = function(event) {
    console.log(`[Svite] dev client connected`);
  };

  source.onerror = function(error) {
    console.error(error);
  };

  source.onmessage = function(event) {
    const data = JSON.parse(event.data);
    if (!data) return; // just a heartbeat

    if (["reload", "ready"].indexOf(data.action) > -1) {
      window.location.reload();
    }
  };
}

connect();
