import { useApp } from "./context/AppContext";
import LoginPage from "./components/LoginPage";
import Dashboard from "./components/Dashboard";

export default function App() {
  const { user } = useApp();
  return user ? <Dashboard /> : <LoginPage />;
}
