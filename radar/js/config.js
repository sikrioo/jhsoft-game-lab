export const COLORS = {
  safe: 0x5fffd2,
  danger: 0xff5d73,
  warn: 0xffd166,
  blue: 0x72c7ff,
  lime: 0xa4ff7a,
  grid: 0x69ffd2,
  white: 0xffffff
};

export const typeConfig = {
  hostile: { label: "ENEMY", color: COLORS.danger, short: "ENM", className: "D" },
  ally: { label: "ALLY", color: COLORS.safe, short: "ALY", className: "IFF+" },
  civilian: { label: "CIVILIAN", color: COLORS.white, short: "CIV", className: "CIV" },
  wildlife: { label: "WILDLIFE", color: COLORS.lime, short: "BIO", className: "BIO" },
  resource: { label: "RESOURCE", color: COLORS.warn, short: "RES", className: "MINE" },
  anomaly: { label: "ANOMALY", color: COLORS.blue, short: "ANM", className: "UNKNOWN" },
  neutral: { label: "NEUTRAL", color: COLORS.safe, short: "NEU", className: "CIV" },
  unknown: { label: "UNKNOWN", color: 0x9fb6c2, short: "UNK", className: "PENDING", cssClass: "unknown" },
  identifying: { label: "IDENTIFYING", color: COLORS.white, short: "IFF", className: "SCAN", cssClass: "identifying" },
  falseAlarm: { label: "FALSE TRACK", color: COLORS.white, short: "FLT", className: "GHOST", cssClass: "false-alarm" }
};

export const player = { x: 0, y: 0 };
