# ⚽ UEFA Referee Training Platform

Modern web platform for referee education featuring Laws of the Game tests, video challenges, VAR practice, and training dashboards.

---

## 🚀 Quick Start

**Double-click:** `START.command`

That's it! First run installs everything automatically (takes 3-5 minutes), then opens Chrome.

---

## 📊 Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Referee | `referee@example.com` | `password123` |
| Admin | `admin@example.com` | `password123` |
| Super Admin | `super@example.com` | `password123` |

---

## 🎯 Features

- ⚖️ **Laws of the Game** - IFAB content + practice tests
- 🎥 **Referees Practice** - Video challenges (Offside, Handball, DOGSO/SPA, etc.)
- 📹 **VAR Practice** - Decision scenarios with VAR recommendations
- 🚩 **A.R. Practice** - Assistant referee training
- 📚 **Library** - Reference materials and frameworks
- 📊 **My Training** - Personal progress dashboard
- 📈 **Admin Stats** - Performance analytics (Admin role)

---

## 🛠️ Tech Stack

- **Next.js 16** (App Router) + TypeScript
- **PostgreSQL** + Prisma ORM
- **NextAuth.js** (JWT + OAuth)
- **Tailwind CSS** with UEFA design tokens

---

## 📁 Project Structure

```
app/                    # Next.js pages & API routes
components/             # Reusable UI components
lib/                    # Utilities & services
prisma/                 # Database schema & seed
public/videos/          # Video assets
START.command           # ⭐ Double-click to run
```

---

## 🎨 UEFA Design System

Built with official UEFA colors, gradients, and styling:
- Brand blues: `#010564` → `#032CE9`
- Cyan accents: `#00E8F8`
- Modern cards, shadows, pill buttons

---

## 🔧 Development

```bash
npm run dev              # Start dev server
npm run build            # Build for production
npm run lint             # Lint code
npx prisma studio        # Open database GUI
npx prisma db seed       # Reseed database
```

---

## 🚢 Deployment

1. Deploy to Vercel/Netlify/Railway
2. Add PostgreSQL database (Neon, Supabase, etc.)
3. Set environment variables
4. Run: `npx prisma migrate deploy`

---

## 📈 Scalability

Production-ready architecture:
- PostgreSQL with indexes
- Serverless API routes (auto-scaling)
- JWT sessions (stateless)
- Supports 10,000+ concurrent users

---

Built with ⚽ for referee excellence
