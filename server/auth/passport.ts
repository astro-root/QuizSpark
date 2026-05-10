import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { prisma } from '../lib/prisma'

passport.use(new GoogleStrategy({
  clientID:     process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL:  process.env.GOOGLE_CALLBACK_URL ?? '/auth/google/callback',
}, async (_accessToken, _refreshToken, profile, done) => {
  try {
    const user = await prisma.user.upsert({
      where:  { googleId: profile.id },
      update: { name: profile.displayName, avatarUrl: profile.photos?.[0]?.value },
      create: {
        googleId:  profile.id,
        name:      profile.displayName,
        email:     profile.emails?.[0]?.value,
        avatarUrl: profile.photos?.[0]?.value,
      },
    })
    done(null, user)
  } catch (e) { done(e as Error) }
}))

passport.serializeUser((user: any, done) => done(null, user.id))
passport.deserializeUser(async (id: string, done) => {
  try { done(null, await prisma.user.findUnique({ where: { id } })) }
  catch (e) { done(e) }
})

export default passport
