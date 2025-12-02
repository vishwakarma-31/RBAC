'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Shield, Users, Key } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: Shield,
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
    <nav className="space-y-1">
      {navItems.map((item, index) => {
        const Icon = item.icon
        const isActive = pathname === item.href
        
        return (
          <motion.div
            key={item.href}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ x: 4 }}
          >
            <Link
              href={item.href}
              className={cn(
                'flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200',
                isActive
                  ? 'bg-primary/10 text-primary border-r-2 border-primary shadow-sm'
                  : 'text-muted-foreground hover:bg-muted/50'
              )}
            >
              <Icon className="h-5 w-5 mr-3" />
              {item.title}
            </Link>
          </motion.div>
        )
      })}
    </nav>
  )
}