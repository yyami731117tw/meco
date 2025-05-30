/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
      "./src/**/*.{js,ts,jsx,tsx,mdx}",
      "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
      "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
      "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
  theme: {
  	extend: {
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
            // Meco 品牌色彩 - 根據Logo調整為天空藍和奶油白
            meco: {
                primary: '#9BB5D6', // 天空藍（Logo背景色）
                secondary: '#F5F2ED', // 奶油白（Logo圖案色）
                accent: '#7BA3D0', // 深一點的天空藍，用於強調
                light: '#E8F4F8', // 更淺的天空藍
                dark: '#2D3748', // 深灰色文字
                cream: '#FDF9F6', // 純奶油白
                gradient: {
                    start: '#B8CCE8', // 漸變起始色 - 淺天空藍
                    end: '#F5F2ED', // 漸變結束色 - 奶油白
                }
            },
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
            'pulse-slow': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.7 },
            },
            'float': {
                '0%, 100%': { transform: 'translateY(0)' },
                '50%': { transform: 'translateY(-10px)' },
            }
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
            'pulse-slow': 'pulse-slow 3s ease-in-out infinite',
            'float': 'float 6s ease-in-out infinite',
  		}
  	}
  },
  plugins: [],
} 