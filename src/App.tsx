import { createBrowserRouter, RouterProvider } from "react-router";
import { StartPage } from "@/pages/start/StartPage";
import { NotFoundPage } from "@/pages/not-found/NotFoundPage";
import { AppShell } from "@/components/layout/AppShell";

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <StartPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
