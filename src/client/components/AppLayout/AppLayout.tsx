import { NavLink, Outlet } from 'react-router-dom';

const AppLayout = (): JSX.Element => {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__inner app-header__inner--centered">
          <nav className="app-nav app-nav--left">
            <NavLink
              to="/"
              end
              className={({ isActive }) => `app-nav__link ${isActive ? 'app-nav__link--active' : ''}`}
            >
              Home
            </NavLink>
          </nav>
          <h1 className="app-brand app-brand--centered">Hivemind</h1>
          <div className="app-nav app-nav--right" aria-hidden="true" />
        </div>
      </header>

      <main className="app-main">
        <div className="app-main__content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
