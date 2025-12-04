'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Users, Key, LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Permissions',
    href: '/dashboard/permissions',
    icon: Key,
  },
  {
    title: 'Roles',
    href: '/dashboard/roles',
    icon: Users,
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <nav className="space-y-2 py-4">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 relative overflow-hidden',
              isActive
                ? 'text-primary-foreground'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            )}
          >
            {isActive && (
              <motion.div
                layoutId="activeNav"
                className="absolute inset-0 bg-primary z-0"
                initial={false}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center">
              <Icon className={cn("h-5 w-5 mr-3 transition-colors", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
              {item.title}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}