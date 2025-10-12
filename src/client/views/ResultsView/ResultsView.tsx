import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getGameResults } from '../../api/games.js';
import type { GameResults } from '../../../shared/types/Game.js';
import type { PlayerScoreSummary } from '../../../shared/types/ScoreSummary.js';
import { colors, spacing } from '../../styles/tokens.js';
import { SpectrumPill } from '../../components/SpectrumPill.js';
import HistogramPhaser from '../../components/HistogramPhaser.js';


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
  const domainStart = buckets[0]?.rangeStart ?? 0;
  const domainEnd = buckets[buckets.length - 1]?.rangeEnd ?? 100;
  const toPct = (v: number): number => {
    if (domainEnd === domainStart) return 0;
    return ((v - domainStart) / (domainEnd - domainStart)) * 100;
  };

  return (
    <div role="img" aria-label="Guess distribution histogram" style={{ width: '100%' }}>
      <div style={{ position: 'relative', width: '100%' }}>
        {/* Marker lines overlayed on top of the grid */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: `${toPct(target)}%`,
            top: 0,
            bottom: 0,
            width: 2,
            background: colors.redditOrange,
            transform: 'translateX(-1px)',
            zIndex: 3,
            pointerEvents: 'none',
          }}
        />
        {/* Target marker dot */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: `${toPct(target)}%`,
            top: 0,
            width: 8,
            height: 8,
            borderRadius: 999,
            background: colors.redditOrange,
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 0 0 2px rgba(0,0,0,0.3)',
            zIndex: 4,
            pointerEvents: 'none',
          }}
        />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: `${toPct(median)}%`,
            top: 0,
            bottom: 0,
            width: 2,
            background: colors.redditBlue,
            transform: 'translateX(-1px)',
            zIndex: 3,
            pointerEvents: 'none',
          }}
        />
        {/* Median marker dot */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: `${toPct(median)}%`,
            top: 0,
            width: 8,
            height: 8,
            borderRadius: 999,
            background: colors.redditBlue,
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 0 0 2px rgba(0,0,0,0.3)',
            zIndex: 4,
            pointerEvents: 'none',
          }}
        />

        {/* Bar grid */}
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
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', marginBottom: 4 }}>{b.count}</span>
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
    </div>
  );
};

const findPlayer = (players: PlayerScoreSummary[], id?: string) => players.find((p) => p.userId === id);

const ResultsView = (): JSX.Element => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useResults(gameId);

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

  // No share section per new spec

  return (
    <section className="view view--results">
      <div className="container" style={{ paddingTop: spacing.lg }}>
        {isLoading && (
          <div className="loading" aria-busy="true">Loading results…</div>
        )}

        {data && (
          <>
            {/* Hero section */}
            <header className="feed-item feed-item--inline" style={{ marginBottom: spacing.lg }}>
              <SpectrumPill spectrum={data.spectrum} variant="full" className="feed-item__spectrum" />
              <div className="feed-item__meta" style={{ marginTop: spacing.sm }}>
                <h2 className="feed-item__title feed-item__title--center">{data.clue}</h2>
              </div>
              <div className="metrics" style={{ display: 'flex', gap: spacing.md, justifyContent: 'center', color: '#fff', marginTop: spacing.sm }}>
                {data.viewer?.isHost ? (
                  <div className="metric" title="Your Host Score">
                    ⭐ <strong>{Math.round(data.viewer.score?.breakdown.totalScore ?? data.scoreSummary.host.breakdown.totalScore)}</strong>
                  </div>
                ) : (
                  <>
                    <div className="metric" title="Your Score">
                      🧠 <strong>{Math.round((data.viewer?.score as PlayerScoreSummary | undefined)?.breakdown.totalScore ?? 0)}</strong>
                    </div>
                    {typeof data.viewer?.guessValue === 'number' && (
                      <div className="metric" title="Your Guess">
                        🎯 <strong>{data.viewer.guessValue}</strong>
                      </div>
                    )}
                  </>
                )}
              </div>
            </header>

            <section aria-labelledby="histogram-title" style={{ marginBottom: spacing.lg }}>
              <h3 id="histogram-title" style={{ color: colors.lightGray, marginBottom: spacing.sm }}>Distribution</h3>
              <div style={{ width: '100%' }}>
                <HistogramPhaser
                  className="results-histogram"
                  buckets={data.scoreSummary.histogram}
                  target={data.scoreSummary.targetValue}
                  median={data.scoreSummary.finalMedian}
                  viewerGuess={typeof data.viewer?.guessValue === 'number' ? data.viewer.guessValue : undefined}
                />
              </div>
              {/* Colored-dot legend */}
              <div style={{ display: 'flex', gap: spacing.md, justifyContent: 'center', alignItems: 'center', marginTop: spacing.sm }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#fff', fontSize: 12 }}>
                  <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: colors.redditOrange }} />
                  Target
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#fff', fontSize: 12 }}>
                  <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: colors.redditBlue }} />
                  Median
                </span>
                {typeof data.viewer?.guessValue === 'number' && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#fff', fontSize: 12 }}>
                    <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: '#62f29e' }} />
                    Your Guess
                  </span>
                )}
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

            {/* Footer share section removed per spec */}
            <div style={{ display: 'flex', gap: spacing.sm }}>
              <button className="secondary-button" onClick={() => navigate('/feed')}>Back to feed</button>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default ResultsView;


