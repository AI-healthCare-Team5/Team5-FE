import { createBrowserRouter, RouterProvider } from "react-router";
import { StartPage } from "@/pages/start/StartPage";
import { NotFoundPage } from "@/pages/not-found/NotFoundPage";
import { AppShell } from "@/components/layout/AppShell";
import { MicGuidePage } from "@/pages/mic-guide/MicGuidePage";
import { InterviewPage } from "@/pages/interview/InterviewPage";
import { TextInputPage } from "@/pages/text-input/TextInputPage";
import { LocationPage } from "@/pages/location/LocationPage";
import { HospitalEmptyPage } from "@/pages/hospital-empty/HospitalEmptyPage";
import { HospitalErrorPage } from "@/pages/hospital-error/HospitalErrorPage";
import { SummaryLoadingPage } from "@/pages/summary-loading/SummaryLoadingPage";
import { EmergencyPage } from "@/pages/emergency/EmergencyPage";
import { GuardianConsentPage } from "@/pages/guardian-consent/GuardianConsentPage";
import { LoginPage } from "@/pages/login/LoginPage";
import { RecordConsentPage } from "@/pages/record-consent/RecordConsentPage";
import { RecordsPage } from "@/pages/records/RecordsPage";
import { RecordDetailPage } from "@/pages/records/RecordDetailPage";
import { MyInfoPage } from "@/pages/my-info/MyInfoPage";

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <StartPage /> },
      { path: "/mic-guide", element: <MicGuidePage /> },
      { path: "/mic-guide/unavailable", element: <MicGuidePage unavailable /> },
      { path: "/interview", element: <InterviewPage /> },
      { path: "/text-input", element: <TextInputPage /> },
      { path: "/location", element: <LocationPage /> },
      { path: "/hospital-empty", element: <HospitalEmptyPage /> },
      { path: "/hospital-error", element: <HospitalErrorPage /> },
      { path: "/summary-loading", element: <SummaryLoadingPage /> },
      { path: "/emergency", element: <EmergencyPage /> },
      { path: "/guardian-consent", element: <GuardianConsentPage /> },
      { path: "/login", element: <LoginPage /> },
      { path: "/login/failed", element: <LoginPage failed /> },
      { path: "/record-consent", element: <RecordConsentPage /> },
      { path: "/records", element: <RecordsPage /> },
      { path: "/records/:id", element: <RecordDetailPage /> },
      { path: "/my-info", element: <MyInfoPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
