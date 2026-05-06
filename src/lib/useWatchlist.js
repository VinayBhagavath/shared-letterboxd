import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase, explainSupabaseError } from './supabase.js';

/**
 * Loads movies, votes, comments, and per-user watches from Supabase and keeps
 * them in sync via Realtime channels. Returns a denormalized `movies` array
 * (with vote_count, watcher_count, comment_count, has_voted, has_seen flags)
 * plus action callbacks.
 */
export function useWatchlist(userName, userColor) {
  const [movies, setMovies] = useState([]);
  const [votes, setVotes] = useState([]);
  const [comments, setComments] = useState([]);
  const [watches, setWatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Latest user identity in refs so realtime callbacks always see current value.
  const userRef = useRef(userName);
  const colorRef = useRef(userColor);
  useEffect(() => {
    userRef.current = userName;
  }, [userName]);
  useEffect(() => {
    colorRef.current = userColor;
  }, [userColor]);

  // ---------- Initial load ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [m, v, c, w] = await Promise.all([
          supabase.from('movies').select('*').order('added_at', { ascending: false }),
          supabase.from('votes').select('*'),
          supabase.from('comments').select('*').order('created_at', { ascending: true }),
          supabase.from('watches').select('*').order('created_at', { ascending: true }),
        ]);
        if (cancelled) return;
        if (m.error) throw m.error;
        if (v.error) throw v.error;
        if (c.error) throw c.error;
        if (w.error) throw w.error;
        setMovies(m.data ?? []);
        setVotes(v.data ?? []);
        setComments(c.data ?? []);
        setWatches(w.data ?? []);
      } catch (e) {
        if (!cancelled) setError(explainSupabaseError(e, 'load the watchlist'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---------- Realtime subscriptions ----------
  useEffect(() => {
    const channel = supabase
      .channel('shared-letterboxd')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'movies' }, (payload) => {
        setMovies((prev) => applyChange(prev, payload, sortMovies));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, (payload) => {
        setVotes((prev) => applyChange(prev, payload));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, (payload) => {
        setComments((prev) => applyChange(prev, payload, sortByCreatedAsc));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'watches' }, (payload) => {
        setWatches((prev) => applyChange(prev, payload, sortByCreatedAsc));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ---------- Derived view ----------
  const enrichedMovies = useMemo(() => {
    const byMovieVotes = groupBy(votes, 'movie_id');
    const byMovieComments = groupBy(comments, 'movie_id');
    const byMovieWatches = groupBy(watches, 'movie_id');
    const lower = (userName ?? '').trim().toLowerCase();
    return movies.map((m) => {
      const mVotes = byMovieVotes.get(m.id) ?? [];
      const mComments = byMovieComments.get(m.id) ?? [];
      const mWatches = byMovieWatches.get(m.id) ?? [];
      return {
        ...m,
        vote_count: mVotes.length,
        comment_count: mComments.length,
        watcher_count: mWatches.length,
        has_voted: lower
          ? mVotes.some((v) => (v.user_name ?? '').toLowerCase() === lower)
          : false,
        has_seen: lower
          ? mWatches.some((w) => (w.user_name ?? '').toLowerCase() === lower)
          : false,
        votes: mVotes,
        comments: mComments,
        watches: mWatches,
      };
    });
  }, [movies, votes, comments, watches, userName]);

  // ---------- Mutations ----------

  const addMovie = useCallback(
    async (details) => {
      if (!userRef.current) throw new Error('Pick a display name first.');
      const row = {
        tmdb_id: details.tmdbId,
        title: details.title,
        year: details.year ?? null,
        poster_url: details.posterUrl ?? null,
        backdrop_url: details.backdropUrl ?? null,
        director: details.director ?? null,
        overview: details.overview ?? null,
        runtime: details.runtime ?? null,
        genres: details.genres ?? [],
        letterboxd_url: details.letterboxdUrl ?? null,
        added_by: userRef.current,
        added_by_color: colorRef.current ?? null,
      };
      const { data, error: err } = await supabase
        .from('movies')
        .upsert(row, { onConflict: 'tmdb_id' })
        .select()
        .single();
      if (err) throw explainSupabaseError(err, 'save the movie');
      // Optimistic merge in case realtime hasn't echoed yet.
      setMovies((prev) => upsertById(prev, data, sortMovies));
      return data;
    },
    [],
  );

  const toggleVote = useCallback(async (movieId) => {
    const u = userRef.current;
    if (!u) throw new Error('Pick a display name first.');
    const lower = u.toLowerCase();
    const existing = votes.find(
      (v) => v.movie_id === movieId && (v.user_name ?? '').toLowerCase() === lower,
    );
    if (existing) {
      // Optimistic: remove immediately
      setVotes((prev) => prev.filter((v) => v.id !== existing.id));
      const { error: err } = await supabase.from('votes').delete().eq('id', existing.id);
      if (err) {
        setVotes((prev) => upsertById(prev, existing));
        throw explainSupabaseError(err, 'remove your vote');
      }
    } else {
      const tempId = `tmp-${Math.random().toString(36).slice(2)}`;
      const optimistic = {
        id: tempId,
        movie_id: movieId,
        user_name: u,
        user_color: colorRef.current ?? null,
        created_at: new Date().toISOString(),
      };
      setVotes((prev) => [...prev, optimistic]);
      const { data, error: err } = await supabase
        .from('votes')
        .insert({
          movie_id: movieId,
          user_name: u,
          user_color: colorRef.current ?? null,
        })
        .select()
        .single();
      if (err) {
        setVotes((prev) => prev.filter((v) => v.id !== tempId));
        // 23505 = unique violation (already voted in another tab); ignore quietly
        if (err.code !== '23505') throw explainSupabaseError(err, 'record your vote');
        return;
      }
      setVotes((prev) => upsertById(prev.filter((v) => v.id !== tempId), data));
    }
  }, [votes]);

  const toggleSeen = useCallback(async (movieId) => {
    const u = userRef.current;
    if (!u) throw new Error('Pick a display name first.');
    const lower = u.toLowerCase();
    const existing = watches.find(
      (w) => w.movie_id === movieId && (w.user_name ?? '').toLowerCase() === lower,
    );
    if (existing) {
      // Optimistic remove
      setWatches((prev) => prev.filter((w) => w.id !== existing.id));
      const { error: err } = await supabase.from('watches').delete().eq('id', existing.id);
      if (err) {
        setWatches((prev) => upsertById(prev, existing, sortByCreatedAsc));
        throw explainSupabaseError(err, 'remove your watched mark');
      }
    } else {
      const tempId = `tmp-${Math.random().toString(36).slice(2)}`;
      const optimistic = {
        id: tempId,
        movie_id: movieId,
        user_name: u,
        user_color: colorRef.current ?? null,
        created_at: new Date().toISOString(),
      };
      setWatches((prev) => [...prev, optimistic]);
      const { data, error: err } = await supabase
        .from('watches')
        .insert({
          movie_id: movieId,
          user_name: u,
          user_color: colorRef.current ?? null,
        })
        .select()
        .single();
      if (err) {
        setWatches((prev) => prev.filter((w) => w.id !== tempId));
        // 23505 = unique violation (already marked seen in another tab); ignore quietly
        if (err.code !== '23505') throw explainSupabaseError(err, 'mark this as seen');
        return;
      }
      setWatches((prev) =>
        upsertById(prev.filter((w) => w.id !== tempId), data, sortByCreatedAsc),
      );
    }
  }, [watches]);

  const addComment = useCallback(async (movieId, body) => {
    const u = userRef.current;
    if (!u) throw new Error('Pick a display name first.');
    const trimmed = body.trim();
    if (!trimmed) return;
    const tempId = `tmp-${Math.random().toString(36).slice(2)}`;
    const optimistic = {
      id: tempId,
      movie_id: movieId,
      user_name: u,
      user_color: colorRef.current ?? null,
      body: trimmed,
      created_at: new Date().toISOString(),
    };
    setComments((prev) => [...prev, optimistic]);
    const { data, error: err } = await supabase
      .from('comments')
      .insert({
        movie_id: movieId,
        user_name: u,
        user_color: colorRef.current ?? null,
        body: trimmed,
      })
      .select()
      .single();
    if (err) {
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      throw explainSupabaseError(err, 'post your comment');
    }
    setComments((prev) =>
      upsertById(prev.filter((c) => c.id !== tempId), data, sortByCreatedAsc),
    );
  }, []);

  const deleteMovie = useCallback(async (movieId) => {
    setMovies((prev) => prev.filter((m) => m.id !== movieId));
    const { error: err } = await supabase.from('movies').delete().eq('id', movieId);
    if (err) throw explainSupabaseError(err, 'delete the movie');
  }, []);

  return {
    movies: enrichedMovies,
    loading,
    error,
    addMovie,
    toggleVote,
    toggleSeen,
    addComment,
    deleteMovie,
  };
}

// ---------- helpers ---------------------------------------------------------------

function groupBy(rows, key) {
  const map = new Map();
  for (const r of rows) {
    const k = r[key];
    const arr = map.get(k);
    if (arr) arr.push(r);
    else map.set(k, [r]);
  }
  return map;
}

function upsertById(arr, row, sortFn) {
  const idx = arr.findIndex((x) => x.id === row.id);
  let next;
  if (idx === -1) next = [...arr, row];
  else {
    next = arr.slice();
    next[idx] = row;
  }
  return sortFn ? next.sort(sortFn) : next;
}

function applyChange(prev, payload, sortFn) {
  const { eventType, new: newRow, old: oldRow } = payload;
  if (eventType === 'INSERT') return upsertById(prev, newRow, sortFn);
  if (eventType === 'UPDATE') return upsertById(prev, newRow, sortFn);
  if (eventType === 'DELETE') return prev.filter((r) => r.id !== oldRow.id);
  return prev;
}

function sortMovies(a, b) {
  return new Date(b.added_at).getTime() - new Date(a.added_at).getTime();
}

function sortByCreatedAsc(a, b) {
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}
