import { Link } from 'react-router-dom';

const HomeScreen = (): JSX.Element => {
  return (
    <section className="home-layout">
      <div className="hero-card">
        <p className="text-sm font-medium uppercase tracking-wider text-dark-gray/80">Hivemind</p>
        <h2 className="hero-title">Host a game or join the hive mind.</h2>
        <p className="hero-body">
          Challenge your friends to align on the hidden target. Host new games, explore active matches, and see how
          closely the community guesses.
        </p>
        <div className="hero-actions">
          <Link to="/host" className="button-primary">
            Host Game
          </Link>
          <Link to="/feed" className="button-secondary">
            View Active Games
          </Link>
        </div>
      </div>

      <div className="surface-card">
        <header className="surface-header">
          <h3>Active games</h3>
          <Link to="/feed" className="text-sm font-medium text-reddit-orange">
            See all
          </Link>
        </header>
        <p className="surface-muted">
          Use the feed to discover live games. We&rsquo;ll surface featured matches here soon.
        </p>
      </div>
    </section>
  );
};

export default HomeScreen;
