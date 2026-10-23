import { createBrowserRouter, RouterProvider } from "react-router";
import { StartPage } from "@/pages/start/StartPage";
import { NotFoundPage } from "@/pages/not-found/NotFoundPage";
import { AppShell } from "@/components/layout/AppShell";
import { MicGuidePage } from "@/pages/mic-guide/MicGuidePage";

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <StartPage /> },
      { path: "/mic-guide", element: <MicGuidePage /> },
      { path: "/mic-guide/unavailable", element: <MicGuidePage unavailable /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
