import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getGameResults } from '../../api/games.js';
import type { GameResults } from '../../../shared/types/Game.js';
import type { PlayerScoreSummary } from '../../../shared/types/ScoreSummary.js';
import { colors, spacing } from '../../styles/tokens.js';

const formatShareText = (results: GameResults): string => {
  const { clue } = results;
  const { finalMedian, targetValue } = results.scoreSummary;
  const diff = Math.abs(finalMedian - targetValue);
  return `Hivemind results — ${clue}\nTarget: ${targetValue} | Median: ${finalMedian} (Δ ${diff})`;
};

const useResults = (gameId: string | undefined) =>
  useQuery<GameResults>({
    queryKey: ['results', gameId],
    queryFn: () => getGameResults(gameId!),
    enabled: !!gameId,
    staleTime: 60_000,
  });

const AccoladeBadge = ({ label }: { label: string }) => (
  <span
    className="chip"
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 8px',
      borderRadius: 999,
      background: 'rgba(255,255,255,0.08)',
      color: '#fff',
      fontSize: 12,
    }}
  >
    {label}
  </span>
);

const Histogram = ({
  buckets,
  target,
  median,
}: {
  buckets: { rangeStart: number; rangeEnd: number; count: number }[];
  target: number;
  median: number;
}) => {
  const max = useMemo(() => Math.max(1, ...buckets.map((b) => b.count)), [buckets]);
  return (
    <div role="img" aria-label="Guess distribution histogram" style={{ width: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${buckets.length}, 1fr)`, gap: 2, alignItems: 'end' }}>
        {buckets.map((b) => {
          const heightPct = (b.count / max) * 100;
          const isTarget = target >= b.rangeStart && target <= b.rangeEnd;
          const isMedian = median >= b.rangeStart && median <= b.rangeEnd;
          const barColor = isTarget
            ? colors.redditOrange
            : isMedian
            ? colors.redditBlue
            : 'rgba(255,255,255,0.2)';
          return (
            <div key={`${b.rangeStart}-${b.rangeEnd}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                title={`${b.rangeStart}-${b.rangeEnd}: ${b.count}`}
                style={{
                  width: '100%',
                  height: `${Math.max(6, Math.round(heightPct))}%`,
                  background: barColor,
                  borderRadius: 4,
                  transition: 'height 200ms',
                }}
              />
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 4 }}>{b.rangeStart}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const findPlayer = (players: PlayerScoreSummary[], id?: string) => players.find((p) => p.userId === id);

const ResultsView = (): JSX.Element => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useResults(gameId);
  const [copied, setCopied] = useState<boolean>(false);

  if (error instanceof Error) {
    return (
      <section className="view view--results">
        <div className="container">
          <div className="alert-error">{error.message}</div>
          <button className="pill-button" onClick={() => navigate('/feed')}>Back to feed</button>
        </div>
      </section>
    );
  }

  const share = async () => {
    if (!data) return;
    const text = formatShareText(data);
    const url = data.redditPost?.url;
    try {
      if (navigator.share) {
        await navigator.share({ text, url });
        return;
      }
    } catch {}
    try {
      await navigator.clipboard.writeText(url ? `${text}\n${url}` : text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <section className="view view--results">
      <div className="container" style={{ paddingTop: spacing.lg }}>
        {isLoading && (
          <div className="loading" aria-busy="true">Loading results…</div>
        )}

        {data && (
          <>
            <header className="feed-item feed-item--inline" style={{ marginBottom: spacing.lg }}>
              <div className="feed-item__meta">
                <p className="feed-item__host">Hosted by {data.hostUsername}</p>
                <h2 className="feed-item__title feed-item__title--center">{data.clue}</h2>
              </div>
              <div className="metrics" style={{ display: 'flex', gap: spacing.md, justifyContent: 'center', color: '#fff' }}>
                <div className="metric" title="Target">
                  🎯 <strong>{data.scoreSummary.targetValue}</strong>
                </div>
                <div className="metric" title="Final Median">
                  📊 <strong>{data.scoreSummary.finalMedian}</strong>
                </div>
                <div className="metric" title="Host Score">
                  ⭐ <strong>{Math.round(data.scoreSummary.host.breakdown.totalScore)}</strong>
                </div>
              </div>
            </header>

            <section aria-labelledby="histogram-title" style={{ marginBottom: spacing.lg }}>
              <h3 id="histogram-title" style={{ color: colors.lightGray, marginBottom: spacing.sm }}>Distribution</h3>
              <Histogram
                buckets={data.scoreSummary.histogram}
                target={data.scoreSummary.targetValue}
                median={data.scoreSummary.finalMedian}
              />
              <div style={{ display: 'flex', gap: spacing.md, justifyContent: 'center', marginTop: spacing.sm }}>
                <AccoladeBadge label="Target" />
                <AccoladeBadge label="Median" />
              </div>
            </section>

            <section aria-labelledby="accolades-title" style={{ marginBottom: spacing.lg }}>
              <h3 id="accolades-title" style={{ color: colors.lightGray, marginBottom: spacing.sm }}>Accolades</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: spacing.sm }}>
                {(() => {
                  const { bestAccuracy, topPersuasion, mostContrarian } = data.scoreSummary.accolades;
                  const players = data.scoreSummary.players;
                  const acc: Array<{ key: string; title: string; user?: PlayerScoreSummary }> = [
                    { key: 'Psychic', title: 'Psychic (Closest to Target)', user: findPlayer(players, bestAccuracy) },
                    { key: 'Top Comment', title: 'Top Comment (Most Persuasive)', user: findPlayer(players, topPersuasion) },
                    { key: 'Unpopular Opinion', title: 'Unpopular Opinion (Most Contrarian)', user: findPlayer(players, mostContrarian) },
                  ];
                  return acc
                    .filter((a) => a.user)
                    .map((a) => (
                      <div key={a.key} className="card" style={{ padding: spacing.md, borderRadius: 12, background: 'rgba(255,255,255,0.06)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ color: '#fff', fontWeight: 600 }}>{a.title}</div>
                            <div style={{ color: colors.lightGray, fontSize: 12 }}>@{a.user!.username}</div>
                          </div>
                          <AccoladeBadge label={a.key} />
                        </div>
                      </div>
                    ));
                })()}
              </div>
            </section>

            <section aria-labelledby="share-title" style={{ marginBottom: spacing.lg }}>
              <h3 id="share-title" style={{ color: colors.lightGray, marginBottom: spacing.sm }}>Share</h3>
              <div style={{ display: 'flex', gap: spacing.sm }}>
                <button className="primary-button" onClick={share}>{copied ? 'Copied!' : 'Share results'}</button>
                {data.redditPost?.url && (
                  <a className="secondary-button" href={data.redditPost.url} target="_blank" rel="noreferrer">View post</a>
                )}
                <button className="secondary-button" onClick={() => navigate('/feed')}>Back to feed</button>
              </div>
            </section>
          </>
        )}
      </div>
    </section>
  );
};

export default ResultsView;


