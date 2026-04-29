import { useContext } from "react";
import { Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext.jsx";

export default function ProtectedRoute() {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const { role } = useParams();

  // 🚫 Not logged in
  if (!user || !user.token) {
    return (
      <Navigate
        to="/"
        replace
        state={{ from: location }}
      />
    );
  }

  // 🚫 Wrong role
  if (role && user.role.toLowerCase() !== role.toLowerCase()) {
    return <Navigate to="/" replace />;
  }

  // ✅ Allow access
  return <Outlet />;
}