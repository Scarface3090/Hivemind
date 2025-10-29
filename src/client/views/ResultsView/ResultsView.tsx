
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getGameResults } from '../../api/games.js';
import type { GameResults } from '../../../shared/types/Game.js';
import type { PlayerScoreSummary } from '../../../shared/types/ScoreSummary.js';
import { colors, spacing } from '../../styles/tokens.js';
import { SpectrumPill } from '../../components/SpectrumPill.js';
import HistogramPhaser from '../../components/HistogramPhaser.js';

import { ConsensusErrorBoundary } from '../../components/ConsensusErrorBoundary.js';
import { ConsensusCard } from '../../components/ConsensusCard.js';
import { AccoladeCard } from '../../components/AccoladeCard.js';
import { ArtisticSectionHeader } from '../../components/ArtisticSectionHeader.js';


const useResults = (gameId: string | undefined) =>
  useQuery<GameResults>({
    queryKey: ['results', gameId],
    queryFn: () => getGameResults(gameId!),
    enabled: !!gameId,
    staleTime: 60_000,
  });





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
              <ArtisticSectionHeader icon="📊">
                Distribution
              </ArtisticSectionHeader>
              <div style={{ width: '100%' }}>
                <HistogramPhaser
                  className="results-histogram"
                  buckets={data.scoreSummary.histogram}
                  target={data.scoreSummary.targetValue}
                  median={data.scoreSummary.finalMedian}
                  {...(typeof data.viewer?.guessValue === 'number' && { viewerGuess: data.viewer.guessValue })}
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

            {/* Consensus section */}
            <section aria-labelledby="consensus-title" style={{ marginBottom: spacing.lg }}>
              <ArtisticSectionHeader icon="🧠">
                Community Consensus
              </ArtisticSectionHeader>
              <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                <ConsensusErrorBoundary>
                  {data.scoreSummary.consensus ? (
                    <div style={{ width: '100%', maxWidth: '480px' }}>
                      <ConsensusCard consensus={data.scoreSummary.consensus.label} />
                    </div>
                  ) : (
                    <div 
                      className="card" 
                      style={{ 
                        padding: spacing.md, 
                        borderRadius: 12, 
                        background: 'rgba(255,255,255,0.06)',
                        color: colors.lightGray,
                        textAlign: 'center' as const,
                        width: '100%',
                        maxWidth: '400px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: spacing.sm
                      }}
                    >
                      <span aria-hidden="true" style={{ fontSize: '16px' }}>❓</span>
                      <span>Unable to calculate consensus</span>
                    </div>
                  )}
                </ConsensusErrorBoundary>
              </div>
            </section>

            <section aria-labelledby="accolades-title" style={{ marginBottom: spacing.lg }}>
              <ArtisticSectionHeader icon="🏆">
                Accolades
              </ArtisticSectionHeader>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: spacing.md }}>
                {(() => {
                  const { bestAccuracy, topPersuasion, mostContrarian } = data.scoreSummary.accolades;
                  const players = data.scoreSummary.players;
                  const acc = [
                    { key: 'Psychic' as const, title: 'Psychic (Closest to Target)', user: findPlayer(players, bestAccuracy) },
                    { key: 'Top Comment' as const, title: 'Top Comment (Most Persuasive)', user: findPlayer(players, topPersuasion) },
                    { key: 'Unpopular Opinion' as const, title: 'Unpopular Opinion (Most Contrarian)', user: findPlayer(players, mostContrarian) },
                  ];
                  return acc
                    .filter((a) => a.user)
                    .map((a) => (
                      <AccoladeCard
                        key={a.key}
                        title={a.title}
                        username={a.user!.username}
                        accoladeType={a.key}
                      />
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


