let source: EventSource;

function connect() {
  if (source || !window.EventSource) return;

  source = new EventSource(
    `http://${window.location.hostname}:${window.location.port}/__sveet/livereload`
  );

  let connected = false;
  source.onopen = function(event) {
    connected = true;
    console.log(`[Sveet] dev client connected`);
  };

  source.onerror = function(error) {
    if (connected) {
      console.log(`[Sveet] dev client disconnected`);
      connected = false;
    }
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
