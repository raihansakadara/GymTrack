import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function AuthCallback() {
    const navigate = useNavigate()

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            navigate(session ? '/dashboard' : '/login', { replace: true })
        })
    }, [navigate])

    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <div className="text-sm text-muted-foreground">Signing in…</div>
        </div>
    )
}
