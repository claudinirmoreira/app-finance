import { AccountService } from './services/AccountService.js';
import { CategoryService } from './services/CategoryService.js';
import { TransactionService } from './services/TransactionService.js';
import { BudgetService } from './services/BudgetService.js';
import { formatMonthYear, getCurrentMonth } from './utils/formatters.js';
import { bus } from './utils/eventBus.js';

import { DashboardView } from './views/DashboardView.js';
import { TransactionsView, renderTransactionForm, initTransactionForm } from './views/TransactionsView.js';
import { AccountsView, renderAccountForm, initAccountForm } from './views/AccountsView.js';
import { CategoriesView, renderCategoryForm, initCategoryForm } from './views/CategoriesView.js';
import { BudgetsView, renderBudgetForm, initBudgetForm } from './views/BudgetsView.js';
import { ReportsView } from './views/ReportsView.js';

class App {
  #currentRoute = 'dashboard';
  #currentDate = getCurrentMonth();
  #views = {};
  #activeView = null;

  constructor() {
    this.#init();
  }

  #init() {
    AccountService.initializeDefaults();
    CategoryService.initializeDefaults();

    this.#setupRouting();
    this.#setupNavigation();
    this.#setupMonthSelector();
    this.#setupSidebar();
    this.#setupModal();
    this.#setupToasts();
    this.#setupAddButton();
    this.#setupMobileMenu();

    this.#navigate(window.location.hash.slice(1) || 'dashboard');
  }

  #setupRouting() {
    window.addEventListener('hashchange', () => {
      const route = window.location.hash.slice(1) || 'dashboard';
      this.#navigate(route);
    });
  }

  #navigate(route) {
    const validRoutes = ['dashboard', 'transactions', 'accounts', 'categories', 'budgets', 'reports'];
    if (!validRoutes.includes(route)) route = 'dashboard';

    this.#currentRoute = route;
    window.location.hash = route;

    const container = document.getElementById('app-content');
    const pageTitle = document.getElementById('page-title');

    const titles = {
      dashboard: 'Dashboard',
      transactions: 'Transações',
      accounts: 'Contas',
      categories: 'Categorias',
      budgets: 'Orçamentos',
      reports: 'Relatórios',
    };
    pageTitle.textContent = titles[route] || 'Dashboard';

    document.querySelectorAll('.sidebar__link').forEach(link => {
      link.classList.toggle('sidebar__link--active', link.dataset.route === route);
    });

    container.innerHTML = '';

    switch (route) {
      case 'dashboard':
        this.#activeView = new DashboardView(container, this.#currentDate.year, this.#currentDate.month);
        break;
      case 'transactions':
        this.#activeView = new TransactionsView(container, this.#currentDate.year, this.#currentDate.month);
        break;
      case 'accounts':
        this.#activeView = new AccountsView(container);
        break;
      case 'categories':
        this.#activeView = new CategoriesView(container);
        break;
      case 'budgets':
        this.#activeView = new BudgetsView(container, this.#currentDate.year, this.#currentDate.month);
        break;
      case 'reports':
        this.#activeView = new ReportsView(container, this.#currentDate.year, this.#currentDate.month);
        break;
    }

    this.#updateMonthDisplay();
    this.#closeMobileMenu();
  }

  #setupNavigation() {
    document.querySelectorAll('.sidebar__link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const route = link.dataset.route;
        if (route) this.#navigate(route);
      });
    });
  }

  #setupMonthSelector() {
    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');

    prevBtn?.addEventListener('click', () => {
      this.#currentDate.month--;
      if (this.#currentDate.month < 1) {
        this.#currentDate.month = 12;
        this.#currentDate.year--;
      }
      this.#updateMonthDisplay();
      this.#refreshCurrentView();
    });

    nextBtn?.addEventListener('click', () => {
      this.#currentDate.month++;
      if (this.#currentDate.month > 12) {
        this.#currentDate.month = 1;
        this.#currentDate.year++;
      }
      this.#updateMonthDisplay();
      this.#refreshCurrentView();
    });
  }

  #updateMonthDisplay() {
    const el = document.getElementById('current-month');
    if (el) el.textContent = formatMonthYear(this.#currentDate.year, this.#currentDate.month);
  }

  #refreshCurrentView() {
    if (this.#activeView && typeof this.#activeView.setDate === 'function') {
      this.#activeView.setDate(this.#currentDate.year, this.#currentDate.month);
    } else if (this.#activeView && typeof this.#activeView.render === 'function') {
      this.#activeView.render();
    }
  }

  #setupSidebar() {
    const toggleBtn = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    toggleBtn?.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
    });
  }

  #setupAddButton() {
    const addBtn = document.getElementById('add-transaction-btn');
    addBtn?.addEventListener('click', () => {
      bus.emit('modal:open', { type: 'transaction', data: null });
    });
  }

  #setupModal() {
    const overlay = document.getElementById('modal-overlay');
    const closeBtn = document.getElementById('modal-close');
    const modalBody = document.getElementById('modal-body');
    const modalTitle = document.getElementById('modal-title');

    closeBtn?.addEventListener('click', () => bus.emit('modal:close'));
    overlay?.addEventListener('click', (e) => {
      if (e.target === overlay) bus.emit('modal:close');
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('active')) {
        bus.emit('modal:close');
      }
    });

    bus.on('modal:open', ({ type, data }) => {
      const formConfigs = {
        transaction: {
          title: data ? 'Editar Transação' : 'Nova Transação',
          render: () => renderTransactionForm(data),
          init: () => initTransactionForm(data),
        },
        editTransaction: {
          title: 'Editar Transação',
          render: () => renderTransactionForm(data),
          init: () => initTransactionForm(data),
        },
        account: {
          title: data ? 'Editar Conta' : 'Nova Conta',
          render: () => renderAccountForm(data),
          init: () => initAccountForm(data),
        },
        category: {
          title: data && data.id ? 'Editar Categoria' : 'Nova Categoria',
          render: () => renderCategoryForm(data),
          init: () => initCategoryForm(data),
        },
        budget: {
          title: data ? 'Editar Orçamento' : 'Novo Orçamento',
          render: () => renderBudgetForm(data),
          init: () => initBudgetForm(data),
        },
      };

      const config = formConfigs[type];
      if (!config) return;

      modalTitle.textContent = config.title;
      modalBody.innerHTML = config.render();
      overlay.classList.add('active');
      overlay.setAttribute('aria-hidden', 'false');
      config.init();

      const firstInput = modalBody.querySelector('input:not([type="hidden"]):not([disabled]), select');
      if (firstInput) setTimeout(() => firstInput.focus(), 100);
    });

    bus.on('modal:close', () => {
      overlay.classList.remove('active');
      overlay.setAttribute('aria-hidden', 'true');
      modalBody.innerHTML = '';
    });
  }

  #setupToasts() {
    const container = document.getElementById('toast-container');

    bus.on('toast:show', ({ message, type = 'info', duration = 3000 }) => {
      const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
      const toast = document.createElement('div');
      toast.className = `toast toast--${type}`;
      toast.innerHTML = `
        <span class="toast__icon">${icons[type]}</span>
        <span class="toast__message">${message}</span>
        <button class="toast__close" aria-label="Fechar">✕</button>
      `;

      toast.querySelector('.toast__close').addEventListener('click', () => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 200);
      });

      container.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }, duration);
    });
  }

  #setupMobileMenu() {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    menuBtn?.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  #closeMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    sidebar?.classList.remove('open');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
