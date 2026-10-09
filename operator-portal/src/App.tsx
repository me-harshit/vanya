import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Shell } from "./components/Shell";
import { BusForm } from "./pages/BusForm";
import { Buses } from "./pages/Buses";
import { Dashboard } from "./pages/Dashboard";
import { Bookings } from "./pages/Bookings";
import { Earnings } from "./pages/Earnings";
import { Listing } from "./pages/Listing";
import { Login } from "./pages/Login";
import { Profile } from "./pages/Profile";
import { Pending, Register } from "./pages/Register";
import { RouteForm } from "./pages/RouteForm";
import { Routes as RoutesPage } from "./pages/Routes";
import { ScheduleForm } from "./pages/ScheduleForm";
import { TripDetail } from "./pages/TripDetail";
import { Trips } from "./pages/Trips";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/pending" element={<Pending />} />
        <Route element={<Shell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/buses" element={<Buses />} />
          <Route path="/buses/new" element={<BusForm />} />
          <Route path="/buses/:id" element={<BusForm />} />
          <Route path="/routes" element={<RoutesPage />} />
          <Route path="/routes/new" element={<RouteForm />} />
          <Route path="/routes/:id" element={<RouteForm />} />
          <Route path="/trips" element={<Trips />} />
          <Route path="/trips/new" element={<ScheduleForm />} />
          <Route path="/trips/:id" element={<TripDetail />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/earnings" element={<Earnings />} />
          <Route path="/listing" element={<Listing />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
