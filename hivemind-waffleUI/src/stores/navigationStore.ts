import { create } from 'zustand'

// Route definitions
export const ROUTES = {
  HOME: '/',
  HOST_SETUP: '/host',
  GAME: '/game', 
  DAILY: '/daily'
} as const

export type Route = typeof ROUTES[keyof typeof ROUTES]

interface NavigationState {
  currentRoute: Route
  history: Route[]
  
  // Actions
  navigate: (route: Route) => void
  goBack: () => void
  replace: (route: Route) => void
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
  currentRoute: ROUTES.HOME,
  history: [ROUTES.HOME],
  
  navigate: (route: Route) => {
    const { history } = get()
    set({
      currentRoute: route,
      history: [...history, route]
    })
  },
  
  goBack: () => {
    const { history } = get()
    if (history.length > 1) {
      const newHistory = history.slice(0, -1)
      const previousRoute = newHistory[newHistory.length - 1]
      set({
        currentRoute: previousRoute,
        history: newHistory
      })
    }
  },
  
  replace: (route: Route) => {
    const { history } = get()
    const newHistory = history.slice(0, -1)
    set({
      currentRoute: route,
      history: [...newHistory, route]
    })
  }
}))