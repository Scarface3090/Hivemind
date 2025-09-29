import { useNavigationStore, ROUTES } from './stores/navigationStore'
import { HomeScreen } from './screens/HomeScreen'
import { HostSetupScreen } from './screens/HostSetupScreen'
import { GameScreen } from './screens/GameScreen'
import { DailyGameScreen } from './screens/DailyGameScreen'

function App() {
  const currentRoute = useNavigationStore((state) => state.currentRoute)

  const renderScreen = () => {
    switch (currentRoute) {
      case ROUTES.HOME:
        return <HomeScreen />
      case ROUTES.HOST_SETUP:
        return <HostSetupScreen />
      case ROUTES.GAME:
        return <GameScreen />
      case ROUTES.DAILY:
        return <DailyGameScreen />
      default:
        return <HomeScreen />
    }
  }

  return (
    <div className="min-h-screen bg-[#0b141c]">
      {renderScreen()}
    </div>
  )
}

export default App