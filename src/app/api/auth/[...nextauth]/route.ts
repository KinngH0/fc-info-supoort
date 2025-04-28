import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        apiKey: { label: 'API Key', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.apiKey) {
          return null;
        }
        return {
          id: '1',
          name: 'User',
          apiKey: credentials.apiKey,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.apiKey = user.apiKey;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.apiKey = token.apiKey;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
});

export { handler as GET, handler as POST }; 