# Baengo - Office Bingo Game

A fun, interactive office bingo game built with Cloudflare Workers, React, and Tailwind CSS. Track office occurrences, complete patterns, and climb the leaderboards!

## 🎯 Features

- **Daily Random Grids**: Each player gets a unique 4x4 bingo card every day
- **Secure Authentication**: Username/password auth with bcrypt hashing, short-lived JWTs, and rotating refresh tokens
- **Real-time Scoring**:
  - 10 points per completed row or column
  - 100 points + "Baengo!" celebration for full card
- **Leaderboards**:
  - Lifetime points ranking
  - Bingo count ranking
- **Persistent Data**: All scores tracked indefinitely
- **Mobile Responsive**: Works on desktop, tablet, and mobile
- **Auto-reset**: Grids reset daily at midnight Brussels time (CET/CEST)

## 🚀 Getting Started

### Prerequisites

- Node.js 20+ and npm
- Cloudflare account with Workers and D1 access
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/baengo.git
   cd baengo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

### Local Development

1. **Configure Cloudflare D1 Database**
   - Create a D1 database in your Cloudflare account: `npx wrangler d1 create baengo-db`
   - Update `wrangler.toml` with your database ID
   - Run migrations: `npx wrangler d1 migrations apply baengo-db --local`

2. **Set the JWT secret**
   ```bash
   npx wrangler secret put JWT_SECRET
   ```

3. **Seed initial bingo items**
   ```bash
   npm run seed-db
   ```

4. **Start development servers**
   ```bash
   npm run dev
   ```

   This starts:
   - Backend (Wrangler): http://localhost:8787
   - Frontend (Vite): http://localhost:5173

5. **Open in browser**
   Navigate to http://localhost:5173

### Project Structure

```
baengo/
├── backend/                 # Cloudflare Workers backend (Hono)
│   ├── src/
│   │   ├── index.ts        # Main Hono app entry point
│   │   ├── middleware/     # Auth, rate limiting, security headers
│   │   ├── routes/         # API routes (auth, grid, leaderboard)
│   │   ├── schemas/        # Zod validation schemas
│   │   └── utils/          # Error mappers and helpers
│   ├── package.json
│   └── tsconfig.json
├── frontend/               # React 18 frontend (Vite + Tailwind)
│   ├── src/
│   │   ├── pages/         # LoginPage, DashboardPage
│   │   ├── components/    # BingoGrid, Header, Leaderboard, ScoreBoard
│   │   ├── api/           # Axios API client
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── vite.config.ts
│   └── tailwind.config.js
├── config/                # Configuration files
│   └── bingo_items.yaml   # Bingo card content
├── migrations/            # D1 database migrations (4 migrations)
├── scripts/               # Utility scripts
│   └── seed-db.js        # Database seeding script
└── wrangler.toml         # Cloudflare Workers config
```

## 📝 How to Play

1. **Register** with a username and password
2. **Login** to access your bingo card
3. **Click items** as they happen or are said in the office
4. **Get points**:
   - ✓ Row or column = 10 points
   - ✓ Full card (Baengo!) = 100 points
5. **Check leaderboards** to see your rank
6. **Grid resets** daily at midnight Brussels time

## 🛠️ Configuration

### Add or Edit Bingo Items

Edit `config/bingo_items.yaml`:

```yaml
items:
  - content: "Your office phrase here"
  - content: "Your action here"
```

Then seed the database:
```bash
npm run seed-db
```

## 🚀 Deployment

### Prerequisites

- Cloudflare account with Workers and Pages enabled
- GitHub account
- Domain configured on Cloudflare (production route: `baengo.melios.be/api/*`)

### Deploy to Production

1. **Set up Cloudflare**
   - Create D1 database: `npx wrangler d1 create baengo-db`
   - Run initial migrations against production once: `npx wrangler d1 migrations apply baengo-db --env production --remote`
   - Create a Cloudflare Pages project named `baengo`

2. **Add GitHub Secrets**
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_D1_DATABASE_ID`
   - `JWT_SECRET`

3. **Push to main branch**
   ```bash
   git push origin main
   ```

   GitHub Actions will automatically:
   - Type-check backend and frontend
   - Build frontend (Vite) and backend (Wrangler)
   - Apply any pending D1 migrations to the production database before the Worker deploy
   - Deploy the Worker to Cloudflare Workers
   - Deploy the frontend to Cloudflare Pages

   The migration step is non-destructive by default: Cloudflare D1 applies pending migrations in order and captures a backup before running them. Existing data is preserved unless a migration explicitly alters or removes it.

4. **Verify deployment**
   Visit https://baengo.melios.be

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Create account (rate limited: 5 req/10 min)
- `POST /api/auth/login` - Login (rate limited: 10 req/15 min)
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout and invalidate refresh token

### Grid
- `GET /api/grid/today` - Get today's grid
- `PATCH /api/grid/mark` - Mark/unmark item

### Leaderboard
- `GET /api/leaderboard/lifetime` - Points ranking
- `GET /api/leaderboard/baengos` - Bingo count ranking
- `GET /api/leaderboard/user/:userId` - User stats

## 🔒 Security

- Passwords hashed with bcrypt (cost factor 10)
- JWT access tokens expire after **15 minutes**; refresh tokens expire after **7 days**
- Rate limiting on auth endpoints (in-memory, per-IP)
- Account lockout after repeated failed login attempts
- Security headers on all responses (HSTS, CSP, X-Frame-Options, etc.)
- All API routes except auth require a valid Bearer token

## 🎨 Design

- Clean, minimal aesthetic
- Gradient headers (purple/blue)
- Rounded buttons and cards
- Responsive layout
- Tailwind CSS for styling

## 📈 Future Enhancements

- [ ] Weekly/monthly seasonal leaderboards
- [ ] Admin UI for managing bingo items
- [ ] Custom rules (rows/cols/diagonals)
- [ ] Offline mode with service workers
- [ ] Social sharing of achievements
- [ ] Custom themes/branding per office

## 🐛 Troubleshooting

### API connection issues
- Check if backend is running: `npm run dev` in root
- Verify proxy settings in `frontend/vite.config.ts`

### Database issues
- Run migrations: `wrangler d1 migrations apply baengo-db`
- Check D1 binding in `wrangler.toml`

### Authentication errors
- Clear localStorage: DevTools → Application → Clear
- Re-login

## 📝 License

Proprietary - AE Internal Use Only

## 🙋 Support

For issues or questions, contact the development team or open an issue on GitHub.

---

**Built with ❤️ for the AE office**
