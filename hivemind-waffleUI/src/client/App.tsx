
import { useNavigationStore, ROUTES } from '../stores/navigationStore'
import { HomeScreen } from '../screens/HomeScreen'
import { HostSetupScreen } from '../screens/HostSetupScreen'
import { GameScreen } from '../screens/GameScreen'
import { DailyGameScreen } from '../screens/DailyGameScreen'

export default function App() {
  const route = useNavigationStore((s) => s.currentRoute)

  switch (route) {
    case ROUTES.HOST_SETUP:
      return <HostSetupScreen />
    case ROUTES.GAME:
      return <GameScreen />
    case ROUTES.DAILY:
      return <DailyGameScreen />
    case ROUTES.HOME:
    default:
      return <HomeScreen />
  }
}
