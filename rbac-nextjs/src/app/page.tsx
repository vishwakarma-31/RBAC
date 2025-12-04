'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ShieldCheck, Users, LayoutDashboard, ArrowRight, Lock, LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'

export default function HomePage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/10">
      {/* Navbar */}
      <header className="fixed top-0 w-full bg-background/80 backdrop-blur-md z-50 border-b">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <div className="h-8 w-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center">
              <Lock className="h-4 w-4" />
            </div>
            <span>RBAC Config</span>
          </div>
          <div className="flex gap-4">
            <Button variant="ghost" onClick={() => router.push('/login')}>Sign In</Button>
            <Button onClick={() => router.push('/register')}>Get Started</Button>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-24">
        {/* Hero Section */}
        <section className="relative px-6 py-20 md:py-32 flex flex-col items-center text-center max-w-5xl mx-auto space-y-8">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,theme(colors.primary.DEFAULT/0.15),transparent_70%)]" />
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium bg-secondary text-secondary-foreground">
              <span className="flex h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
              Enterprise Ready v2.0
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground text-balance">
              Access Control, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">
                Reimagined.
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Secure your application with our modern Role-Based Access Control system. 
              Manage permissions with granular precision in a beautiful interface.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
              <Button size="lg" className="h-12 px-8 text-lg rounded-full" onClick={() => router.push('/register')}>
                Start for Free <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-lg rounded-full" onClick={() => window.open('https://github.com/vishwakarma-31/rbac', '_blank')}>
                Documentation
              </Button>
            </div>
          </motion.div>
        </section>

        {/* Features Grid */}
        <section className="px-6 py-24 bg-secondary/50">
          <div className="container mx-auto max-w-6xl">
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard 
                icon={ShieldCheck} 
                title="Secure by Design" 
                desc="Built with Row Level Security (RLS) to ensure data isolation and integrity at the database level." 
              />
              <FeatureCard 
                icon={Users} 
                title="Role Management" 
                desc="Create custom roles and assign permissions dynamically without redeploying your application." 
              />
              <FeatureCard 
                icon={LayoutDashboard} 
                title="Instant Insights" 
                desc="Visualize your security posture with real-time analytics and permission mapping." 
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, desc }: { icon: LucideIcon, title: string, desc: string }) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="p-8 bg-card rounded-2xl border shadow-sm hover:shadow-lg transition-all duration-300"
    >
      <div className="h-14 w-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6 text-primary">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{desc}</p>
    </motion.div>
  )
}