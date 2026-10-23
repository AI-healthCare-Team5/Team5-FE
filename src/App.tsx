import { createBrowserRouter, RouterProvider } from "react-router";
import { StartPage } from "@/pages/start/StartPage";
import { NotFoundPage } from "@/pages/not-found/NotFoundPage";
import { AppShell } from "@/components/layout/AppShell";
import { MicGuidePage } from "@/pages/mic-guide/MicGuidePage";
import { InterviewPage } from "@/pages/interview/InterviewPage";
import { LocationPage } from "@/pages/location/LocationPage";
import { HospitalEmptyPage } from "@/pages/hospital-empty/HospitalEmptyPage";
import { HospitalErrorPage } from "@/pages/hospital-error/HospitalErrorPage";
import { SummaryLoadingPage } from "@/pages/summary-loading/SummaryLoadingPage";
import { EmergencyPage } from "@/pages/emergency/EmergencyPage";
import { GuardianConsentPage } from "@/pages/guardian-consent/GuardianConsentPage";

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <StartPage /> },
      { path: "/mic-guide", element: <MicGuidePage /> },
      { path: "/mic-guide/unavailable", element: <MicGuidePage unavailable /> },
      { path: "/interview", element: <InterviewPage /> },
      { path: "/location", element: <LocationPage /> },
      { path: "/hospital-empty", element: <HospitalEmptyPage /> },
      { path: "/hospital-error", element: <HospitalErrorPage /> },
      { path: "/summary-loading", element: <SummaryLoadingPage /> },
      { path: "/emergency", element: <EmergencyPage /> },
      { path: "/guardian-consent", element: <GuardianConsentPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
