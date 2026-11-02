const ID = /^[A-Za-z0-9_-]{11}$/;

/** Extract the 11-character video id from any common YouTube link form, or a bare id. */
export function parseYouTubeId(input: string): string | null {
  const s = input.trim();
  if (ID.test(s)) return s;
  let url: URL;
  try {
    url = new URL(s.startsWith("http") ? s : `https://${s}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www\.|m\.|music\.)/, "");
  let id: string | null = null;
  if (host === "youtu.be") {
    id = url.pathname.split("/")[1] ?? null;
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else {
      const m = /^\/(embed|live|shorts|v)\/([^/?#]+)/.exec(url.pathname);
      id = m?.[2] ?? null;
    }
  }
  return id && ID.test(id) ? id : null;
}
