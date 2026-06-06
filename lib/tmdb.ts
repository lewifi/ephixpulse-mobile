const IMG = 'https://image.tmdb.org/t/p';

export function posterUrl(path?: string | null, size: 'w185' | 'w342' | 'w500' = 'w342') {
  return path ? `${IMG}/${size}${path}` : undefined;
}

export function logoUrl(path?: string | null) {
  return path ? `${IMG}/w92${path}` : undefined;
}

export function titleOf(item: any): string {
  return item.title || item.name || 'Untitled';
}

export function yearOf(item: any): string {
  return (item.release_date || item.first_air_date || '').slice(0, 4);
}

export function mediaType(item: any): 'movie' | 'tv' {
  return item.media_type === 'tv' || item.name ? 'tv' : 'movie';
}
