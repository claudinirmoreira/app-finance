import { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: (<><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>) },
  { to: '/transactions', label: 'Transações', icon: (<><path d="M17 3l4 4-4 4" /><path d="M3 11V9a4 4 0 014-4h14" /><path d="M7 21l-4-4 4-4" /><path d="M21 13v2a4 4 0 01-4 4H3" /></>) },
  { to: '/accounts', label: 'Contas', icon: (<><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>) },
  { to: '/categories', label: 'Categorias', icon: (<><path d="M4 4h6v6H4z" /><path d="M14 4h6v6h-6z" /><path d="M4 14h6v6H4z" /><path d="M17 14v6" /><path d="M14 17h6" /></>) },
  { to: '/budgets', label: 'Orçamentos', icon: (<><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></>) },
  { to: '/reports', label: 'Relatórios', icon: (<><path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" /></>) },
];

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg className="sidebar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      {children}
    </svg>
  );
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div id="app">
      <aside id="sidebar" className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar__brand">
          <span className="sidebar__logo">💰</span>
          <h1 className="sidebar__title">FinançasPessoais</h1>
        </div>
        <nav className="sidebar__nav" role="navigation" aria-label="Menu principal">
          <ul className="sidebar__menu">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => `sidebar__link${isActive ? ' sidebar__link--active' : ''}`}
                >
                  <Icon>{item.icon}</Icon>
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="sidebar__footer">
          <button
            className="sidebar__toggle"
            aria-label="Recolher menu"
            onClick={() => setCollapsed((v) => !v)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </div>
      </aside>

      <main id="main-content" className="main">
        <header className="header">
          <div className="header__left">
            <button className="header__menu-btn" aria-label="Abrir menu" onClick={() => setMobileOpen(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>
            <h2 className="header__title">
              {NAV_ITEMS.find((i) => i.to === window.location.pathname)?.label ?? 'Dashboard'}
            </h2>
          </div>
          <div className="header__right">
            <Link to="/transactions" className="btn btn--primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span>Nova Transação</span>
            </Link>
          </div>
        </header>

        <section id="app-content" className="content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}