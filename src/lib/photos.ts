export function birdPhotoFallback(url: string, width: number) {
  try {
    const file = decodeURIComponent(new URL(url).pathname.split("/").pop() || "");
    if (!file) return url;
    return `https://commons.wikimedia.org/w/thumb.php?f=${encodeURIComponent(file)}&w=${width}`;
  } catch {
    return url;
  }
}

export function commonsThumb(url: string | undefined, width: number) {
  const value = String(url || "");
  // Wikimedia thumbs end in /500px-File.jpg, or /lossy-page1-500px-File.tif.jpg for TIFFs.
  const resized = value.replace(
    /\/((?:lossy-)?page\d+-)?\d+px-(?=[^/?#]*$)/i,
    `/$1${width}px-`,
  );
  if (resized !== value) return resized;

  const match = value.match(
    /^(https?:\/\/[^/]+\/wikipedia\/commons\/)([0-9a-f]\/[0-9a-f]{2}\/)([^/?#]+)/i,
  );
  if (match) {
    const [, prefix, hash, file] = match;
    const thumbHost = prefix.replace(
      "/wikipedia/commons/",
      "/wikipedia/commons/thumb/",
    );
    const suffix = /\.svg$/i.test(decodeURIComponent(file)) ? ".png" : "";
    return `${thumbHost}${hash}${file}/${width}px-${file}${suffix}`;
  }

  return birdPhotoFallback(value, width);
}

export function photoSources(url: string, widths: number[]) {
  const src = commonsThumb(url, widths[Math.min(1, widths.length - 1)]);
  const srcset = widths
    .map((width) => `${commonsThumb(url, width)} ${width}w`)
    .join(", ");
  return { src, srcset };
}
