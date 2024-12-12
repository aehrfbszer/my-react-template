import { useLocation } from "react-router";

function App() {
  const location = useLocation();

  return <h1>hello {location.pathname}</h1>;
}

export default App;
