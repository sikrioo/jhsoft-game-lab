(() => {
  const override = window.localStorage.getItem("lock_memory_api_base_url");
  const hostname = window.location.hostname;
  const port = window.location.port;
  const isLocalhost = hostname === "127.0.0.1" || hostname === "localhost";
  const isLiveServerPort = /^55\d{2}$/.test(port);

  let apiBaseUrl = "http://127.0.0.1:3000";

  if (override) {
    apiBaseUrl = override;
  } else if (
    (window.location.protocol === "http:" || window.location.protocol === "https:") &&
    !(isLocalhost && isLiveServerPort)
  ) {
    apiBaseUrl = window.location.origin;
  }

  window.LOCK_MEMORY_CONFIG = {
    API_BASE_URL: apiBaseUrl.replace(/\/$/, "")
  };
})();
