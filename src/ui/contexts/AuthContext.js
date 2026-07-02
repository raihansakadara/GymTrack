import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

const AuthContext = createContext(null)

function mapUser(supabaseUser) {
    return {
        sub: supabaseUser.id,
        email: supabaseUser.email,
        name: supabaseUser.user_metadata?.full_name
            || supabaseUser.user_metadata?.name
            || supabaseUser.email,
        picture: supabaseUser.user_metadata?.avatar_url
            || supabaseUser.user_metadata?.picture,
    }
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) setUser(mapUser(session.user))
            setLoading(false)
        })

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ? mapUser(session.user) : null)
        })

        return () => subscription.unsubscribe()
    }, [])

    const logout = useCallback(async () => {
        await supabase.auth.signOut()
        setUser(null)
    }, [])

    return (
        <AuthContext.Provider value={{ user, loading, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) throw new Error('useAuth must be used within AuthProvider')
    return context
}
