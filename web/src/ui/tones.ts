export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

export function runStateTone(state: string): Tone {
  switch (state) {
    case "running":
      return "info";
    case "completed":
      return "success";
    case "failed":
      return "danger";
    default:
      return "neutral";
  }
}

export function stepStateTone(state: string): Tone {
  switch (state) {
    case "started":
      return "info";
    case "completed":
      return "success";
    case "failed":
      return "danger";
    default:
      return "neutral";
  }
}

export function versionStateTone(state: string): Tone {
  switch (state) {
    case "validated":
    case "tested":
    case "reviewed":
      return "success";
    case "published":
      return "info";
    default:
      return "neutral";
  }
}

export function serverStateTone(state: string): Tone {
  switch (state) {
    case "pending":
      return "warning";
    case "approved":
      return "success";
    case "drifted":
      return "warning";
    default:
      return "neutral";
  }
}

export function grantStatusTone(status: string): Tone {
  switch (status) {
    case "active":
      return "success";
    case "needs_reconfirm":
      return "warning";
    default:
      return "neutral";
  }
}
