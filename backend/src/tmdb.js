const BASE_URL = 'https://api.themoviedb.org/3';

// Helper for fetch with delay to be nice to API
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export const tmdb = {
  searchMulti: async (query, year, apiKey) => {
    if (!apiKey) return null;
    try {
      const url = new URL(`${BASE_URL}/search/multi`);
      url.searchParams.append('api_key', apiKey);
      url.searchParams.append('query', query);
      if (year) url.searchParams.append('year', year);
      
      const res = await fetch(url.toString());
      if (!res.ok) return null;
      
      const data = await res.json();
      // Prefer exact matches, filter out persons
      const result = data.results.find(r => r.media_type === 'movie' || r.media_type === 'tv');
      return result || null;
    } catch (e) {
      console.error('[TMDB] Search failed:', e.message);
      return null;
    }
  },

  getDetails: async (tmdbId, mediaType, apiKey) => {
    if (!apiKey || !tmdbId) return {};
    try {
      // Fetch details + credits + videos (trailer)
      const url = new URL(`${BASE_URL}/${mediaType}/${tmdbId}`);
      url.searchParams.append('api_key', apiKey);
      url.searchParams.append('append_to_response', 'credits,videos');

      const res = await fetch(url.toString());
      if (!res.ok) return {};

      const data = await res.json();
      const imageBase = 'https://image.tmdb.org/t/p/w500';
      const backdropBase = 'https://image.tmdb.org/t/p/original';

      // Find trailer (Youtube)
      const trailer = data.videos?.results?.find(v => v.site === 'YouTube' && v.type === 'Trailer');

      return {
        tmdb_id: data.id,
        overview: data.overview,
        poster_path: data.poster_path ? `${imageBase}${data.poster_path}` : null,
        backdrop_path: data.backdrop_path ? `${backdropBase}${data.backdrop_path}` : null,
        genres: data.genres?.map(g => g.name) || [],
        vote_average: data.vote_average,
        release_date: data.release_date || data.first_air_date,
        trailer_url: trailer ? trailer.key : null,
        cast: data.credits?.cast?.slice(0, 10).map(c => ({
          id: c.id,
          name: c.name,
          character: c.character,
          profile_path: c.profile_path ? `${imageBase}${c.profile_path}` : null
        })) || []
      };
    } catch (e) {
      console.error('[TMDB] Details failed:', e.message);
      return {};
    }
  }
};