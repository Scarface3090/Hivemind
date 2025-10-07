import { NavLink, Outlet } from 'react-router-dom';

const navigation = [
  { to: '/', label: 'Home', end: true },
  { to: '/feed', label: 'Game Feed' },
  { to: '/host', label: 'Host' },
];

const AppLayout = (): JSX.Element => {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__inner">
          <h1 className="app-brand">Hivemind</h1>
          <nav className="app-nav">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `app-nav__link ${isActive ? 'app-nav__link--active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
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
