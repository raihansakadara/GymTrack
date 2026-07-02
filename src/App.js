import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import Login from './ui/pages/Login'
import AuthCallback from './ui/pages/AuthCallback'
import Dashboard from './ui/pages/Dashboard'
import Workouts from './ui/pages/Workouts'
import NewWorkout from './ui/pages/NewWorkout'
import Measurements from './ui/pages/Measurements'
import Templates from './ui/pages/Templates'
import Calendar from './ui/pages/Calendar'
import Layout from './ui/components/Layout'
import ProtectedRoute from './ui/components/ProtectedRoute'
import PublicRoute from './ui/components/PublicRoute'

function App() {
    return (
        <>
            <BrowserRouter>
                <Routes>
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                    <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                        <Route index element={<Navigate to="/dashboard" replace />} />
                        <Route path="dashboard" element={<Dashboard />} />
                        <Route path="workouts" element={<Workouts />} />
                        <Route path="workouts/new" element={<NewWorkout />} />
                        <Route path="measurements" element={<Measurements />} />
                        <Route path="templates" element={<Templates />} />
                        <Route path="calendar" element={<Calendar />} />
                    </Route>
                </Routes>
            </BrowserRouter>
            <Toaster position="top-center" richColors />
        </>
    )
}

export default App
