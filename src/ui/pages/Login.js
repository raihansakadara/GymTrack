import { supabase } from '../../lib/supabase'
import { Dumbbell } from "lucide-react";

function Login() {
    const signInWithGoogle = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        })
    }

    return (
        <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-background text-foreground">
            <div className="flex items-center justify-center bg-gradient-to-br from-green-500 to-emerald-700">
                <img
                    src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80"
                    alt="Gym"
                    className="h-full w-full object-cover opacity-80"
                />
            </div>

            <div className="flex flex-col items-center justify-center bg-white px-12">
                <div className="w-full max-w-sm">
                    <div className="mb-10">
                        <div className="flex items-center gap-2 mb-6">
                            <Dumbbell className="h-5 w-5" strokeWidth={1.5}/>
                            <div className="font-display text-xl font-extrabold tracking-tighter">GymTrack</div>
                        </div>
                        <div className="text-xs tracking-[0.25em] uppercase text-muted-foreground mb-3">Sign in</div>
                        <h2 className="font-display text-3xl sm:text-4xl font-black leading-none tracking-tighter mb-4">
                            Track your training.
                        </h2>
                        <p className="text-base text-muted-foreground leading-relaxed">
                            A minimalist gym log to record workouts, body measurements, and watch your progress compound
                            over time.
                        </p>
                    </div>

                    <button
                        onClick={signInWithGoogle}
                        className="w-full flex items-center justify-center gap-3 border border-border px-5 py-3 hover:bg-muted transition-colors font-medium"
                    >
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Sign in with Google
                    </button>

                    <div className="mt-10 text-xs text-muted-foreground leading-relaxed">
                        By continuing, you agree to GymTrack terms and acknowledge our privacy practices. Your workout
                        data belongs to you.
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Login
