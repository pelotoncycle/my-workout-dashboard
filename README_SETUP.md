# Peloton Dashboard - Setup Complete! 🎉

## Your Dashboard is Running!

Open your browser and go to: **http://localhost:5173/**

## Getting Started

1. **Login**: Paste your Peloton API bearer token
   - Your token: `eyJhbGci...` (the one you provided)
   - It will be stored in your browser's localStorage

2. **View Data**: Once authenticated, you'll see your workout data
   - Total workouts, calories, distance
   - Recent workout history
   - Workout types distribution

3. **Search Members**: Click "Search Members" in the top navigation
   - Search for any Peloton user by username
   - Note: This requires your token to have search permissions

## Important Notes

### Token Permissions
Your current token appears to be a personal account token. It may:
- ✅ Work for viewing your own data
- ❌ Not work for searching/viewing other users

If you need to view other members' data, you'll need an **internal employee token** with elevated permissions.

### API Endpoints Available
- User profile: `/api/user/{userId}`
- Workout history: `/api/user/{userId}/workouts`
- Workout details: `/api/workout/{workoutId}`
- User search: `/api/user/search` (requires permissions)

## Development

### Start the server
```bash
npm run dev
```

### Build for production
```bash
npm run build
```

### Preview production build
```bash
npm run preview
```

## Project Structure

```
peloton-dashboard/
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx    # Main dashboard with your UI
│   │   └── Login.jsx        # Token authentication
│   ├── services/
│   │   └── pelotonAPI.js    # Peloton API integration
│   ├── App.jsx              # Main app with auth logic
│   └── index.css            # Tailwind + animations
└── package.json
```

## Next Steps

1. **Test your token**: Login and see if data loads
2. **If search doesn't work**: You'll need a token with broader permissions
3. **Customize the UI**: The original beautiful dashboard design is ready to integrate
4. **Add more features**:
   - Heart rate zone analysis
   - Personal records tracking
   - Workout details modal
   - More comprehensive metrics

## Troubleshooting

**Token expired?**
- Tokens typically expire after a few days
- Generate a new token and paste it in the login screen

**Can't see other users?**
- Your token may only have access to your own data
- Contact Peloton IT for an internal employee token with broader permissions

**API errors?**
- Check the browser console (F12) for error messages
- Verify your token hasn't expired
- Ensure you're connected to the internet

## Security Note

This tool stores your bearer token in browser localStorage. Only use this on:
- Your personal/work computer
- A secure network
- Never share your token publicly
