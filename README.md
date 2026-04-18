# Baengo - Office Bingo Game

A fun, interactive office bingo game built with Cloudflare Workers, React, and Tailwind CSS. Track office occurrences, complete patterns, and climb the leaderboards!

## 🎯 Features

- **Daily Random Grids**: Each player gets a unique 4x4 bingo card every day
- **Safe Authentication**: Username/password auth with bcrypt hashing
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

- Node.js 18+ and npm
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

3. **Set up environment variables**
   ```bash
   cp frontend/.env.example frontend/.env.local
   ```

### Local Development

1. **Configure Cloudflare D1 Database** (for local testing)
   - Create a D1 database in your Cloudflare account
   - Update `wrangler.toml` with your database ID
   - Run migrations: `wrangler d1 migrations apply baengo-db --local`

2. **Seed initial bingo items**
   ```bash
   npm run seed-db
   ```

3. **Start development servers**
   ```bash
   npm run dev
   ```

   This will start:
   - Backend (Wrangler): http://localhost:8787
   - Frontend (Vite): http://localhost:5173

4. **Open in browser**
   Navigate to http://localhost:5173

### Project Structure

```
baengo/
├── backend/                 # Cloudflare Workers backend
│   ├── src/
│   │   ├── index.ts        # Main Hono app
│   │   ├── middleware/     # Auth middleware
│   │   └── routes/         # API routes (auth, grid, leaderboard)
│   ├── package.json
│   └── tsconfig.json
├── frontend/               # React frontend
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable components
│   │   ├── api/           # API client
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── vite.config.ts
│   └── tailwind.config.js
├── config/                # Configuration files
│   └── bingo_items.yaml   # Bingo card content
├── migrations/            # D1 database migrations
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
    category: sayings
  - content: "Your action here"
    category: actions
```

Then seed the database:
```bash
npm run seed-db
```

## 🚀 Deployment

### Prerequisites

- Cloudflare account
- GitHub account
- Domain configured on Cloudflare

### Deploy to Production

1. **Set up Cloudflare**
   - Create D1 database: `baengo-db`
   - Configure DNS for `baengo.melios.be`
   - Generate API token for CI/CD

2. **Add GitHub Secrets**
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_D1_DATABASE_ID`

3. **Push to main branch**
   ```bash
   git push origin main
   ```

   GitHub Actions will automatically:
   - Run tests
   - Build the frontend
   - Deploy to Cloudflare Workers & Pages

4. **Verify deployment**
   Visit https://baengo.melios.be

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout

### Grid
- `GET /api/grid/today` - Get today's grid
- `PATCH /api/grid/mark` - Mark/unmark item

### Leaderboard
- `GET /api/leaderboard/lifetime` - Points ranking
- `GET /api/leaderboard/bingos` - Bingo count ranking
- `GET /api/leaderboard/user/:userId` - User stats

## 🔒 Security

- Passwords are hashed with bcrypt
- JWT tokens expire after 30 days
- CORS enabled for safe cross-origin requests
- All API routes except auth require valid token

## 🎨 Design

The UI follows AE internal application design patterns:
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
